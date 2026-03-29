// src/app/pages/speech-feedback/speech-feedback.page.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnalyzeSpeechForFeedbackOutput } from '../speech-analysis/model';

@Component({
  selector: 'app-speech-feedback',
  templateUrl: './speech-feedback.page.html',
  styleUrls: ['./speech-feedback.page.scss'],
  standalone:false
})
export class SpeechFeedbackPage implements OnInit {
  feedback!: AnalyzeSpeechForFeedbackOutput;
  highlightedTranscript: SafeHtml = '';
  fillerSummary: { word: string; count: number }[] = [];

  constructor(public router: Router, private sanitizer: DomSanitizer) {
    const nav = this.router.getCurrentNavigation();
    // cast state to known shape
    const state = (nav?.extras?.state as { feedback?: AnalyzeSpeechForFeedbackOutput }) || {};
    if (!state.feedback) {
      // if no feedback in state, go back
      this.router.navigateByUrl('/speech-analysis');
      return;
    }
    this.feedback = state.feedback;
    this.fillerSummary = this.buildFillerSummary();
    this.highlightedTranscript = this.buildHighlightedTranscript();
  }

  ngOnInit() {}

  tryAgain() {
    this.router.navigateByUrl('/tabs/speech-analysis');
  }

  getFillerDetails(): any {
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

  getImprovementItems(): { category: string; suggestion: string }[] {
    const text = this.feedback.areas_improvement;
    if (!text) return [];

    // Split on double newlines (from recommendations format: "Category: Suggestion")
    const lines = text.split('\n\n').filter(line => line.trim());
    if (lines.length > 1) {
      return lines.map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          return {
            category: line.substring(0, colonIdx).trim(),
            suggestion: line.substring(colonIdx + 1).trim()
          };
        }
        return { category: '', suggestion: line.trim() };
      });
    }

    // Fallback: single line, return as-is
    return [{ category: '', suggestion: text }];
  }

  private buildHighlightedTranscript(): SafeHtml {
    const words = this.feedback.transcript_words;
    if (words?.length) {
      return this.sanitizer.bypassSecurityTrustHtml(this.buildAnnotatedTranscript(words));
    }
    // Fallback: plain text with filler highlights only
    const transcript = this.feedback.transcript;
    if (!transcript) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(transcript));
  }

  private buildAnnotatedTranscript(words: { word: string; start: number; end: number }[]): string {
    const FILLERS = new Set([
      'um', 'uh', 'umm', 'uhh',
      'mm', 'mmm', 'hmm', 'hm', 'mhm',
      'like', 'you know', 'you know what i mean',
      'basically', 'literally', 'actually',
      'so', 'right', 'okay', 'ok',
      'i mean', 'kind of', 'sort of'
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

  formatTimestamp(timestamp: number | string | undefined | null): string {
    if (timestamp === undefined || timestamp === null) {
      return '0.0';
    }

    // Convert to number if it's a string
    const numValue = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;

    if (isNaN(numValue)) {
      return '0.0';
    }

    return numValue.toFixed(1);
  }

  getDetailedScores(): Array<{key: string, value: any}> {
    if (!this.feedback.feedback?.detailed_scores) {
      return [];
    }
    const detailedScores = this.feedback.feedback.detailed_scores;
    return Object.keys(detailedScores).map(key => ({
      key,
      value: detailedScores[key]
    }));
  }

  formatSecondsToTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getScoreClass(score: number | undefined): string {
    if (!score) return 'score-avg';
    if (score >= 4) return 'score-good';
    if (score >= 3) return 'score-avg';
    return 'score-poor';
  }

  formatMetricName(key: string): string {
    // Convert snake_case to Title Case
    return key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
