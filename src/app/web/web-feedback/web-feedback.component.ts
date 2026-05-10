import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnalyzeSpeechForFeedbackOutput } from '../../models/speech-analysis.model';

@Component({
  selector: 'app-web-feedback',
  templateUrl: './web-feedback.component.html',
  styleUrls: ['./web-feedback.component.scss'],
  standalone: false
})
export class WebFeedbackComponent implements OnInit {
  feedback!: AnalyzeSpeechForFeedbackOutput;
  highlightedTranscript: SafeHtml = '';
  fillerDetails: any = null;
  fillerSummary: { word: string; count: number }[] = [];

  constructor(public router: Router, private sanitizer: DomSanitizer) {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state as { feedback?: AnalyzeSpeechForFeedbackOutput }) || {};
    if (!state.feedback) {
      this.router.navigateByUrl('/web/analysis');
      return;
    }
    this.feedback = state.feedback;
    this.fillerDetails = this.extractFillerDetails();
    this.fillerSummary = this.buildFillerSummary();
    this.highlightedTranscript = this.buildHighlightedTranscript();
  }

  ngOnInit() {}

  tryAgain() {
    this.router.navigateByUrl('/web/analysis');
  }

  // ── Grade helpers ─────────────────────────────────────────────────────────
  getGradeLetter(): string {
    const v = this.feedback.overall || 0;
    if (v >= 4.5) return 'A';
    if (v >= 3.5) return 'B';
    if (v >= 2.5) return 'C';
    if (v >= 1.5) return 'D';
    return 'F';
  }

  getGradeLabel(): string {
    const v = this.feedback.overall || 0;
    if (v >= 4.5) return 'Excellent';
    if (v >= 3.5) return 'Good';
    if (v >= 2.5) return 'Fair';
    if (v >= 1.5) return 'Needs Work';
    return 'Poor';
  }

  getGradeColor(): string {
    const v = this.feedback.overall || 0;
    if (v >= 4.5) return '#4caf50';
    if (v >= 3.5) return '#8bc34a';
    if (v >= 2.5) return '#22a7f0';
    if (v >= 1.5) return '#ff9800';
    return '#f44336';
  }

  // ── Score breakdown ───────────────────────────────────────────────────────
  getScoreItems(): Array<{ label: string; value: number; feedback: string; icon: string }> {
    const f = this.feedback;
    return [
      { label: 'Speech Pace',       value: f.speech_pace || 0,                                 feedback: f.pace_feedback     || '', icon: 'speed' },
      { label: 'Pausing & Fluency', value: f.pausing_fluency || 0,                             feedback: f.pausing_feedback  || '', icon: 'pause_circle' },
      { label: 'Volume Control',    value: f.loudness_control || (f.loud_control as any) || 0, feedback: f.volume_feedback   || '', icon: 'volume_up' },
      { label: 'Pitch Variation',   value: f.pitch_variation || 0,                             feedback: f.pitch_feedback    || '', icon: 'music_note' },
      { label: 'Articulation',      value: f.articulation_clarity || 0,                        feedback: f.clarity_feedback  || '', icon: 'mic' },
      { label: 'Expressiveness',    value: f.expressive_emphasis || f.expressive_emph || 0,    feedback: f.tone_feedback     || '', icon: 'palette' },
      { label: 'Filler Words',      value: f.filler_words || f.filler_words_score || 0,        feedback: f.filler_feedback   || '', icon: 'chat_bubble' },
    ];
  }

  getScoreBarWidth(value: number): number {
    return Math.max(0, Math.min(100, (value / 5) * 100));
  }

  getScoreBarColor(value: number): string {
    if (value >= 4) return 'var(--success, #4caf50)';
    if (value >= 3) return 'var(--primary, #22a7f0)';
    if (value >= 2) return 'var(--warning, #ff9800)';
    return 'var(--danger, #f44336)';
  }

  getScoreClass(score: number | undefined): string {
    if (!score) return 'score-avg';
    if (score >= 4) return 'score-good';
    if (score >= 3) return 'score-avg';
    return 'score-poor';
  }

  // ── Filler words ──────────────────────────────────────────────────────────
  private extractFillerDetails(): any {
    return this.feedback.filler_word_details ?? null;
  }

  private buildFillerSummary(): { word: string; count: number }[] {
    const fillers = this.feedback.filler_word_details?.fillers;
    if (!fillers?.length) return [];
    const counts = new Map<string, number>();
    for (const f of fillers) {
      counts.set(f.word, (counts.get(f.word) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Transcript ────────────────────────────────────────────────────────────
  private buildHighlightedTranscript(): SafeHtml {
    const words = this.feedback.transcript_words;
    if (words?.length) {
      return this.sanitizer.bypassSecurityTrustHtml(this.buildAnnotatedTranscript(words));
    }
    const transcript = this.feedback.transcript;
    if (!transcript) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(transcript));
  }

  private buildAnnotatedTranscript(words: { word: string; start: number; end: number }[]): string {
    const FILLERS = new Set([
      'um', 'uh', 'umm', 'uhh', 'mm', 'mmm', 'hmm', 'hm', 'mhm',
      'like', 'you know', 'basically', 'literally', 'actually',
      'so', 'right', 'okay', 'ok', 'i mean', 'kind of', 'sort of'
    ]);
    const parts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const normalized = w.word.toLowerCase().replace(/[^a-z ]/g, '');
      const escaped = this.escapeHtml(w.word);
      if (FILLERS.has(normalized)) {
        parts.push(`<mark class="filler-highlight">${escaped}</mark>`);
      } else {
        parts.push(escaped);
      }
      if (i < words.length - 1) {
        const gap = words[i + 1].start - w.end;
        if (gap >= 0.5) {
          const type = gap < 1.0 ? 'short' : gap < 2.0 ? 'medium' : 'long';
          parts.push(`<span class="pause-marker ${type}" title="${gap.toFixed(1)}s pause">⏸ ${gap.toFixed(1)}s</span>`);
        }
      }
    }
    return parts.join(' ');
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  formatSecondsToTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
