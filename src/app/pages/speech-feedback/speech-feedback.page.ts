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
    this.highlightedTranscript = this.buildHighlightedTranscript();
  }

  ngOnInit() {}

  tryAgain() {
    this.router.navigateByUrl('/tabs/speech-analysis');
  }

  getFillerDetails(): any {
    return (this.feedback as any).filler_word_details || this.feedback.analysis?.filler_word_details;
  }

  private buildHighlightedTranscript(): SafeHtml {
    const transcript = this.feedback.transcript;
    if (!transcript) return '';

    const fillerDetails = this.getFillerDetails();
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

  formatMetricName(key: string): string {
    // Convert snake_case to Title Case
    return key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
