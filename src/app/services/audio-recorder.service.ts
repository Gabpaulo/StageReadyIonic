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

      this.mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped. Chunks:', this.audioChunks);
        const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        // Convert WebM to WAV
        try {
          const wavBlob = await this.convertToWav(webmBlob);
          this.audioBlob$.next(wavBlob);
        } catch (error) {
          console.error('Error converting to WAV:', error);
          // Fallback to WebM if conversion fails
          this.audioBlob$.next(webmBlob);
        }

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

  /** Convert audio blob to WAV format using Web Audio API */
  private async convertToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert AudioBuffer to WAV
    const wavBuffer = this.audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /** Convert AudioBuffer to WAV format */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length minus RIFF identifier length and file description length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate (sample rate * block align)
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    // block align (channel count * bytes per sample)
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);

    // Get audio data from all channels
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    // Interleave channels and write to buffer
    offset = pos;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }
}
