// src/app/pages/speech-feedback/speech-feedback.page.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyzeSpeechForFeedbackOutput } from '../speech-analysis/model';

@Component({
  selector: 'app-speech-feedback',
  templateUrl: './speech-feedback.page.html',
  styleUrls: ['./speech-feedback.page.scss'],
  standalone:false
})
export class SpeechFeedbackPage implements OnInit {
  feedback!: AnalyzeSpeechForFeedbackOutput;

  constructor(public router: Router) {
    const nav = this.router.getCurrentNavigation();
    // cast state to known shape
    const state = (nav?.extras?.state as { feedback?: AnalyzeSpeechForFeedbackOutput }) || {};
    if (!state.feedback) {
      // if no feedback in state, go back
      this.router.navigateByUrl('/speech-analysis');
      return;
    }
    this.feedback = state.feedback;
  }

  ngOnInit() {}
  
  tryAgain() {
    this.router.navigateByUrl('/tabs/speech-analysis');
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

  get fillerWordsFeedback(): string {
    // You might want to generate a more dynamic feedback based on filler_words_score or filler_words array
    if (this.feedback.filler_words && this.feedback.filler_words.length > 0) {
      return `You used ${this.feedback.filler_words.length} filler words. Try to reduce them for better fluency.`;
    }
    return 'Great job! No filler words detected.';
  }
}
