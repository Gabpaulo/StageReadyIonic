import { Component, OnDestroy } from '@angular/core';
import { Subscription }               from 'rxjs';
import { Router }                     from '@angular/router';
import { AudioRecorderService }       from '../../services/audio-recorder.service';
import { SpeechAnalysisService }      from '../../services/genai.service';
import { AnalyzeSpeechForFeedbackOutput }
  from './model';

@Component({
  selector: 'app-speech-analysis',
  templateUrl: './speech-analysis.page.html',
  styleUrls: ['./speech-analysis.page.scss'],
  standalone:false
})
export class SpeechAnalysisPage implements OnDestroy {
  isRecording = false;
  audioBlob: Blob | null = null;
  audioUrl:  string | null = null;
  isLoading = false;

  private subs: Subscription[] = [];

  constructor(
    public recorder: AudioRecorderService,
    private analysis: SpeechAnalysisService,
    private router: Router
  ) {
    this.subs.push(
      this.recorder.isRecording$
        .subscribe(r => this.isRecording = r),
      this.recorder.audioBlob$
        .subscribe(blob => {
          this.audioBlob = blob;
          this.audioUrl  = blob ? URL.createObjectURL(blob) : null;
        })
    );
  }

  startRecording()  { this.recorder.startRecording(); }
  stopRecording()   { this.recorder.stopRecording(); }

  resetRecording() {
    this.recorder.reset();
  }

  analyzeRecording() {
    if (!this.audioBlob) { return; }
    this.isLoading = true;

    this.analysis.analyzeAudioBlob(this.audioBlob).subscribe({
      next: feedback => {
        // turn off the spinner
        this.isLoading = false;
        // navigate to the feedback page, passing the feedback in state
        this.router.navigate(
          ['/speech-feedback'],
          { state: { feedback } }
        );
      },
      error: err => {
        console.error('Analysis error', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
