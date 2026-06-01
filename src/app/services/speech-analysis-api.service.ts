import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { AnalyzeSpeechForFeedbackOutput } from '../models/speech-analysis.model';
import { environment } from '../../environments/environment';

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  text: string;
  duration?: number;
  words?: WhisperWord[];
  acoustic_features?: {
    loud_mean: number;
    loud_std: number;
    pitch_std: number;
    spectral_centroid: number;
    spectral_flux: number;
  };
}

interface PauseDetail {
  timestamp: number;
  duration: number;
  type: 'short' | 'medium' | 'long';
  before: string;
  after: string;
}

interface PauseStats {
  pauses: PauseDetail[];
  total_count: number;
  average_duration: number;
  longest_duration: number;
  short_count: number;
  medium_count: number;
  long_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechAnalysisApiService {

  private readonly WHISPER_MODEL = 'whisper-large-v3-turbo';
  private readonly API_BASE = environment.apiUrl;
  private readonly REQUEST_TIMEOUT_MS = 30000;

  analyzeSpeech(audioBlob: Blob, category: string): Observable<AnalyzeSpeechForFeedbackOutput> {
    return from(this.analyzeWithGroq(audioBlob, category));
  }

  private createTimeoutController(timeoutMs = this.REQUEST_TIMEOUT_MS): AbortController {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    controller.signal.addEventListener('abort', () => window.clearTimeout(timeoutId));
    return controller;
  }

  private async fetchWithTimeout(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    const controller = this.createTimeoutController();
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 504) {
        throw new Error('Server timeout (504): Remote analysis service is unavailable. Please try again later.');
      }
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }
    return response;
  }

  private async analyzeWithGroq(
    audioBlob: Blob,
    category: string
  ): Promise<AnalyzeSpeechForFeedbackOutput> {
    const transcription = await this.transcribeAudio(audioBlob);
    const pauseStats    = this.detectPauses(transcription);
    const fillerData    = this.extractFillers(transcription);
    const { feedback, rag_metadata } = await this.analyzeTranscript(
      transcription, category, pauseStats, fillerData.count
    );
    return this.mapToFeedbackOutput(feedback, transcription, category, pauseStats, rag_metadata);
  }

  // ── Step 1: Whisper transcription ─────────────────────────────────────────

  private async transcribeAudio(audioBlob: Blob): Promise<WhisperResponse> {
    const ext = (audioBlob.type.split('/')[1] || 'wav').replace('x-', '');
    const formData = new FormData();
    formData.append('file', audioBlob, `speech.${ext}`);
    formData.append('model', this.WHISPER_MODEL);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('prompt', 'Um, uh, like, you know, basically, so, right, okay, hmm, mm.');

    const response = await this.fetchWithTimeout(`${this.API_BASE}/api/transcribe`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  }

  // ── Step 2: RAG analysis ──────────────────────────────────────────────────

  private async analyzeTranscript(
    transcription: WhisperResponse,
    category: string,
    pauseStats: PauseStats,
    fillerCount: number
  ): Promise<{ feedback: any; rag_metadata: any }> {
    const wordCount = transcription.text.trim().split(/\s+/).length;
    const duration  = transcription.duration ?? 0;
    const wpm       = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

    // Use real acoustic features returned by the backend from the audio file.
    // Falls back to approximated values if the backend didn't return them.
    const af = transcription.acoustic_features;
    const totalPauseTime = pauseStats.pauses.reduce((s, p) => s + p.duration, 0);

    const userMetrics = {
      syllables_per_sec:  duration > 0 ? parseFloat(((wordCount * 1.5) / duration).toFixed(3)) : 0,
      pause_ratio:        duration > 0 ? parseFloat((totalPauseTime / duration).toFixed(3)) : 0,
      loud_mean:          af?.loud_mean          ?? 0,
      loud_std:           af?.loud_std           ?? 0,
      pitch_std:          af?.pitch_std          ?? 0,
      spectral_centroid:  af?.spectral_centroid  ?? 0,
      spectral_flux:      af?.spectral_flux      ?? 0,
    };

    const response = await this.fetchWithTimeout(`${this.API_BASE}/api/analyze-rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript:   transcription.text,
        category,
        wpm,
        pause_stats:  pauseStats,
        filler_count: fillerCount,
        user_metrics: userMetrics,
      })
    });

    const data = await response.json();
    // Return both the LLM feedback AND the retrieval metadata
    return { feedback: data.feedback, rag_metadata: data.rag_metadata };
  }

  // ── Category weights (must sum to 1.0 per category) ──────────────────────
  private readonly WEIGHTS: Record<string, Record<string, number>> = {
    informative: {
      speech_pace: 0.16, pausing_fluency: 0.13, loudness_control: 0.14,
      pitch_variation: 0.12, articulation_clarity: 0.17,
      filler_words: 0.18, expressive_emphasis: 0.10
    },
    persuasive: {
      speech_pace: 0.15, pausing_fluency: 0.12, loudness_control: 0.12,
      pitch_variation: 0.17, articulation_clarity: 0.17,
      filler_words: 0.08, expressive_emphasis: 0.19
    },
    motivational: {
      speech_pace: 0.13, pausing_fluency: 0.12, loudness_control: 0.14,
      pitch_variation: 0.18, articulation_clarity: 0.15,
      filler_words: 0.06, expressive_emphasis: 0.22
    }
  };

  private computeWeightedOverall(scores: Record<string, number>, category: string): number {
    const key = category.toLowerCase();
    const weights = this.WEIGHTS[key] ?? this.WEIGHTS['informative'];
    const dims = ['speech_pace', 'pausing_fluency', 'loudness_control', 'pitch_variation', 'articulation_clarity', 'filler_words', 'expressive_emphasis'];
    const total = dims.reduce((sum, d) => sum + (scores[d] ?? 3) * (weights[d] ?? 0), 0);
    return parseFloat(total.toFixed(1));
  }

  // ── Mapping ────────────────────────────────────────────────────────────────

  private mapToFeedbackOutput(
    r: any,
    transcription: WhisperResponse,
    category: string,
    pauseStats: PauseStats,
    rag_metadata?: any
  ): AnalyzeSpeechForFeedbackOutput {
    const ds = r.feedback?.detailed_scores ?? {};
    const fillerData = this.extractFillers(transcription);

    const pace_feedback     = r.pace_feedback     || ds.speech_pace?.description          || '';
    const volume_feedback   = r.volume_feedback   || ds.loudness_control?.description     || '';
    const pitch_feedback    = r.pitch_feedback    || ds.pitch_variation?.description      || '';
    const clarity_feedback  = r.clarity_feedback  || ds.articulation_clarity?.description || '';
    const pausing_feedback  = r.pausing_feedback  || ds.pausing_fluency?.description      || '';
    const filler_feedback   = r.filler_feedback   || ds.filler_words?.description         || '';
    const tone_feedback     = r.tone_feedback     || ds.expressive_emphasis?.description  || '';

    const strengths    = Array.isArray(r.strengths)    ? r.strengths.filter(Boolean)    : [];
    const improvements = Array.isArray(r.improvements) ? r.improvements.filter(Boolean) : [];

    return {
      transcript: transcription.text,
      category,
      duration: transcription.duration ?? 0,
      wordCount: transcription.text.trim().split(/\s+/).length,
      averagePace: transcription.duration
        ? Math.round((transcription.text.trim().split(/\s+/).length / transcription.duration) * 60)
        : 0,

      speech_pace:          r.speech_pace          ?? 3,
      pausing_fluency:      r.pausing_fluency      ?? 3,
      loudness_control:     r.loudness_control     ?? 3,
      loud_control:         r.loudness_control     ?? 3,
      pitch_variation:      r.pitch_variation      ?? 3,
      articulation_clarity: r.articulation_clarity ?? 3,
      expressive_emphasis:  r.expressive_emphasis  ?? 3,
      expressive_emph:      r.expressive_emphasis  ?? 3,
      filler_words:         r.filler_words         ?? 3,
      filler_words_score:   r.filler_words         ?? 3,
      overall: this.computeWeightedOverall({
        speech_pace:          r.speech_pace          ?? 3,
        pausing_fluency:      r.pausing_fluency      ?? 3,
        loudness_control:     r.loudness_control     ?? 3,
        pitch_variation:      r.pitch_variation      ?? 3,
        articulation_clarity: r.articulation_clarity ?? 3,
        filler_words:         r.filler_words         ?? 3,
        expressive_emphasis:  r.expressive_emphasis  ?? 3,
      }, category),

      transcript_words:    transcription.words ?? [],
      filler_word_details: fillerData,
      pause_details:       pauseStats,
      pause_analysis: {
        count:            pauseStats.total_count,
        average_duration: pauseStats.average_duration,
        longest_pause:    pauseStats.longest_duration,
        total_pause_time: +(pauseStats.pauses.reduce((s, p) => s + p.duration, 0)).toFixed(2),
        pauses:           [...pauseStats.pauses]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 15)
          .map(p => ({ start: p.timestamp, end: p.timestamp + p.duration, duration: p.duration })),
        wpm_segments: []
      },

      overall_assessment: r.overall_assessment || r.feedback?.overall_assessment || '',
      strengths,
      improvements,
      closing_message: r.closing_message || '',

      pace_feedback,
      volume_feedback,
      pitch_feedback,
      tone_feedback,
      clarity_feedback,
      pausing_feedback,
      filler_feedback,

      areas_improvement: improvements.join('\n\n'),

      feedback: {
        overall_assessment: r.overall_assessment || r.feedback?.overall_assessment || '',
        detailed_scores: r.feedback?.detailed_scores ?? {}
      },
      recommendations: r.recommendations ?? [],
      analysis: r,

      // RAG retrieval metadata — corpus references that informed this feedback
      rag_metadata: rag_metadata ?? null,
    };
  }

  // ── Pause detection from Whisper word timestamps ───────────────────────────

  private detectPauses(transcription: WhisperResponse): PauseStats {
    const words = transcription.words ?? [];
    const pauses: PauseDetail[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      const gap = words[i + 1].start - words[i].end;
      if (gap < 0.5) continue;

      const type: 'short' | 'medium' | 'long' =
        gap < 1.0 ? 'short' : gap < 2.0 ? 'medium' : 'long';

      pauses.push({
        timestamp: words[i].end,
        duration: parseFloat(gap.toFixed(2)),
        type,
        before: words[i].word,
        after: words[i + 1].word
      });
    }

    const total_count = pauses.length;
    const average_duration = total_count > 0
      ? parseFloat((pauses.reduce((s, p) => s + p.duration, 0) / total_count).toFixed(2))
      : 0;
    const longest_duration = total_count > 0
      ? parseFloat(Math.max(...pauses.map(p => p.duration)).toFixed(2))
      : 0;

    return {
      pauses,
      total_count,
      average_duration,
      longest_duration,
      short_count:  pauses.filter(p => p.type === 'short').length,
      medium_count: pauses.filter(p => p.type === 'medium').length,
      long_count:   pauses.filter(p => p.type === 'long').length
    };
  }

  private extractFillers(transcription: WhisperResponse): { count: number; word_count: number; fillers: { word: string; start: number; end: number }[] } {
    const FILLERS = new Set([
      'um', 'uh', 'umm', 'uhh',
      'mm', 'mmm', 'hmm', 'hm', 'mhm',
      'like', 'you know', 'you know what i mean',
      'basically', 'literally', 'actually',
      'so', 'right', 'okay', 'ok',
      'i mean', 'kind of', 'sort of'
    ]);
    const word_count = transcription.words?.length ?? 0;
    if (!word_count) return { count: 0, word_count: 0, fillers: [] };

    const fillers = transcription.words!
      .filter(w => FILLERS.has(w.word.toLowerCase().replace(/[^a-z ]/g, '')))
      .map(w => ({ word: w.word.toLowerCase(), start: w.start, end: w.end }));

    return { count: fillers.length, word_count, fillers };
  }

  // ── Practice Mode Analysis ─────────────────────────────────────────────────

  async analyzePracticeSession(
    audioBlob: Blob,
    scriptText: string,
    category: string,
    targetDimensions: string[]
  ): Promise<PracticeAnalysisResult> {
    const transcription = await this.transcribeAudio(audioBlob);

    const rawText   = transcription.text?.trim() ?? '';
    const wordCount = rawText.length > 0 ? rawText.split(/\s+/).filter(Boolean).length : 0;

    if (wordCount < 5 || rawText.length < 10) {
      return this.buildZeroResult(rawText, scriptText, targetDimensions, 'no_speech');
    }

    const pauseStats = this.detectPauses(transcription);
    const fillerData = this.extractFillers(transcription);
    const duration   = transcription.duration ?? 0;
    const actualWpm  = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;
    const accuracy   = this.computeWordAccuracy(rawText, scriptText);

    if (accuracy.matchPct < 20) {
      return this.buildZeroResult(rawText, scriptText, targetDimensions, 'mismatch', accuracy);
    }

    // Use real acoustic features from the backend
    const af = transcription.acoustic_features;
    const totalPauseTime = pauseStats.pauses.reduce((s, p) => s + p.duration, 0);
    const userMetrics = {
      syllables_per_sec:  duration > 0 ? parseFloat(((wordCount * 1.5) / duration).toFixed(3)) : 0,
      pause_ratio:        duration > 0 ? parseFloat((totalPauseTime / duration).toFixed(3)) : 0,
      loud_mean:          af?.loud_mean          ?? 0,
      loud_std:           af?.loud_std           ?? 0,
      pitch_std:          af?.pitch_std          ?? 0,
      spectral_centroid:  af?.spectral_centroid  ?? 0,
      spectral_flux:      af?.spectral_flux      ?? 0,
    };

    // Full RAG pipeline with the reference script so the LLM can compare
    // transcript vs intended script and calibrate against the corpus
    let ragScores: Record<string, number> = {};
    let ragMetadata: any = null;

    try {
      const response = await fetch(`${this.API_BASE}/api/analyze-rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:       transcription.text,
          category,
          wpm:              actualWpm,
          pause_stats:      pauseStats,
          filler_count:     fillerData.count,
          user_metrics:     userMetrics,
          reference_script: scriptText,
        })
      });

      if (response.ok) {
        const data = await response.json();
        const f    = data.feedback || {};
        ragMetadata = data.rag_metadata;
        ragScores = {
          speech_pace:          f.speech_pace          ?? 3,
          pausing_fluency:      f.pausing_fluency      ?? 3,
          loud_control:         f.loudness_control     ?? 3,
          pitch_variation:      f.pitch_variation      ?? 3,
          articulation_clarity: f.articulation_clarity ?? 3,
          expressive_emph:      f.expressive_emphasis  ?? 3,
          filler_words_score:   f.filler_words         ?? 3,
          filler_words:         f.filler_words         ?? 3,
        };
      }
    } catch {
      // Neutral fallback if RAG is unreachable
      const n = 3.0;
      ragScores = {
        speech_pace: n, pausing_fluency: n, loud_control: n,
        pitch_variation: n, articulation_clarity: n,
        expressive_emph: n, filler_words_score: n, filler_words: n
      };
    }

    // Override articulation_clarity with script-specific word accuracy.
    // The RAG LLM evaluates general transcript clarity; only the word-accuracy
    // computation can measure how precisely the speaker reproduced the script.
    ragScores['articulation_clarity'] = this.wordAccuracyToScore(accuracy.matchPct);

    // Overall = weighted average of the session's target dimensions
    const dimValues = targetDimensions.map(d => ragScores[d] ?? 3).filter(v => !isNaN(v));
    const overall   = dimValues.length
      ? parseFloat((dimValues.reduce((a, b) => a + b, 0) / dimValues.length).toFixed(1))
      : 3.0;

    return {
      transcript:       transcription.text,
      duration,
      actualWpm,
      wordAccuracy:     accuracy.matchPct,
      matchedWords:     accuracy.matched,
      totalScriptWords: accuracy.total,
      missedWords:      accuracy.missedWords,
      fillerCount:      fillerData.count,
      detectedFillers:  fillerData.fillers.map(f => f.word),
      dimensionScores:  ragScores,
      overall,
      pauseStats,
      ragMetadata,
    };
  }

  // Convert word-accuracy % to a 1–5 score
  private wordAccuracyToScore(matchPct: number): number {
    const score = matchPct >= 95 ? 5.0
      : matchPct >= 85 ? 4.0 + (matchPct - 85) / 10
      : matchPct >= 70 ? 3.0 + (matchPct - 70) / 15
      : matchPct >= 55 ? 2.0 + (matchPct - 55) / 15
      : 1.0 + matchPct / 55;
    return parseFloat(Math.max(1, Math.min(5, score)).toFixed(1));
  }

  // ── Zero-score result for no-speech / mismatch ───────────────────────────

  private buildZeroResult(
    transcript: string,
    scriptText: string,
    _targetDimensions: string[],
    reason: 'no_speech' | 'mismatch',
    accuracy?: { matchPct: number; matched: number; total: number; missedWords: string[] }
  ): PracticeAnalysisResult {
    const ALL_DIMS = [
      'speech_pace', 'pausing_fluency', 'loud_control', 'pitch_variation',
      'articulation_clarity', 'expressive_emph', 'filler_words_score', 'filler_words'
    ];
    const zeroDims: Record<string, number> = {};
    for (const d of ALL_DIMS) zeroDims[d] = 1.0;

    const totalScriptWords = scriptText.trim().split(/\s+/).filter(Boolean).length;
    const emptyPauseStats = {
      pauses: [], total_count: 0, average_duration: 0,
      longest_duration: 0, short_count: 0, medium_count: 0, long_count: 0
    };

    return {
      transcript,
      duration:         0,
      actualWpm:        0,
      wordAccuracy:     accuracy?.matchPct ?? 0,
      matchedWords:     accuracy?.matched  ?? 0,
      totalScriptWords,
      missedWords:      accuracy?.missedWords ?? [],
      fillerCount:      0,
      detectedFillers:  [],
      dimensionScores:  zeroDims,
      overall:          1.0,
      pauseStats:       emptyPauseStats,
      noSpeechDetected: reason === 'no_speech',
      contentMismatch:  reason === 'mismatch',
      ragMetadata:      null,
    };
  }

  private computeWordAccuracy(
    transcript: string, script: string
  ): { matchPct: number; matched: number; total: number; missedWords: string[] } {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const scriptWords  = norm(script).split(/\s+/).filter(Boolean);
    const spokenWords  = norm(transcript).split(/\s+/).filter(Boolean);
    const total = scriptWords.length;

    let si = 0;
    let matched = 0;
    const matchedIndices = new Set<number>();

    for (const spoken of spokenWords) {
      if (si >= scriptWords.length) break;
      for (let offset = 0; offset <= 4 && si + offset < scriptWords.length; offset++) {
        if (spoken === scriptWords[si + offset] || this.fuzzyEqual(spoken, scriptWords[si + offset])) {
          matchedIndices.add(si + offset);
          matched++;
          si += offset + 1;
          break;
        }
      }
    }

    const STOP = new Set(['the','a','an','and','or','of','to','in','is','it','that','with','as',
                          'for','on','are','was','be','this','but','by','at','from','they','we']);
    const seenMissed = new Set<string>();
    const missedWords: string[] = [];
    scriptWords.forEach((w, i) => {
      if (!matchedIndices.has(i) && w.length > 2 && !STOP.has(w) && !seenMissed.has(w)) {
        seenMissed.add(w);
        missedWords.push(w);
      }
    });

    return {
      matchPct: total > 0 ? parseFloat(((matched / total) * 100).toFixed(1)) : 0,
      matched,
      total,
      missedWords: missedWords.slice(0, 30)
    };
  }

  private fuzzyEqual(a: string, b: string): boolean {
    if (!a || !b) return false;
    const contractions: Record<string, string> = {
      dont:"don't", cant:"can't", wont:"won't", its:"it's", youre:"you're",
      im:"i'm", ive:"i've", weve:"we've", theyre:"they're", hes:"he's",
      shes:"she's", isnt:"isn't", arent:"aren't", wasnt:"wasn't"
    };
    return contractions[a] === b || contractions[b] === a
        || a.replace(/'/g,'') === b || b.replace(/'/g,'') === a;
  }
}

export interface PracticeAnalysisResult {
  transcript:        string;
  duration:          number;
  actualWpm:         number;
  wordAccuracy:      number;
  matchedWords:      number;
  totalScriptWords:  number;
  missedWords:       string[];
  fillerCount:       number;
  detectedFillers:   string[];
  dimensionScores:   Record<string, number>;
  overall:           number;
  pauseStats:        any;
  ragMetadata:       {
    corpus1_retrieved: any[];
    corpus2_retrieved: any[];
    weak_dimensions:   string[];
  } | null;
  noSpeechDetected?: boolean;
  contentMismatch?:  boolean;
}
