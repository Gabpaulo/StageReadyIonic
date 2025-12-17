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

  formatMetricName(key: string): string {
    // Convert snake_case to Title Case
    return key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
