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
    this.highlightedTranscript = this.buildHighlightedTranscript();
  }

  ngOnInit() {}

  tryAgain() {
    this.router.navigateByUrl('/web/analysis');
  }

  private buildHighlightedTranscript(): SafeHtml {
    const transcript = this.feedback.transcript;
    if (!transcript) return '';

    const fillerDetails = this.feedback.analysis?.filler_word_details;
    if (!fillerDetails?.words?.length) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(transcript));
    }

    const fillerWords: string[] = fillerDetails.words.map((f: any) => f.word);
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