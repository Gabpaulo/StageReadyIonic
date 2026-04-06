import { Component, OnDestroy, NgZone } from '@angular/core';
import { Location } from '@angular/common';
import { PRACTICE_SCRIPTS, PracticeScript } from '../../data/practice-scripts.data';

type Step     = 'category' | 'script' | 'session' | 'results';
type Category = 'informative' | 'persuasive' | 'motivational';

const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'hmm',
  'like', 'basically', 'literally', 'actually',
  'you know', 'i mean', 'sort of', 'kind of'
];

export interface SessionResults {
  duration: number;
  wordsCompleted: number;
  totalWords: number;
  averageWpm: number;
  fillerWordCount: number;
  detectedFillerWords: string[];
  completionRate: number;
  paceRating: string;
}

@Component({
  selector: 'app-practice-mode',
  templateUrl: './practice-mode.page.html',
  styleUrls: ['./practice-mode.page.scss'],
  standalone: false
})
export class PracticeModePage implements OnDestroy {

  step: Step = 'category';
  selectedCategory: Category | null = null;
  selectedScript: PracticeScript | null = null;

  // Session flags
  isPaused         = false;
  isListening      = false;
  speechApiSupported = true;

  // ── Word tracking ──────────────────────────────────────────────────────────
  scriptWords: string[] = [];

  /**
   * confirmedWordIndex – advanced only when the API fires a FINAL result.
   * This is the "ground truth" position and is used as the anchor for new searches.
   */
  confirmedWordIndex = 0;

  /**
   * liveWordIndex – advanced on EVERY interim event, giving instant visual feedback.
   * Always >= confirmedWordIndex.  This drives the highlighted "current" word.
   */
  liveWordIndex = 0;

  // ── Live stats ─────────────────────────────────────────────────────────────
  currentWpm      = 0;
  sessionDuration = 0;
  fillerWordCount = 0;
  detectedFillerWords: string[] = [];

  // ── Results ────────────────────────────────────────────────────────────────
  results: SessionResults | null = null;

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
  private recognition: any   = null;
  private timerInterval: any = null;
  private wpmInterval: any   = null;
  private sessionStartTime   = 0;
  private wordTimestamps: number[] = [];
  private pauseStartTime   = 0;
  private totalPausedTime  = 0;

  /**
   * Pre-normalised script words – computed once per script selection so that
   * the hot-path (every interim event) never calls normalize() on scriptWords.
   */
  private normalizedScriptWords: string[] = [];

