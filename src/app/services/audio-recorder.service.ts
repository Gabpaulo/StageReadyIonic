import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /** Emits true/false as recording starts/stops */
  public isRecording$ = new BehaviorSubject<boolean>(false);
  /** Emits the final audio Blob once recording stops */
  public audioBlob$    = new BehaviorSubject<Blob | null>(null);

  /** Start capturing microphone only */
  async startRecording() {
    this.audioChunks = [];
    this.audioBlob$.next(null);

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioBlob$.next(audioBlob);
      this.stopStream();
    };

    this.mediaRecorder.start();
    this.isRecording$.next(true);
  }

  /** Stop capture and emit blob */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.isRecording$.next(false);
    }
  }

  /** Reset state & release mic */
  reset() {
    this.audioBlob$.next(null);
    this.isRecording$.next(false);
    this.stopStream();
  }

  /** Helper to stop all tracks */
  private stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
