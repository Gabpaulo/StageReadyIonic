import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnalyzeSpeechForFeedbackOutput } from '../../pages/speech-analysis/model';

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
    // cast state to known shape
    const state = (nav?.extras?.state as { feedback?: AnalyzeSpeechForFeedbackOutput }) || {};
    if (!state.feedback) {
      // if no feedback in state, go back
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

  private extractFillerDetails(): any {
    // Check multiple paths: analysis.filler_word_details (web mapping)
    // or top-level filler_word_details (direct response)
    const details = this.feedback.analysis?.filler_word_details
      || (this.feedback as any).filler_word_details
      || null;
    console.log('Filler details extracted:', details);
    return details;
  }

  private buildFillerSummary(): { word: string; count: number }[] {
    if (!this.fillerDetails?.fillers?.length) return [];

    // Count occurrences of each unique filler word
    const counts = new Map<string, number>();
    for (const filler of this.fillerDetails.fillers) {
      const word = filler.word.toLowerCase();
      counts.set(word, (counts.get(word) || 0) + 1);
    }

    // Convert to sorted array (most frequent first)
    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildHighlightedTranscript(): SafeHtml {
    const transcript = this.feedback.transcript;
    if (!transcript) return '';

    // Use the filler words from fillerSummary (derived from backend fillers array)
    if (!this.fillerSummary.length) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(transcript));
    }

    const fillerWords: string[] = this.fillerSummary.map(f => f.word);
    return this.sanitizer.bypassSecurityTrustHtml(this.highlightFillers(transcript, fillerWords));
  }

  private highlightFillers(text: string, fillerWords: string[]): string {
    // Sort by length descending so multi-word fillers are matched first
    const sorted = [...fillerWords].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    return this.escapeHtml(text).replace(pattern, '<mark class="filler-highlight">$1</mark>');
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  formatSecondsToTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
}