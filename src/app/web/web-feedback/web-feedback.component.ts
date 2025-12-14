import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyzeSpeechForFeedbackOutput } from '../../pages/speech-analysis/model';

@Component({
  selector: 'app-web-feedback',
  templateUrl: './web-feedback.component.html',
  styleUrls: ['./web-feedback.component.scss'],
  standalone: false
})
export class WebFeedbackComponent implements OnInit {
  feedback!: AnalyzeSpeechForFeedbackOutput;

  constructor(public router: Router) {
    const nav = this.router.getCurrentNavigation();
    // cast state to known shape
    const state = (nav?.extras?.state as { feedback?: AnalyzeSpeechForFeedbackOutput }) || {};
    if (!state.feedback) {
      // if no feedback in state, go back
      this.router.navigateByUrl('/web/analysis');
      return;
    }
    this.feedback = state.feedback;
  }

  ngOnInit() {}
  
  tryAgain() {
    this.router.navigateByUrl('/web/analysis');
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