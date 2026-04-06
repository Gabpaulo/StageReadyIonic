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
import { AnalyzeSpeechForFeedbackOutput } from '../../pages/speech-analysis/model';

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

    // Get WAV blob for submission (waits for conversion if still in progress)
    const wavBlob = await this.recorder.getWavBlob();
    const submissionBlob = wavBlob || this.audioBlob;

    console.log('Starting speech analysis...', {
      audioBlobSize: submissionBlob.size,
      speechType: this.speechType,
      audioBlobType: submissionBlob.type
    });

    this.speechAnalysisApi.analyzeSpeech(submissionBlob, this.speechType).subscribe({
      next: async (response: any) => {
        console.log('Speech analysis response received:', response);
        this.isLoading = false;

        // Validate response structure
        if (!response) {
          console.error('Empty API response');
          this.snackBar.open('Empty response from server. Please try again.', 'Close', { duration: 3000 });
          return;
        }

        // Backend returns: { speech_pace, pausing_fluency, loudness_control, pitch_variation,
        //                   articulation_clarity, expressive_emphasis, filler_words, overall,
        //                   transcript, duration, feedback: {...}, recommendations: [...] }

        // Pass the full service response through — all new fields (filler_word_details,
        // pause_analysis, overall_assessment, improvements, *_feedback, etc.) are preserved.
        const feedback: AnalyzeSpeechForFeedbackOutput = {
          ...response,
          category: this.speechType,
          // Normalise legacy field aliases so both mobile and web templates find the same keys
          loud_control:         response.loud_control         ?? response.loudness_control  ?? 2,
          loudness_control:     response.loudness_control     ?? response.loud_control      ?? 2,
          expressive_emph:      response.expressive_emph      ?? response.expressive_emphasis ?? 2,
          expressive_emphasis:  response.expressive_emphasis  ?? response.expressive_emph  ?? 2,
          filler_words_score:   response.filler_words_score   ?? response.filler_words      ?? 2,
          filler_words:         response.filler_words         ?? response.filler_words_score ?? 2,
        };
        
        this.snackBar.open('Analysis complete!', 'Close', { duration: 2000 });

        // Navigate to feedback page immediately
        this.router.navigate(['/web/feedback'], {
          state: { feedback }
        });

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
              feedback: response,
              transcript: response.transcript || '',
              duration: response.duration || 0,
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

        // Check for badge achievements and award XP (non-blocking)
        Promise.all([
          this.badgeService.onSpeechCompleted(feedback),
          this.badgeService.onSpeechAnalyzed(feedback),
          this.gamificationService.onSpeechCompleted()
        ]).catch(err => console.error('Badge/Gamification service error:', err));
      },
      error: (err: any) => {
        console.error('Analysis error', err);
        this.isLoading = false;
        
        // Provide more specific error messages
        let errorMessage = 'Analysis failed. Please try again.';
        if (err.error) {
          if (err.error.error) {
            errorMessage = err.error.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 0) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        } else if (err.status === 503) {
          errorMessage = 'Service temporarily unavailable. Please try again later.';
        }
        
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

  private extractStrengths(response: any): string {
    const strengths: string[] = [];
    const scores = {
      'Speech Pace': response.speech_pace,
      'Pausing & Fluency': response.pausing_fluency,
      'Volume Control': response.loudness_control,
      'Pitch Variation': response.pitch_variation,
      'Articulation': response.articulation_clarity,
      'Expression': response.expressive_emphasis,
      'Filler Words': response.filler_words
    };

    // Find scores >= 4 (good or excellent)
    for (const [category, score] of Object.entries(scores)) {
      if (score && score >= 4) {
        strengths.push(category);
      }
    }

    if (strengths.length === 0) {
      return response.feedback?.overall_assessment || 'Continue practicing to improve your skills';
    }

    return `Strong performance in: ${strengths.join(', ')}`;
  }

  private extractAreasForImprovement(response: any): string {
    const improvements: string[] = [];

    // Use recommendations from backend if available
    if (response.recommendations && response.recommendations.length > 0) {
      return response.recommendations
        .map((rec: any) => `${rec.category}: ${rec.suggestion}`)
        .join('\n\n');
    }

    // Fallback: extract from scores
    const scores = {
      'Speech Pace': response.speech_pace,
      'Pausing & Fluency': response.pausing_fluency,
      'Volume Control': response.loudness_control,
      'Pitch Variation': response.pitch_variation,
      'Articulation': response.articulation_clarity,
      'Expression': response.expressive_emphasis,
      'Filler Words': response.filler_words
    };

    for (const [category, score] of Object.entries(scores)) {
      if (score && score <= 3) {
        improvements.push(category);
      }
    }

    if (improvements.length === 0) {
      return 'Great job! Keep up the excellent work';
    }

    return `Focus on improving: ${improvements.join(', ')}`;
  }
}
