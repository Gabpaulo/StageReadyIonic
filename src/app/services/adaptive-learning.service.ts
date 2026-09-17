import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import { FirebaseService } from './firebase.service';
import { PracticeScript, DimensionKey } from '../data/practice-scripts.data';
import { PracticeScriptService } from './practice-script.service';

export interface RecommendedScript {
  script: PracticeScript;
  reason: string;
}

export interface WeeklyPlan {
  recommendedScripts: RecommendedScript[];
  wpmGoal: number;
  highImpactDimensions: DimensionKey[];
  targetDifficulty: 'beginner' | 'intermediate' | 'advanced';
  sessionCount: number;
  modelReady: boolean;
  avgScores: Record<DimensionKey, number>;
}

const DIMS: DimensionKey[] = [
  'speech_pace', 'pausing_fluency', 'loud_control',
  'pitch_variation', 'articulation_clarity',
  'expressive_emph', 'filler_words_score'
];

const DIM_LABELS: Record<DimensionKey, string> = {
  speech_pace:          'Speech Pace',
  pausing_fluency:      'Pausing & Fluency',
  loud_control:         'Volume Control',
  pitch_variation:      'Pitch Variation',
  articulation_clarity: 'Articulation & Clarity',
  expressive_emph:      'Expressive Emphasis',
  filler_words_score:   'Filler Words'
};

@Injectable({ providedIn: 'root' })
export class AdaptiveLearningService {

  constructor(
    private firebase: FirebaseService,
    private practiceScripts: PracticeScriptService
  ) {}

  humanLabel(dim: DimensionKey): string {
    return DIM_LABELS[dim] ?? dim;
  }

  async generatePlan(uid: string): Promise<WeeklyPlan | null> {
    // ── Step 1: load history ──────────────────────────────────────────────────
    const history = await this.firebase.getSpeechHistory(uid, 30);
    if (!history || history.length === 0) return null;

    const sessions = history.filter(e => e.feedback?.overall != null);
    if (sessions.length === 0) return null;

    // ── Step 2: compute per-dimension averages ────────────────────────────────
    const avgScore: Record<DimensionKey, number> = {} as any;
    for (const dim of DIMS) {
      const vals = sessions
        .map(s => (s.feedback as any)[dim] ?? (s.feedback as any)[this.feedbackKey(dim)])
        .filter((v): v is number => typeof v === 'number');
      avgScore[dim] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
    }

    const overallAvg = sessions.reduce((a, s) => a + (s.feedback?.overall ?? 3), 0) / sessions.length;

    // ── Step 3 & 4: regression (≥3 sessions) or fallback ─────────────────────
    let highImpactDimensions: DimensionKey[];
    let modelReady = sessions.length >= 3;
    let tfModelUsed = false;

    if (modelReady) {
      try {
        highImpactDimensions = await this.trainAndExtract(sessions, avgScore);
        tfModelUsed = true;
      } catch {
        highImpactDimensions = this.fallbackDimensions(avgScore);
      }
    } else {
      highImpactDimensions = this.fallbackDimensions(avgScore);
    }

    // ── Step 5: difficulty ────────────────────────────────────────────────────
    const targetDifficulty: 'beginner' | 'intermediate' | 'advanced' =
      overallAvg < 2.5 ? 'beginner' : overallAvg <= 3.5 ? 'intermediate' : 'advanced';

    // ── Step 6: WPM goal ──────────────────────────────────────────────────────
    const wpms = sessions.map(s => s.averagePace).filter((v): v is number => typeof v === 'number' && v > 0);
    const avgWpm = wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : 130;
    const paceScore = avgScore['speech_pace'];
    let wpmGoal = 130;
    if (paceScore < 2.5 && avgWpm > 155) wpmGoal = Math.round(avgWpm * 0.88);
    else if (paceScore < 2.5 && avgWpm < 115) wpmGoal = Math.round(avgWpm * 1.10);

    // ── Step 7: select scripts ────────────────────────────────────────────────
    const scripts = await this.practiceScripts.getScripts();
    const recommendedScripts = this.selectScripts(
      scripts, highImpactDimensions, targetDifficulty, tfModelUsed
    );

    return {
      recommendedScripts,
      wpmGoal,
      highImpactDimensions,
      targetDifficulty,
      sessionCount: sessions.length,
      modelReady,
      avgScores: avgScore
    };
  }

  // ── TF.js regression ────────────────────────────────────────────────────────

