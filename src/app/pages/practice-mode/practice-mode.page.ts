import { Component, OnDestroy, NgZone, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { PRACTICE_SCRIPTS, PracticeScript, DimensionKey } from '../../data/practice-scripts.data';
import { AdaptiveLearningService, WeeklyPlan, RecommendedScript } from '../../services/adaptive-learning.service';
import { FirebaseService } from '../../services/firebase.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { SpeechAnalysisApiService, PracticeAnalysisResult } from '../../services/speech-analysis-api.service';

type Step     = 'category' | 'script' | 'session' | 'analyzing' | 'results';
type Category = 'informative' | 'persuasive' | 'motivational';

const DIM_LABELS: Record<string, string> = {
  speech_pace:          'Speech Pace',
  pausing_fluency:      'Pausing & Fluency',
  loud_control:         'Volume Control',
  pitch_variation:      'Pitch Variation',
  articulation_clarity: 'Articulation & Clarity',
  expressive_emph:      'Expressive Emphasis',
  filler_words_score:   'Filler Words'
};

@Component({
  selector: 'app-practice-mode',
  templateUrl: './practice-mode.page.html',
  styleUrls: ['./practice-mode.page.scss'],
  standalone: false
})
export class PracticeModePage implements OnInit, OnDestroy {

  step: Step = 'category';
  selectedCategory: Category | null = null;
  selectedScript: PracticeScript | null = null;

  // ── Session state ──────────────────────────────────────────────────────────
  isRecording     = false;
  sessionStarted  = false;   // true once user clicks "Start Recording"
  sessionDuration = 0;

  // ── Live WPM ───────────────────────────────────────────────────────────────
  currentWpm      = 0;
  wpmAvailable    = false;   // false when SpeechRecognition not supported
  private recognition: any = null;
  private spokenWordCount   = 0;

  // ── Results ────────────────────────────────────────────────────────────────
  results: PracticeAnalysisResult | null = null;
  analysisError: string | null = null;

  // ── Adaptive Learning Plan ─────────────────────────────────────────────────
  weeklyPlan: WeeklyPlan | null = null;
  planLoading = false;

  readonly allScripts = PRACTICE_SCRIPTS;
  readonly Math       = Math;

  readonly categoryMeta: Record<Category, { icon: string; color: string; description: string }> = {
    informative:  { icon: 'information-circle-outline', color: '#22a7f0',
                    description: 'Share knowledge and educate your audience with clear, structured content' },
    persuasive:   { icon: 'megaphone-outline',          color: '#9c27b0',
                    description: 'Convince and influence your audience through compelling arguments' },
    motivational: { icon: 'flame-outline',              color: '#ff6b35',
                    description: 'Inspire and energize your audience with powerful, uplifting messages' }
  };

  // ── Private ────────────────────────────────────────────────────────────────
  private timerInterval: any = null;
  private _pendingRecommendation: RecommendedScript | null = null;

  constructor(
    private ngZone: NgZone,
    private location: Location,
    private router: Router,
    private adaptiveLearning: AdaptiveLearningService,
    private firebaseService: FirebaseService,
    private audioRecorder: AudioRecorderService,
    private analysisApi: SpeechAnalysisApiService
  ) {
    // Read navigation state before it's cleared (only available during navigation)
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? (window.history.state || {});
    if (state['recommendation']) {
      this._pendingRecommendation = state['recommendation'] as RecommendedScript;
    }
  }

  async ngOnInit() {
    // If a recommended script was passed via navigation state, jump straight to it
    if (this._pendingRecommendation) {
      this.startFromRecommendation(this._pendingRecommendation);
      this._pendingRecommendation = null;
    }

    const uid = this.firebaseService.auth.currentUser?.uid;
    if (!uid) return;
    this.planLoading = true;
    try {
      this.weeklyPlan = await this.adaptiveLearning.generatePlan(uid);
    } catch (e) {
      console.warn('Adaptive plan generation failed:', e);
    } finally {
      this.planLoading = false;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  humanLabel(dim: DimensionKey | string): string {
    return DIM_LABELS[dim] ?? dim;
  }

  get filteredScripts(): PracticeScript[] {
    return this.allScripts.filter(s => s.category === this.selectedCategory);
  }

  get formattedTime(): string {
    const m = Math.floor(this.sessionDuration / 60);
    const s = this.sessionDuration % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get categoryColor(): string {
    return this.selectedCategory ? this.categoryMeta[this.selectedCategory].color : '#22a7f0';
  }

  getScoreColor(score: number): string {
    if (score >= 4.5) return '#4caf50';
    if (score >= 3.5) return '#22a7f0';
    if (score >= 2.5) return '#ff9800';
    if (score >= 1.5) return '#f44336';
    return '#9e9e9e';
  }

  getGradeLetter(score: number): string {
    if (score >= 4.5) return 'A';
    if (score >= 3.5) return 'B';
    if (score >= 2.5) return 'C';
    if (score >= 1.5) return 'D';
    return 'F';
  }

  getScoreBarColor(score: number): string {
    if (score >= 4.0) return 'success';
    if (score >= 3.0) return 'primary';
    if (score >= 2.0) return 'warning';
    return 'danger';
  }

  /** Returns color for live WPM chip relative to script's target range */
  get liveWpmStatus(): 'good' | 'fast' | 'slow' | 'idle' {
    if (!this.wpmAvailable || this.currentWpm === 0 || this.sessionDuration < 8) return 'idle';
    const range = this.selectedScript?.targetWpmRange;
    if (!range) return 'idle';
    if (this.currentWpm < range.min - 10) return 'slow';
    if (this.currentWpm > range.max + 10) return 'fast';
    return 'good';
  }

  getAccuracyColor(pct: number): string {
    if (pct >= 90) return '#4caf50';
    if (pct >= 75) return '#22a7f0';
    if (pct >= 60) return '#ff9800';
    return '#f44336';
  }

  /** Returns the dimension scores for the script's targetDimensions only */
  get targetDimScores(): { dim: string; label: string; score: number }[] {
    if (!this.results || !this.selectedScript) return [];
    return this.selectedScript.targetDimensions.map(dim => ({
      dim,
      label: this.humanLabel(dim),
      score: this.results!.dimensionScores[dim] ?? 3
    }));
  }

  readonly ALL_DIM_KEYS: string[] = [
    'speech_pace', 'pausing_fluency', 'loud_control',
    'pitch_variation', 'articulation_clarity', 'expressive_emph', 'filler_words_score'
  ];

  /** All 7 dimensions with target flag and delta vs plan baseline */
  get allDimScores(): { dim: string; label: string; score: number; isTarget: boolean; delta: number | null }[] {
    if (!this.results || !this.selectedScript) return [];
    const targetSet = new Set<string>(this.selectedScript.targetDimensions as string[]);
    const pre = (this.weeklyPlan?.avgScores ?? {}) as Record<string, number>;
    return this.ALL_DIM_KEYS.map(dim => {
      const score = this.results!.dimensionScores[dim] ?? 3;
      const prev  = pre[dim];
      return {
        dim,
        label:    this.humanLabel(dim),
        score,
        isTarget: targetSet.has(dim),
        delta:    (prev != null && prev > 0) ? parseFloat((score - prev).toFixed(2)) : null
      };
    });
  }

  isRecommended(script: PracticeScript): boolean {
    return !!this.weeklyPlan?.recommendedScripts?.some(r => r.script.id === script.id);
  }

  getRecommendedReason(script: PracticeScript): string {
    return this.weeklyPlan?.recommendedScripts?.find(r => r.script.id === script.id)?.reason ?? '';
  }

  get nextRecommendedScript(): RecommendedScript | null {
    if (!this.weeklyPlan?.recommendedScripts?.length) return null;
    return this.weeklyPlan.recommendedScripts.find(r => r.script.id !== this.selectedScript?.id) ?? null;
  }

  goToNextRecommended() {
    const next = this.nextRecommendedScript;
    if (next) {
      this.results       = null;
      this.analysisError = null;
      this.startFromRecommendation(next);
    }
  }

  get sessionsToUnlock(): number {
    return Math.max(0, 5 - (this.weeklyPlan?.sessionCount ?? 0));
  }

  // ── Transcript comparison ──────────────────────────────────────────────────

  showComparison = false;

  /** Strips to lowercase letters only — used for all comparison normalisation */
  private normWord = (w: string) => w.toLowerCase().replace(/[^a-z]/g, '');

  /** Script split into words, each flagged if it was missed by the speaker */
  get scriptWords(): { word: string; missed: boolean }[] {
    if (!this.selectedScript || !this.results) return [];
    const missedSet = new Set(this.results.missedWords.map(this.normWord));
    return this.selectedScript.rawText.trim().split(/\s+/).filter(Boolean).map(word => ({
      word,
      missed: missedSet.has(this.normWord(word))
    }));
  }

  /** Transcript split into words — filler only if the word is NOT in the script */
  get transcriptWords(): { word: string; isFiller: boolean; isExtra: boolean }[] {
    if (!this.results || !this.selectedScript) return [];
    const fillerSet = new Set(this.results.detectedFillers.map(this.normWord));
    const scriptSet = new Set(
      this.selectedScript.rawText.trim().split(/\s+/).filter(Boolean).map(this.normWord)
    );
    return this.results.transcript.trim().split(/\s+/).filter(Boolean).map(word => {
      const n        = this.normWord(word);
      const inScript = scriptSet.has(n);
      return {
        word,
        isFiller: !inScript && fillerSet.has(n),   // only filler if not part of the script
        isExtra:  !inScript && !fillerSet.has(n)   // said something not in script at all
      };
    });
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  selectCategory(cat: Category) {
    this.selectedCategory = cat;
    this.step = 'script';
  }

  selectScript(script: PracticeScript) {
    this.selectedScript  = script;
    this.sessionStarted  = false;
    this.step            = 'session';
  }

  beginRecording() {
    this.sessionStarted = true;
    this.startSession();
  }

  startFromRecommendation(rec: RecommendedScript) {
    this.selectedCategory = rec.script.category;
    this.selectScript(rec.script);
  }

  goBack() {
    if (this.step === 'script') {
      this.step = 'category';
    } else if (this.step === 'session') {
      this.stopSession(false);
      this.step = 'script';
    } else if (this.step === 'results') {
      this.results = null;
      this.step = 'script';
    } else {
      this.location.back();
    }
  }

  // ─── Session control ──────────────────────────────────────────────────────

  private startSession() {
    this.sessionDuration  = 0;
    this.results          = null;
    this.analysisError    = null;
    this.isRecording      = false;
    this.currentWpm       = 0;
    this.spokenWordCount  = 0;

    this.startTimer();
    this.audioRecorder.startRecording().then(() => {
      this.ngZone.run(() => {
        this.isRecording = true;
        this.startLiveWpm();
      });
    });
  }

  // ── Live WPM via Web Speech API word counting ────────────────────────────

  private startLiveWpm() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { this.wpmAvailable = false; return; }

    this.wpmAvailable    = true;
    this.spokenWordCount = 0;
    this.recognition     = new SpeechRecognition();
    this.recognition.continuous      = true;
    this.recognition.interimResults  = false;   // final only for accuracy
    this.recognition.lang            = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let newWords = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const words = event.results[i][0].transcript.trim().split(/\s+/).filter(Boolean);
          newWords += words.length;
        }
      }
      this.spokenWordCount += newWords;
      // Need at least 8 seconds of speech before showing WPM
      if (this.sessionDuration >= 8 && this.spokenWordCount > 0) {
        this.ngZone.run(() => {
          this.currentWpm = Math.round((this.spokenWordCount / this.sessionDuration) * 60);
        });
      }
    };

    this.recognition.onerror = (e: any) => {
      // 'no-speech' is normal during pauses — ignore it
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        this.wpmAvailable = false;
      }
    };

    this.recognition.onend = () => {
      // Auto-restart while still recording (recognition stops after silence)
      if (this.isRecording && this.recognition) {
        try { this.recognition.start(); } catch { /* already started */ }
      }
    };

    try { this.recognition.start(); } catch { this.wpmAvailable = false; }
  }

  private stopLiveWpm() {
    if (this.recognition) {
      this.recognition.onend = null;   // prevent auto-restart
      try { this.recognition.abort(); } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  async finishSession() {
    this.stopSession(true);
    this.step = 'analyzing';

    try {
      const blob = await this.audioRecorder.getWavBlob();
      if (!blob || !this.selectedScript) throw new Error('No audio recorded');

      this.results = await this.analysisApi.analyzePracticeSession(
        blob,
        this.selectedScript.rawText,
        this.selectedScript.category,
        this.selectedScript.targetDimensions
      );
      this.step = 'results';

      // Save session data for ML training dataset (fire-and-forget)
      const uid = this.firebaseService.auth.currentUser?.uid;
      if (uid && this.results && !this.results.noSpeechDetected && !this.results.contentMismatch) {
        this.savePracticeSessionData(uid).catch(() => { /* silently skip */ });
      }
    } catch (e: any) {
      this.analysisError = e?.message ?? 'Analysis failed. Please try again.';
      this.step = 'results';
    }
  }

  private async savePracticeSessionData(uid: string): Promise<void> {
    if (!this.results || !this.selectedScript) return;

    const post = this.results.dimensionScores;
    const pre  = (this.weeklyPlan?.avgScores ?? {}) as Record<string, number>;

    const dims = ['speech_pace', 'pausing_fluency', 'loud_control',
                  'pitch_variation', 'articulation_clarity', 'expressive_emph', 'filler_words_score'];

    const preScores:    Record<string, number> = {};
    const postScores:   Record<string, number> = {};
    const improvement:  Record<string, number> = {};

    for (const dim of dims) {
      preScores[dim]   = parseFloat((pre[dim]  ?? 0).toFixed(2));
      postScores[dim]  = parseFloat((post[dim] ?? 3).toFixed(2));
      improvement[dim] = parseFloat((postScores[dim] - preScores[dim]).toFixed(2));
    }
    postScores['overall'] = this.results.overall;
    improvement['overall'] = parseFloat((this.results.overall - (pre['overall'] ?? 0)).toFixed(2));

    await this.firebaseService.savePracticeSession(uid, {
      scriptId:                this.selectedScript.id,
      scriptTitle:             this.selectedScript.title,
      scriptCategory:          this.selectedScript.category,
      scriptDifficulty:        this.selectedScript.difficulty,
      scriptTargetPausing:     this.selectedScript.scriptTargetPausing,
      scriptTargetPitch:       this.selectedScript.scriptTargetPitch,
      scriptTargetFiller:      this.selectedScript.scriptTargetFiller,
      scriptTargetArticulation: this.selectedScript.scriptTargetArticulation,
      preScores,
      postScores,
      improvement,
      preSessionCount: this.weeklyPlan?.sessionCount ?? 0,
      wordAccuracy:    this.results.wordAccuracy,
      actualWpm:       this.results.actualWpm,
      duration:        this.results.duration,
      fillerCount:     this.results.fillerCount,
    });
  }

  tryAgain() {
    this.results         = null;
    this.analysisError   = null;
    this.sessionStarted  = false;
    this.showComparison  = false;
    this.step            = 'session';
  }

  chooseDifferent() {
    this.results        = null;
    this.analysisError  = null;
    this.showComparison = false;
    this.step           = 'script';
  }

  private stopSession(saveAudio: boolean) {
    this.clearTimer();
    this.stopLiveWpm();
    this.isRecording = false;
    if (saveAudio) {
      this.audioRecorder.stopRecording();
    } else {
      this.audioRecorder.reset();
    }
  }

  // ─── Timer ────────────────────────────────────────────────────────────────

  private startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => { this.sessionDuration++; });
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  ngOnDestroy() {
    this.clearTimer();
    this.stopLiveWpm();
    this.audioRecorder.reset();
  }
}
