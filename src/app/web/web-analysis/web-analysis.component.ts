import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { SpeechAnalysisApiService } from '../../services/speech-analysis-api.service';
import { BadgeService } from '../../services/badge.service';
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
  speechType: 'informative' | 'motivational' | 'persuasive' = 'informative';
  hasConfirmedSpeechType = false;
  recordingDuration = 0;
  recordingTimer: any;

  private subs: Subscription[] = [];

  constructor(
    public recorder: AudioRecorderService,
    private speechAnalysisApi: SpeechAnalysisApiService,
    private router: Router,
    private badgeService: BadgeService,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    console.log('WebAnalysisComponent constructor called');
    
    try {
      this.subs.push(
        this.recorder.isRecording$.subscribe(r => {
          this.isRecording = r;
          if (r) {
            this.startTimer();
          } else {
            this.stopTimer();
          }
        }),
        this.recorder.audioBlob$.subscribe(blob => {
          this.audioBlob = blob;
          this.audioUrl = blob ? URL.createObjectURL(blob) : null;
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
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
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
      this.recordingDuration = 0;
    } catch (error) {
      this.snackBar.open('Failed to access microphone. Please check permissions.', 'Close', { duration: 3000 });
      console.error('Recording error:', error);
    }
  }

  stopRecording() {
    this.recorder.stopRecording();
  }

  resetRecording() {
    this.recorder.reset();
    this.audioBlob = null;
    this.audioUrl = null;
    this.recordingDuration = 0;
    this.hasConfirmedSpeechType = false; // Reset speech type confirmation
  }

  async analyzeRecording() {
    if (!this.audioBlob) {
      this.snackBar.open('No recording to analyze', 'Close', { duration: 2000 });
      return;
    }

    this.isLoading = true;
    console.log('Starting speech analysis...', {
      audioBlobSize: this.audioBlob.size,
      speechType: this.speechType,
      audioBlobType: this.audioBlob.type
    });

    this.speechAnalysisApi.analyzeSpeech(this.audioBlob, this.speechType).subscribe({
      next: async (response: any) => {
        console.log('Speech analysis response received:', response);
        this.isLoading = false;
        
        // Validate response structure
        if (!response) {
          console.error('Empty API response');
          this.snackBar.open('Empty response from server. Please try again.', 'Close', { duration: 3000 });
          return;
        }
        
        // Transcript might be empty or "Audio transcription unavailable", which is still valid
        if (response.transcript === undefined) {
          console.error('Invalid API response - missing transcript:', response);
          this.snackBar.open('Invalid response from server. Please try again.', 'Close', { duration: 3000 });
          return;
        }

        // Map response to expected format
        const feedback: AnalyzeSpeechForFeedbackOutput = {
          transcript: response.transcript || '',
          category: response.category || this.speechType,
          duration: response.duration || 0,
          speech_pace: response.speech_pace || 3,
          pausing_fluency: response.pausing_fluency || 3,
          loud_control: response.loud_control || 3,
          pitch_variation: response.pitch_variation || 3,
          articulation_clarity: response.articulation_clarity || 3,
          expressive_emph: response.expressive_emph || 3,
          filler_words_score: response.filler_words_score || 3,
          overall: response.overall || 3,
          pace_feedback: response.pace_feedback || 'No feedback available',
          tone_feedback: response.tone_feedback || 'No feedback available',
          clarity_feedback: response.clarity_feedback || 'No feedback available',
          strengths: response.strengths || 'No strengths identified',
          areas_improvement: response.areas_improvement || 'No areas for improvement identified',
          filler_words: response.filler_words || [],
          analysis: response
        };
        
        // Save speech analysis to Firebase
        let user = this.firebaseService.auth.currentUser;
        if (!user) {
          try {
            const cred = await this.firebaseService.signInWithGoogle();
            user = cred.user;
          } catch (authErr) {
            console.error('User authentication required to save analysis.', authErr);
            this.snackBar.open('Authentication required to save analysis', 'Close', { duration: 3000 });
            return;
          }
        }

        if (user) {
          // Save speech history (without audio blob)
          await this.firebaseService.saveSpeechHistory(user.uid, {
            feedback: feedback,
            duration: feedback.duration || (this.audioBlob ? this.audioBlob.size / 1000 : 0),
            audioBlob: this.audioBlob,
            speechType: this.speechType
          });
          
          // Save detailed analysis with audio (for other purposes)
          await this.firebaseService.saveSpeechAnalysis(user.uid, {
            feedback: feedback,
            audioBlob: this.audioBlob,
            speechType: this.speechType,
            timestamp: new Date()
          });
        }
        
        // Check for badge achievements
        await this.badgeService.onSpeechCompleted(feedback);
        await this.badgeService.onSpeechAnalyzed(feedback);
        
        this.snackBar.open('Analysis complete!', 'Close', { duration: 2000 });
        
        // Navigate to feedback page
        this.router.navigate(['/web/feedback'], {
          state: { feedback }
        });
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
}