  private async trainAndExtract(sessions: any[], avgScore: Record<DimensionKey, number>): Promise<DimensionKey[]> {
    const n = sessions.length;

    // Build X (n×7) and y (n×1)
    const X: number[][] = [];
    const y: number[]   = [];

    for (const s of sessions) {
      const row = DIMS.map(dim =>
        (s.feedback as any)[dim] ?? (s.feedback as any)[this.feedbackKey(dim)] ?? avgScore[dim]
      );
      X.push(row);
      y.push(s.feedback.overall);
    }

    // Normalize features (z-score)
    const means = DIMS.map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / n);
    const stds  = DIMS.map((_, j) => {
      const variance = X.reduce((sum, row) => sum + Math.pow(row[j] - means[j], 2), 0) / n;
      return Math.sqrt(variance) || 1;
    });
    const Xnorm = X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));

    // Train single Dense layer = multiple linear regression
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [7], useBias: true }));
    model.compile({ optimizer: tf.train.adam(0.05), loss: 'meanSquaredError' });

    const xTensor = tf.tensor2d(Xnorm);
    const yTensor = tf.tensor2d(y, [n, 1]);

    await model.fit(xTensor, yTensor, {
      epochs: 50,
      batchSize: Math.min(n, 8),
      verbose: 0
    });

    // Extract kernel weights [7, 1] → ranked by absolute value
    const kernel = model.layers[0].getWeights()[0];
    const weights = Array.from(await kernel.data() as Float32Array);

    // Clean up tensors
    tf.dispose([xTensor, yTensor, kernel]);
    model.dispose();

    // Map weights to dimension names, sort by |weight| descending
    const ranked = DIMS
      .map((dim, i) => ({ dim, weight: Math.abs(weights[i]) }))
      .sort((a, b) => b.weight - a.weight);

    return ranked.slice(0, 2).map(r => r.dim);
  }

  // ── Fallback when < 3 sessions ───────────────────────────────────────────────

  private fallbackDimensions(avgScore: Record<DimensionKey, number>): DimensionKey[] {
    return [...DIMS]
      .sort((a, b) => avgScore[a] - avgScore[b])
      .slice(0, 2);
  }

  // ── Script selection ─────────────────────────────────────────────────────────

  private selectScripts(
    scripts: PracticeScript[],
    highImpactDims: DimensionKey[],
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    modelReady: boolean
  ): RecommendedScript[] {
    const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
    const diffIdx = difficultyOrder.indexOf(difficulty);

    // Filter scripts that overlap with high-impact dimensions
    const relevant = scripts.filter(s =>
      s.targetDimensions.some(d => highImpactDims.includes(d))
    );

    // Sort by: exact difficulty match first, then ±1
    const sorted = [...relevant].sort((a, b) => {
      const da = Math.abs(difficultyOrder.indexOf(a.difficulty) - diffIdx);
      const db = Math.abs(difficultyOrder.indexOf(b.difficulty) - diffIdx);
      return da - db;
    });

    // Pick up to 3, varying categories where possible
    const picked: PracticeScript[] = [];
    const usedCategories = new Set<string>();

    for (const script of sorted) {
      if (picked.length >= 3) break;
      if (!usedCategories.has(script.category) || picked.length === 2) {
        picked.push(script);
        usedCategories.add(script.category);
      }
    }

    // If still < 3, fill from remaining scripts
    if (picked.length < 3) {
      for (const script of scripts) {
        if (picked.length >= 3) break;
        if (!picked.includes(script)) picked.push(script);
      }
    }

    return picked.map((script, i) => ({
      script,
      reason: this.buildReason(script, highImpactDims, i, modelReady)
    }));
  }

  private buildReason(
    script: PracticeScript,
    highImpactDims: DimensionKey[],
    index: number,
    modelReady: boolean
  ): string {
    const matchedDim = script.targetDimensions.find(d => highImpactDims.includes(d));
    const source = modelReady ? 'Regression model identified' : 'Your scores indicate';

    if (index === 0 && matchedDim) {
      return `${source} ${this.humanLabel(matchedDim)} as your highest-leverage area`;
    }
    if (index === 1 && matchedDim) {
      return `Targets ${this.humanLabel(matchedDim)}, your second high-impact dimension`;
    }
    const dimLabel = matchedDim ? this.humanLabel(matchedDim) : this.humanLabel(highImpactDims[0]);
    return `Variety pick — reinforces ${dimLabel} in ${script.category} context`;
  }

  // ── Map model field names ────────────────────────────────────────────────────

  private feedbackKey(dim: DimensionKey): string {
    const map: Partial<Record<DimensionKey, string>> = {
      loud_control:   'loudness_control',
      expressive_emph: 'expressive_emphasis',
      filler_words_score: 'filler_words'
    };
    return map[dim] ?? dim;
  }
}
