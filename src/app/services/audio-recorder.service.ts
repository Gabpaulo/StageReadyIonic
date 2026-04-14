import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Platform } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private hasRequestedPermission = false;
  private wavBlob: Blob | null = null;
  private isConverting = false;
  /** True from the moment stop() is called until onstop fires — bridges the async gap */
  private isStopping = false;

  /** Emits true/false as recording starts/stops */
  public isRecording$ = new BehaviorSubject<boolean>(false);
  /** Emits the final audio Blob once recording stops (for preview - WebM format) */
  public audioBlob$ = new BehaviorSubject<Blob | null>(null);
  /** Emits when WAV conversion is complete (for submission) */
  public wavReady$ = new BehaviorSubject<boolean>(false);

  constructor(private platform: Platform) {}

  /** Check if microphone permission is granted (web only) */
  async checkPermissions(): Promise<boolean> {
    try {
      // For web browsers that support the Permissions API
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission status:', result.state);
        return result.state === 'granted';
      }
      // If Permissions API not available, assume we need to request
      return false;
    } catch (error) {
      console.log('Permissions API not available, will request on first use');
      return false;
    }
  }

  /** Request microphone permission explicitly */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      this.hasRequestedPermission = true;
      console.log('Microphone permission granted');
      return true;
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      this.handlePermissionError(error);
      return false;
    }
  }

  /** Start capturing microphone only */
  async startRecording() {
    this.audioChunks = [];
    this.audioBlob$.next(null);

    // Request permission if not already done
    if (!this.hasRequestedPermission) {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return;
      }
    }

    try {
      // Request audio stream with optimized settings
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono for smaller file size
          sampleRate: 48000 // High quality sample rate
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Use appropriate MIME type based on platform
      const mimeType = this.getSupportedMimeType();
      console.log('Using MIME type:', mimeType);

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        console.log('Audio data available:', e.data);
        this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped. Chunks:', this.audioChunks.length);
        // onstop fired — the async gap is now closed
        this.isStopping = false;
        this.isRecording$.next(false);
        this.wavReady$.next(false);
        this.wavBlob = null;

        const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioBlob$.next(webmBlob);
        console.log('WebM blob size:', webmBlob.size);

        this.stopStream();

        // Convert to WAV — wavReady$ signals completion
        this.isConverting = true;
        try {
          this.wavBlob = await this.convertToWav(webmBlob);
          console.log('WAV ready, size:', this.wavBlob.size);
          this.wavReady$.next(true);
        } catch (error) {
          console.error('WAV conversion failed, using WebM:', error);
          this.wavBlob = webmBlob;
          this.wavReady$.next(true);
        } finally {
          this.isConverting = false;
        }
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
      this.handlePermissionError(err);
    }
  }

  /** Handle permission errors with user-friendly messages */
  private handlePermissionError(error: any) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          if (this.platform.is('android') || this.platform.is('ios')) {
            alert('Microphone access denied. Please go to your device Settings > Apps > StageReady > Permissions and enable Microphone access.');
          } else {
            alert('Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow microphone access, then try again.');
          }
          break;
        case 'NotFoundError':
          alert('No microphone found. Please ensure a microphone is connected and working.');
          break;
        case 'NotReadableError':
          alert('Microphone is already in use by another application. Please close other apps using the microphone and try again.');
          break;
        case 'OverconstrainedError':
          alert('Microphone does not support the requested audio settings. Trying with default settings...');
          // Fallback to simpler constraints
          this.startRecordingWithFallback();
          break;
        case 'AbortError':
          alert('Microphone access was aborted. Please try again.');
          break;
        case 'SecurityError':
          alert('Microphone access blocked due to security settings. Please check your browser or device settings.');
          break;
        default:
          alert(`Microphone error: ${error.message || 'Unknown error'}`);
      }
    } else {
      alert('An unexpected error occurred while trying to access the microphone.');
    }
  }

  /** Fallback recording with simpler constraints */
  private async startRecordingWithFallback() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.isStopping = false;
        this.isRecording$.next(false);
        this.wavReady$.next(false);
        this.wavBlob = null;

        const webmBlob = new Blob(this.audioChunks, { type: mimeType });
        this.audioBlob$.next(webmBlob);
        this.stopStream();

        this.isConverting = true;
        try {
          this.wavBlob = await this.convertToWav(webmBlob);
          this.wavReady$.next(true);
        } catch (error) {
          console.error('Error converting to WAV:', error);
          this.wavBlob = webmBlob;
          this.wavReady$.next(true);
        } finally {
          this.isConverting = false;
        }
      };

      this.mediaRecorder.start();
      this.isRecording$.next(true);
    } catch (error) {
      console.error('Fallback recording also failed:', error);
      this.isRecording$.next(false);
    }
  }

  /** Get supported MIME type for the platform */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Default fallback
    return 'audio/webm';
  }

  /** Stop capture — sets isStopping so getWavBlob() knows to wait */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.log('Stopping MediaRecorder.');
      this.isStopping = true;    // bridge the async gap until onstop fires
      this.wavReady$.next(false); // reset ready signal before new stop
      this.mediaRecorder.stop();
    }
  }

  /** Reset state & release mic */
  reset() {
    this.isStopping  = false;
    this.isConverting = false;
    this.wavBlob     = null;
    this.audioChunks = [];
    this.audioBlob$.next(null);
    this.isRecording$.next(false);
    this.wavReady$.next(false);
    this.stopStream();
  }

  /**
   * Get the WAV blob for submission.
   * Waits correctly even if called immediately after stopRecording(),
   * before onstop has had a chance to fire (isStopping) or before
   * WAV conversion has completed (isConverting).
   */
  async getWavBlob(): Promise<Blob | null> {
    // Already ready — nothing to wait for
    if (this.wavBlob && !this.isStopping && !this.isConverting) {
      return this.wavBlob;
    }

    // Still in the async gap between stop() and onstop, OR still converting
    if (this.isStopping || this.isConverting) {
      console.log('getWavBlob: waiting for stop/conversion to complete…');
      return new Promise<Blob | null>(resolve => {
        const sub = this.wavReady$.subscribe(ready => {
          if (ready) {
            sub.unsubscribe();
            console.log('getWavBlob: resolved, size:', this.wavBlob?.size);
            resolve(this.wavBlob);
          }
        });
      });
    }

    // Fallback (e.g. stopRecording was never called, use raw blob)
    return this.audioBlob$.value;
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
