import { Component, OnDestroy } from '@angular/core';
import { Subscription }               from 'rxjs';
import { Router }                     from '@angular/router';
import { AudioRecorderService }       from '../../services/audio-recorder.service';
import { SpeechAnalysisApiService }   from '../../services/speech-analysis-api.service';
import { BadgeService }               from '../../services/badge.service';
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
  speechType: 'informative' | 'motivational' | 'persuasive' = 'informative';
  pendingType: 'informative' | 'motivational' | 'persuasive' | null = 'informative';
  isTypeModalOpen = true;
  hasConfirmedSpeechType = false;

  private subs: Subscription[] = [];

  constructor(
    public recorder: AudioRecorderService,
    private speechAnalysisApi: SpeechAnalysisApiService,
    private router: Router,
    private badgeService: BadgeService,
    private firebaseService: FirebaseService
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

  startRecording()  { this.recorder.startRecording(); }
  stopRecording()   { this.recorder.stopRecording(); }

  resetRecording() {
    this.recorder.reset();
    this.audioBlob = null;
    this.audioUrl  = null;
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

    this.speechAnalysisApi.analyzeSpeech(this.audioBlob, this.speechType).subscribe({
      next: async feedback => {
        this.isLoading = false;
        
        // Save speech analysis to Firebase
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
          // Save speech history (without audio blob)
          await this.firebaseService.saveSpeechHistory(user.uid, {
            feedback: feedback,
            duration: this.audioBlob ? this.audioBlob.size / 1000 : 0, // rough duration estimate
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
