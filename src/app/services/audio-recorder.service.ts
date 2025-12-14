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

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        console.log('Audio data available:', e.data);
        this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped. Chunks:', this.audioChunks);
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioBlob$.next(audioBlob);
        this.stopStream();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.stopStream();
        this.isRecording$.next(false);
        alert('Error recording audio. Please check microphone permissions.');
      };

      this.mediaRecorder.start();
      console.log('MediaRecorder started.');
      this.isRecording$.next(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      this.isRecording$.next(false);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        alert('No microphone found. Please ensure a microphone is connected and working.');
      } else {
        alert('An unexpected error occurred while trying to access the microphone.');
      }
    }
  }

  /** Stop capture and emit blob */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.log('Stopping MediaRecorder.');
      this.mediaRecorder.stop();
      // isRecording$.next(false) is handled in onstop
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
