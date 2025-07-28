import { Component, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { Subscription } from 'rxjs';

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
  feedback: any = null;

  private subs: Subscription[] = [];

  constructor(
    private http: HttpClient,
    public recorder: AudioRecorderService
  ) {
    this.subs.push(
      this.recorder.isRecording$.subscribe(r => {
        console.log('🎙️ isRecording:', r);
        this.isRecording = r;
      }),
      this.recorder.audioBlob$.subscribe(blob => {
        console.log('🔊 raw audioBlob:', blob);
        const url = blob ? URL.createObjectURL(blob) : null;
        console.log('🔊 generated audioUrl:', url);
        this.audioBlob = blob;
        this.audioUrl  = url;
      })
    );
  }

  startRecording()  { this.recorder.startRecording(); }
  stopRecording()   { this.recorder.stopRecording(); }
  resetRecording()  {
    this.recorder.reset();
    this.feedback = null;
  }

  analyzeRecording() {
    if (!this.audioBlob) return;
    this.isLoading = true;
    const form = new FormData();
    form.append('audio', this.audioBlob, 'recording.webm');
    this.http.post('/api/analyze-speech', form).subscribe({
      next: res => { this.feedback = res; this.isLoading = false; },
      error:  err => { console.error(err);    this.isLoading = false; }
    });
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
