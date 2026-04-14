import { Component, OnDestroy } from '@angular/core';
import { Subscription }               from 'rxjs';
import { Router }                     from '@angular/router';
import { AudioRecorderService }       from '../../services/audio-recorder.service';
import { SpeechAnalysisApiService }   from '../../services/speech-analysis-api.service';
import { BadgeService }               from '../../services/badge.service';
import { GamificationService }        from '../../services/gamification.service';
import { FirebaseService }            from '../../services/firebase.service';
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
  isConverting = false;
  isProcessingRecording = false;
  speechType: 'informative' | 'motivational' | 'persuasive' = 'informative';
  pendingType: 'informative' | 'motivational' | 'persuasive' | null = 'informative';
  isTypeModalOpen = true;
  hasConfirmedSpeechType = false;
  audioLevels: number[] = Array(15).fill(0);

  // Recording timer
  recordingDuration = 0;
  private recordingTimer: any = null;

  private subs: Subscription[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  constructor(
    public recorder: AudioRecorderService,
    private speechAnalysisApi: SpeechAnalysisApiService,
    private router: Router,
    private badgeService: BadgeService,
    private gamificationService: GamificationService,
    private firebaseService: FirebaseService
  ) {
    this.subs.push(
      this.recorder.isRecording$
        .subscribe(r => {
          this.isRecording = r;
          if (r) {
            this.isConverting = false;
          }
        }),
      this.recorder.audioBlob$
        .subscribe(blob => {
          this.audioBlob = blob;
          this.audioUrl  = blob ? URL.createObjectURL(blob) : null;
          if (blob) {
            console.log('Recorded audio blob size:', blob.size, 'bytes');
            this.isProcessingRecording = false; // Audio received, stop processing indicator
            this.isConverting = true;
          }
        }),
      this.recorder.wavReady$
        .subscribe(ready => {
          if (ready) {
            this.isConverting = false;
          }
        })
    );
  }

  // Ionic life-cycle hook: called every time the view is about to enter
  ionViewWillEnter() {
    // reset recorder internals
    this.recorder.reset();
    // clear out any leftover blob/url/loading flags
    this.audioBlob = null;
    this.audioUrl  = null;
    this.isLoading = false;
    // force user to pick a speech type first
    this.pendingType = 'informative';
    this.isTypeModalOpen = true;
    this.hasConfirmedSpeechType = false;
  }

  async startRecording() {
    this.recordingDuration = 0;
    this.recordingTimer = setInterval(() => { this.recordingDuration++; }, 1000);
    await this.recorder.startRecording();
    setTimeout(() => this.startAudioAnalysis(), 100);
  }

  stopRecording() {
    this.isProcessingRecording = true;
    clearInterval(this.recordingTimer);
    this.recordingTimer = null;
    this.recorder.stopRecording();
    this.stopAudioAnalysis();
  }

  formatRecordingTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private async startAudioAnalysis() {
    try {
      // Get the media stream from the recorder
      const stream = (this.recorder as any).stream;
      if (!stream) {
        console.warn('No audio stream available for analysis');
        return;
      }

      // Create audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // Small FFT for 15 frequency bins
      this.analyser.smoothingTimeConstant = 0.7; // Smooth out the visualization

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      // Start the animation loop
      this.updateAudioLevels();
    } catch (error) {
      console.error('Error starting audio analysis:', error);
    }
  }

  private updateAudioLevels() {
    if (!this.analyser || !this.isRecording) {
      return;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Map frequency data to our 15 bars
    const barCount = 15;
    const step = Math.floor(dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const index = i * step;
      // Normalize to 0-1 range and apply some scaling for better visibility
      this.audioLevels[i] = Math.min((dataArray[index] / 255) * 1.5, 1);
    }

    // Continue the animation loop
    this.animationFrameId = requestAnimationFrame(() => this.updateAudioLevels());
  }

  private stopAudioAnalysis() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.audioLevels = Array(15).fill(0);
  }

  resetRecording() {
    clearInterval(this.recordingTimer);
    this.recordingTimer = null;
    this.recordingDuration = 0;
    this.recorder.reset();
    this.audioBlob = null;
    this.audioUrl  = null;
    this.isProcessingRecording = false;
  }

  openTypeModal() {
    this.isTypeModalOpen = true;
  }

  confirmSpeechType() {
    if (!this.pendingType) { return; }
    this.speechType = this.pendingType;
    this.hasConfirmedSpeechType = true;
    this.isTypeModalOpen = false;
  }

  cancelTypeModal() {
    // Keep modal open until selection is confirmed
    this.isTypeModalOpen = true;
  }

  async analyzeRecording() {
    if (!this.audioBlob) { return; }
    this.isLoading = true;

    // Get WAV blob for submission (waits for conversion if still in progress)
    const wavBlob = await this.recorder.getWavBlob();
    const submissionBlob = wavBlob || this.audioBlob;

    this.speechAnalysisApi.analyzeSpeech(submissionBlob, this.speechType).subscribe({
      next: async feedback => {
        this.isLoading = false;

        // Navigate to feedback page immediately
        this.router.navigate(
          ['/speech-feedback'],
          { state: { feedback } }
        );

        // Save to Firebase and process badges/XP in the background
        const audioBlob = this.audioBlob;
        const speechType = this.speechType;

        let user = this.firebaseService.auth.currentUser;
        if (!user) {
          try {
            const cred = await this.firebaseService.signInWithGoogle();
            user = cred.user;
          } catch (authErr) {
            console.error('User authentication required to save analysis.', authErr);
          }
        }

        if (user) {
          Promise.all([
            this.firebaseService.saveSpeechHistory(user.uid, {
              feedback: feedback,
              duration: feedback.duration || 0,
              audioBlob: audioBlob,
              speechType: speechType
            }),
            this.firebaseService.saveSpeechAnalysis(user.uid, {
              feedback: feedback,
              audioBlob: audioBlob,
              speechType: speechType,
              timestamp: new Date()
            })
          ]).catch(err => console.error('Error saving speech data:', err));
        }

        // Check for badge achievements and award XP
        Promise.all([
          this.badgeService.onSpeechCompleted(feedback),
          this.badgeService.onSpeechAnalyzed(feedback),
          this.gamificationService.onSpeechCompleted()
        ]).catch(err => console.error('Badge/Gamification error:', err));
      },
      error: err => {
        console.error('Analysis error', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.stopAudioAnalysis();
    clearInterval(this.recordingTimer);
  }
}
