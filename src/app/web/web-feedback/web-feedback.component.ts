import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const FILLER_WORDS_LIST = [
  'um','uh','er','ah','hmm','hm','like','basically','literally',
  'actually','you know','i mean','sort of','kind of','right','so','well','okay','alright'
];

@Component({
  selector: 'app-web-feedback',
  templateUrl: './web-feedback.component.html',
  styleUrls: ['./web-feedback.component.scss'],
  standalone: false
})
export class WebFeedbackComponent {
  feedback: any = {};
  highlightedTranscript: SafeHtml = '';
  fillerSummary: { word: string; count: number }[] = [];

  constructor(private router: Router, private sanitizer: DomSanitizer) {
    const nav   = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state as any) || {};

    if (!state.feedback) {
      this.router.navigateByUrl('/web/analysis');
      return;
    }

    this.feedback              = state.feedback;
    this.fillerSummary         = this.buildFillerSummary();
    this.highlightedTranscript = this.buildHighlightedTranscript();
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get fillerDetails(): any  { return this.feedback.filler_word_details || null; }
  get pauseAnalysis(): any  { return this.feedback.pause_analysis       || null; }

  get strengths(): string[] {
    const s = this.feedback.strengths;
    if (Array.isArray(s)) return s.filter(Boolean);
    if (typeof s === 'string' && s) return s.split(/\n+/).filter(Boolean);
    return [];
  }

  get improvements(): string[] {
    const i = this.feedback.improvements;
    if (Array.isArray(i)) return i.filter(Boolean);
    if (typeof i === 'string' && i) return i.split(/\n+/).filter(Boolean);
    return [];
  }

  get overallGrade(): string {
    const s = this.feedback.overall ?? 0;
    if (s >= 3.5) return 'A';
    if (s >= 2.5) return 'B';
    if (s >= 1.5) return 'C';
    return 'D';
  }

  get overallPercent(): number {
    return Math.round(((this.feedback.overall ?? 0) / 4) * 100);
  }

  get scoreItems(): { label: string; score: number; feedback: string }[] {
    const f = this.feedback;
    return [
      { label: 'Speech Pace',     score: f.speech_pace          ?? 0, feedback: f.pace_feedback    || '' },
      { label: 'Pausing & Flow',  score: f.pausing_fluency      ?? 0, feedback: f.pausing_feedback || '' },
      { label: 'Volume Control',  score: f.loud_control         ?? 0, feedback: '' },
      { label: 'Pitch Variation', score: f.pitch_variation      ?? 0, feedback: '' },
      { label: 'Clarity',         score: f.articulation_clarity ?? 0, feedback: f.clarity_feedback || '' },
      { label: 'Expressiveness',  score: f.expressive_emph      ?? 0, feedback: f.tone_feedback    || '' },
      { label: 'Filler Words',    score: f.filler_words_score   ?? 0, feedback: f.filler_feedback  || '' },
    ];
  }

  scoreBarPercent(score: number): number { return Math.round((score / 4) * 100); }

  scoreColor(score: number): string {
    if (score >= 3) return '#4caf50';
    if (score >= 2) return '#22a7f0';
    if (score >= 1) return '#ff9800';
    return '#f44336';
  }

  scoreLabel(score: number): string {
    if (score >= 3.5) return 'Excellent';
    if (score >= 2.5) return 'Good';
    if (score >= 1.5) return 'Fair';
    return 'Needs Work';
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  formatTimestamp(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  tryAgain() { this.router.navigateByUrl('/web/analysis'); }

  // ─── Filler summary ────────────────────────────────────────────────────────

  private buildFillerSummary(): { word: string; count: number }[] {
    const fillers = this.feedback.filler_word_details?.fillers;
    if (fillers?.length) {
      const map = new Map<string, number>();
      for (const f of fillers) map.set(f.word, (map.get(f.word) || 0) + 1);
      return Array.from(map.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
    }
    // Fallback from transcript text
    const t = (this.feedback.transcript || '').toLowerCase();
    const map = new Map<string, number>();
    for (const fw of FILLER_WORDS_LIST) {
      const rx = new RegExp(`\\b${fw.replace(/\s/g, '\\s+')}\\b`, 'gi');
      const hits = t.match(rx);
      if (hits) map.set(fw, (map.get(fw) || 0) + hits.length);
    }
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildHighlightedTranscript(): SafeHtml {
    const t = this.feedback.transcript;
    if (!t) return '';
    if (!this.fillerSummary.length) {
      return this.sanitizer.bypassSecurityTrustHtml(this.esc(t));
    }
    const words   = this.fillerSummary.map(f => f.word).sort((a, b) => b.length - a.length);
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const rx      = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    const html    = this.esc(t).replace(rx, '<mark class="filler-highlight" title="Filler word">$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private esc(t: string): string {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
