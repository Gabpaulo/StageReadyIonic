import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { SpeechAnalysisApiService } from '../../services/speech-analysis-api.service';
import { BadgeService } from '../../services/badge.service';
import { GamificationService } from '../../services/gamification.service';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SpeechTypeDialogComponent } from './speech-type-dialog/speech-type-dialog.component';
import { AnalyzeSpeechForFeedbackOutput } from '../../models/speech-analysis.model';

@Component({
  selector: 'app-web-analysis',
  templateUrl: './web-analysis.component.html',
  styleUrls: ['./web-analysis.component.scss'],
  standalone: false
})
export class WebAnalysisComponent implements OnInit, OnDestroy {
  isRecording = false;
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  isLoading = false;
  isConverting = false;
  isProcessingRecording = false; // Shows immediately when stop is pressed
  speechType: 'informative' | 'motivational' | 'persuasive' = 'informative';
  hasConfirmedSpeechType = false;
  recordingDuration = 0;
  recordingTimer: any;
  audioLevels: number[] = Array(15).fill(0); // Audio levels for 15 bars

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
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    console.log('WebAnalysisComponent constructor called');
    
    try {
      this.subs.push(
        this.recorder.isRecording$.subscribe(r => {
          const wasRecording = this.isRecording;
          this.isRecording = r;
          if (r && !wasRecording) {
            // Just started recording
            this.stopTimer(); // Clear any existing timer first
            this.recordingDuration = 0;
            this.startTimer();
            this.isConverting = false;
          } else if (!r && wasRecording) {
            // Just stopped recording
            this.stopTimer();
            this.isConverting = true;
          }
        }),
        this.recorder.audioBlob$.subscribe(blob => {
          this.audioBlob = blob;
          this.audioUrl = blob ? URL.createObjectURL(blob) : null;
          // Audio blob received - stop the processing indicator, start converting indicator
          if (blob) {
            this.isProcessingRecording = false;
            this.isConverting = true;
          }
        }),
        this.recorder.wavReady$.subscribe(ready => {
          if (ready) {
            this.isConverting = false;
          }
        })
      );
    } catch (error) {
      console.error('Error initializing WebAnalysisComponent:', error);
    }
  }

  ngOnInit() {
    console.log('WebAnalysisComponent ngOnInit called');
    try {
      // Reset recorder internals
      if (this.recorder) {
        this.recorder.reset();
      }
      // Clear out any leftover blob/url/loading flags
      this.audioBlob = null;
      this.audioUrl = null;
      this.isLoading = false;
      this.recordingDuration = 0;
      // DON'T open modal immediately - let user choose when to select type
      this.hasConfirmedSpeechType = false;
      console.log('WebAnalysisComponent initialized successfully');
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.stopTimer();
    this.stopAudioAnalysis();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
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

  openTypeDialog() {
    const dialogRef = this.dialog.open(SpeechTypeDialogComponent, {
      width: '400px',
      data: { currentType: this.speechType },
      disableClose: true // Force user to make a selection
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.speechType = result;
        this.hasConfirmedSpeechType = true;
        this.snackBar.open(`Speech type set to: ${this.speechType}`, 'Close', { duration: 2000 });
      }
    });
  }

  async startRecording() {
    if (!this.hasConfirmedSpeechType) {
      this.openTypeDialog();
      return;
    }

    try {
      await this.recorder.startRecording();
      // Start audio analysis after a short delay to ensure stream is ready
      setTimeout(() => this.startAudioAnalysis(), 100);
      // Duration reset is now handled in isRecording$ subscription
    } catch (error) {
      this.snackBar.open('Failed to access microphone. Please check permissions.', 'Close', { duration: 3000 });
      console.error('Recording error:', error);
    }
  }

  stopRecording() {
    this.isProcessingRecording = true; // Show loading immediately when stop is pressed
    this.recorder.stopRecording();
    this.stopAudioAnalysis();
  }

  resetRecording() {
    this.recorder.reset();
    this.audioBlob = null;
    this.audioUrl = null;
    this.recordingDuration = 0;
    this.hasConfirmedSpeechType = false; // Reset speech type confirmation
    this.isProcessingRecording = false;
  }

  async analyzeRecording() {
    if (!this.audioBlob) {
      this.snackBar.open('No recording to analyze', 'Close', { duration: 2000 });
      return;
    }

    this.isLoading = true;

    const wavBlob = await this.recorder.getWavBlob();
    const submissionBlob = wavBlob || this.audioBlob;

    this.speechAnalysisApi.analyzeSpeech(submissionBlob, this.speechType).subscribe({
      next: async (feedback: AnalyzeSpeechForFeedbackOutput) => {
        this.isLoading = false;
        this.snackBar.open('Analysis complete!', 'Close', { duration: 2000 });

        this.router.navigate(['/web/feedback'], { state: { feedback } });

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

        // Badge criteria count saved speeches, so they must run after the save.
        const saved = user
          ? Promise.all([
              this.firebaseService.saveSpeechHistory(user.uid, {
                feedback,
                transcript: feedback.transcript || '',
                duration: feedback.duration || 0,
                audioBlob,
                speechType
              }),
              this.firebaseService.saveSpeechAnalysis(user.uid, {
                feedback,
                audioBlob,
                speechType,
                timestamp: new Date()
              })
            ]).catch(err => console.error('Error saving speech data:', err))
          : Promise.resolve();

        saved
          .then(() => Promise.all([
            this.badgeService.onSpeechCompleted(feedback),
            this.badgeService.onSpeechAnalyzed(feedback),
            this.gamificationService.onSpeechCompleted()
          ]))
          .catch(err => console.error('Badge/Gamification service error:', err));
      },
      error: (err: any) => {
        console.error('Analysis error', err);
        this.isLoading = false;
        const errorMessage = err.message || 'Analysis failed. Please try again.';
        this.snackBar.open(errorMessage, 'Close', { duration: 4000 });
      }
    });
  }

  private startTimer() {
    this.recordingTimer = setInterval(() => {
      this.recordingDuration++;
    }, 1000);
  }

  private stopTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

}