  constructor(private ngZone: NgZone, private location: Location) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.speechApiSupported = !!SR;
  }

  // ─── Computed getters ──────────────────────────────────────────────────────

  get filteredScripts(): PracticeScript[] {
    return this.allScripts.filter(s => s.category === this.selectedCategory);
  }

  get progressPercent(): number {
    if (!this.scriptWords.length) return 0;
    return Math.min(Math.round((this.liveWordIndex / this.scriptWords.length) * 100), 100);
  }

  get formattedTime(): string {
    const m = Math.floor(this.sessionDuration / 60);
    const s = this.sessionDuration % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get paceLevel(): string {
    if (this.currentWpm === 0)   return 'idle';
    if (this.currentWpm < 90)    return 'too-slow';
    if (this.currentWpm < 110)   return 'slow';
    if (this.currentWpm <= 150)  return 'good';
    if (this.currentWpm <= 175)  return 'fast';
    return 'too-fast';
  }

  get paceLabel(): string {
    const m: Record<string, string> = {
      idle: 'Waiting…', 'too-slow': 'Too slow', slow: 'A bit slow',
      good: 'Great pace!', fast: 'A bit fast', 'too-fast': 'Too fast'
    };
    return m[this.paceLevel];
  }

  get paceColor(): string {
    const m: Record<string, string> = {
      idle: '#9bb2c8', 'too-slow': '#f44336', slow: '#ff9800',
      good: '#4caf50', fast: '#ff9800', 'too-fast': '#f44336'
    };
    return m[this.paceLevel];
  }

  get categoryColor(): string {
    return this.selectedCategory ? this.categoryMeta[this.selectedCategory].color : '#22a7f0';
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  selectCategory(cat: Category) {
    this.selectedCategory = cat;
    this.step = 'script';
  }

  selectScript(script: PracticeScript) {
    this.selectedScript = script;
    this.scriptWords           = script.rawText.split(/\s+/).filter(Boolean);
    this.normalizedScriptWords = this.scriptWords.map(w => this.norm(w));
    this.step = 'session';
    setTimeout(() => this.startSession(), 400);
  }

  goBack() {
    if (this.step === 'script') {
      this.step = 'category';
    } else if (this.step === 'session') {
      this.stopRecognition();
      this.clearIntervals();
      this.step = 'script';
    } else if (this.step === 'results') {
      this.step = 'script';
    } else {
      this.location.back();
    }
  }

  // ─── Session control ──────────────────────────────────────────────────────

  startSession() {
    this.confirmedWordIndex = 0;
    this.liveWordIndex      = 0;
    this.currentWpm         = 0;
    this.sessionDuration    = 0;
    this.fillerWordCount    = 0;
    this.detectedFillerWords = [];
    this.wordTimestamps      = [];
    this.totalPausedTime     = 0;
    this.isPaused            = false;
    this.sessionStartTime    = Date.now();

    this.startRecognition();
    this.startTimer();
    this.startWpmCalculator();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.pauseStartTime = Date.now();
      this.recognition?.stop();
      this.isListening = false;
    } else {
      this.totalPausedTime += Date.now() - this.pauseStartTime;
      try { this.recognition?.start(); this.isListening = true; } catch (_) {}
    }
  }

  stopSession()     { this.finishSession(); }
  tryAgain()        { this.results = null; this.step = 'session'; setTimeout(() => this.startSession(), 300); }
  chooseDifferent() { this.results = null; this.step = 'script'; }

  // ─── Speech Recognition ───────────────────────────────────────────────────

  private startRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.speechApiSupported = false; return; }

    this.recognition = new SR();
    this.recognition.continuous      = true;
    this.recognition.interimResults  = true;   // MUST be true for real-time tracking
    this.recognition.lang            = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      // Run inside Angular zone so the view updates immediately
      this.ngZone.run(() => this.processResults(event));
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return; // harmless, onend will restart
      console.warn('SR error:', event.error);
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.isListening = false;
        if (!this.isPaused && this.step === 'session' &&
            this.liveWordIndex < this.scriptWords.length) {
          // Restart immediately – no gap
          setTimeout(() => {
            if (!this.isPaused && this.step === 'session') {
              try { this.recognition?.start(); this.isListening = true; } catch (_) {}
            }
          }, 50);          // 50ms gap is enough; any less may throw InvalidState
        }
      });
    };

    try { this.recognition.start(); this.isListening = true; }
    catch (e) { console.error('SR start failed:', e); }
  }

  // ─── Core result processing ────────────────────────────────────────────────

  private processResults(event: any) {
    let interimText = '';
    let finalText   = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finalText   += r[0].transcript + ' ';
      else           interimText += r[0].transcript + ' ';
    }

    /*
     * LIVE PATH – runs on EVERY event (interim & final).
     * We match all spoken text (final + interim) against the script starting
     * from confirmedWordIndex so liveWordIndex advances the moment a word is
     * partially recognised.
     */
    const allSpoken = (finalText + interimText).trim();
    if (allSpoken) {
      this.advanceLive(allSpoken);
    }

    /*
     * CONFIRMED PATH – runs only on final results.
     * Locks confirmedWordIndex so the next interim search starts further ahead.
     */
    if (finalText.trim()) {
      this.lockConfirmed(finalText.trim());
      this.detectFillerWords(finalText.trim());
    }

    this.scrollToLive();
  }

  // ─── Live word advance (interim-driven) ──────────────────────────────────

  private advanceLive(spokenText: string) {
    const tokens = this.tokenizeSpoken(spokenText);
    let idx = this.confirmedWordIndex;

    for (const token of tokens) {
      if (idx >= this.normalizedScriptWords.length) break;

      // Try up to 5 positions ahead to handle skipped/misheard words
      for (let offset = 0; offset <= 5 && idx + offset < this.normalizedScriptWords.length; offset++) {
        if (this.match(token, this.normalizedScriptWords[idx + offset])) {
          idx += offset + 1;
          break;
        }
      }
    }

    // liveWordIndex only ever moves FORWARD
    this.liveWordIndex = Math.max(this.liveWordIndex, Math.min(idx, this.scriptWords.length));
  }

  // ─── Confirmed word lock (final-driven) ──────────────────────────────────

  private lockConfirmed(finalText: string) {
    const tokens = this.tokenizeSpoken(finalText);
    let idx = this.confirmedWordIndex;

    for (const token of tokens) {
      if (idx >= this.normalizedScriptWords.length) break;
      for (let offset = 0; offset <= 5 && idx + offset < this.normalizedScriptWords.length; offset++) {
        if (this.match(token, this.normalizedScriptWords[idx + offset])) {
          idx += offset + 1;
          this.wordTimestamps.push(Date.now());
          break;
        }
      }
    }

    this.confirmedWordIndex = Math.min(idx, this.scriptWords.length);
    // liveWordIndex must always be at least confirmedWordIndex
    this.liveWordIndex = Math.max(this.liveWordIndex, this.confirmedWordIndex);

    if (this.confirmedWordIndex >= this.scriptWords.length) {
      this.finishSession();
    }
  }

  // ─── Filler word detection ────────────────────────────────────────────────

  private detectFillerWords(transcript: string) {
    const lower = transcript.toLowerCase();
    for (const filler of FILLER_WORDS) {
      const rx = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const hits = lower.match(rx);
      if (hits) {
        this.fillerWordCount += hits.length;
        this.detectedFillerWords.push(...hits.map(h => h.toLowerCase()));
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Strip punctuation & lowercase for comparison */
  private norm(word: string): string {
    return word.toLowerCase().replace(/[^a-z']/g, '');
  }

  private tokenizeSpoken(text: string): string[] {
    return text.split(/\s+/).map(w => this.norm(w)).filter(Boolean);
  }

  /** Fuzzy match – handles contractions spoken without apostrophe */
  private match(spoken: string, script: string): boolean {
    if (!spoken || !script) return false;
    if (spoken === script) return true;
    // First two chars quick check (saves running the full map every time)
    if (spoken[0] !== script[0]) {
      // contraction mismatch allowed: "dont" vs "don't"
      const stripped = script.replace(/'/g, '');
      if (spoken !== stripped) return false;
    }
    const c: Record<string, string> = {
      dont:"don't", cant:"can't", wont:"won't", its:"it's", youre:"you're",
      theyre:"they're", were:"we're", ive:"i've", youve:"you've",
      theyve:"they've", weve:"we've", hes:"he's", shes:"she's",
      thats:"that's", whats:"what's", lets:"let's", isnt:"isn't",
      arent:"aren't", wasnt:"wasn't", werent:"weren't", im:"i'm",
      id:"i'd", ill:"i'll", theyd:"they'd", wed:"we'd", youd:"you'd"
    };
    return c[spoken] === script || c[script.replace(/'/g, '')] === spoken;
  }

  /** Scroll so the live word is always visible – uses instant to avoid lag */
  private scrollToLive() {
    const el = document.getElementById(`word-${this.liveWordIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }

  // ─── Timer & WPM ──────────────────────────────────────────────────────────

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => { if (!this.isPaused) this.sessionDuration++; });
    }, 1000);
  }

  private startWpmCalculator() {
    this.wpmInterval = setInterval(() => {
      this.ngZone.run(() => this.calculateWpm());
    }, 1000);
  }

  private calculateWpm() {
    const now       = Date.now();
    const windowMs  = 30_000;
    this.wordTimestamps = this.wordTimestamps.filter(t => now - t < windowMs);
    const elapsed   = (now - this.sessionStartTime - this.totalPausedTime) / 1000;
    const windowSec = Math.min(elapsed, 30);
    this.currentWpm = windowSec > 2 && this.wordTimestamps.length > 0
      ? Math.round((this.wordTimestamps.length / windowSec) * 60)
      : 0;
  }

  // ─── Finish ───────────────────────────────────────────────────────────────

  private finishSession() {
    this.stopRecognition();
    this.clearIntervals();
    const avgWpm = this.confirmedWordIndex > 0 && this.sessionDuration > 0
      ? Math.round((this.confirmedWordIndex / this.sessionDuration) * 60) : 0;
    this.results = {
      duration:            this.sessionDuration,
      wordsCompleted:      this.confirmedWordIndex,
      totalWords:          this.scriptWords.length,
      averageWpm:          avgWpm,
      fillerWordCount:     this.fillerWordCount,
      detectedFillerWords: [...new Set(this.detectedFillerWords)],
      completionRate:      Math.round((this.confirmedWordIndex / this.scriptWords.length) * 100),
      paceRating:          this.resolvePaceRating(avgWpm)
    };
    this.step = 'results';
  }

  private resolvePaceRating(wpm: number): string {
    if (wpm < 90)   return 'Too Slow';
    if (wpm < 110)  return 'Slightly Slow';
    if (wpm <= 150) return 'Excellent';
    if (wpm <= 175) return 'Slightly Fast';
    return 'Too Fast';
  }

  private stopRecognition() {
    if (this.recognition) {
      this.recognition.onend    = null;
      this.recognition.onerror  = null;
      this.recognition.onresult = null;
      try { this.recognition.stop(); } catch (_) {}
      this.recognition = null;
      this.isListening = false;
    }
  }

  private clearIntervals() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.wpmInterval)   { clearInterval(this.wpmInterval);   this.wpmInterval   = null; }
  }

  ngOnDestroy() {
    this.stopRecognition();
    this.clearIntervals();
  }
}
