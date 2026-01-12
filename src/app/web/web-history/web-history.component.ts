import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../../models/speech-history.model';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-session-details-dialog',
  template: `
    <h2 mat-dialog-title>Session Details</h2>
    <mat-dialog-content>
      <div *ngIf="data.loading" class="loading-state" style="padding: 16px;">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading session...</p>
      </div>

      <div *ngIf="data.error && !data.loading" class="error-state" style="padding: 16px;">
        <div class="error-icon">⚠</div>
        <p>{{ data.error }}</p>
      </div>

      <div *ngIf="!data.loading && !data.error">
        <mat-list>
          <mat-list-item>
            <div matListItemIcon class="schedule-icon">🕒</div>
            <div matListItemTitle>{{ formatDate(data.entry.createdAt) }}</div>
            <div matListItemLine *ngIf="data.entry.duration">Duration: {{ formatDuration(data.entry.duration) }}</div>
            <div matListItemLine *ngIf="data.entry.wordCount">Words: {{ data.entry.wordCount }}</div>
            <div matListItemLine *ngIf="data.entry.averagePace">Pace: {{ formatInteger(data.entry.averagePace) }} WPM</div>
          </mat-list-item>
        </mat-list>

        <mat-card *ngIf="(data.entry.audioUrl || data.entry.audioData)" class="audio-card" style="margin: 16px 0;">
          <mat-card-header>
            <mat-card-title>Playback</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <audio *ngIf="data.entry.audioUrl"
                   [src]="data.entry.audioUrl"
                   controls
                   style="width: 100%;"></audio>
            <audio *ngIf="!data.entry.audioUrl && data.entry.audioData"
                   [src]="'data:' + (data.entry.audioMimeType || 'audio/webm') + ';base64,' + data.entry.audioData"
                   controls
                   style="width: 100%;"></audio>
          </mat-card-content>
        </mat-card>

        <mat-card class="transcript-card" style="margin: 16px 0;">
          <mat-card-header>
            <mat-card-title>Transcript</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            {{ data.entry.transcript }}
          </mat-card-content>
        </mat-card>

        <mat-card class="feedback-card" *ngIf="data.entry.feedback" style="margin: 16px 0;">
          <mat-card-header>
            <mat-card-title>Feedback</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="feedback-item">
              <strong>Clarity:</strong> {{ data.entry.feedback?.articulation_clarity || 'N/A' }}
            </div>
            <div class="feedback-item">
              <strong>Pace:</strong> {{ data.entry.feedback?.speech_pace || 'N/A' }}
            </div>
            <div class="feedback-item">
              <strong>Tone:</strong> {{ data.entry.feedback?.pitch_variation || 'N/A' }}
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  standalone: false
})
export class SessionDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SessionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  formatDuration(seconds: number): string {
    const totalSeconds = Math.floor(seconds || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatInteger(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return Math.round(value).toString();
  }
}

@Component({
  selector: 'app-web-history',
  templateUrl: './web-history.component.html',
  styleUrls: ['./web-history.component.scss'],
  standalone: false
})
export class WebHistoryComponent implements OnInit {
  speechHistory: SpeechHistoryEntry[] = [];
  summary: SpeechHistorySummary | null = null;
  loading = true;
  error: string | null = null;
  userPhotoURL: string | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private dialog: MatDialog
  ) { }

  async ngOnInit() {
    // Get user photo URL
    this.firebaseService.auth.onAuthStateChanged(user => {
      if (user) {
        this.userPhotoURL = user.photoURL || null;
      } else {
        this.userPhotoURL = null;
      }
    });
    
    await this.loadSpeechHistory();
  }

  async loadSpeechHistory() {
    this.loading = true;
    this.error = null;

    try {
      // Wait for auth state to be ready
      const user = await new Promise<any>((resolve) => {
        const unsubscribe = this.firebaseService.auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (user) {
        const [history, summary] = await Promise.all([
          this.firebaseService.getSpeechHistory(user.uid),
          this.firebaseService.getSpeechHistorySummary(user.uid)
        ]);

        this.speechHistory = history;
        this.summary = summary;
      } else {
        // Clear state if no auth
        this.speechHistory = [];
        this.summary = null;
        this.error = 'No user is currently logged in.';
      }
    } catch (err) {
      this.error = 'Failed to load speech history.';
      console.error('Error loading speech history:', err);
    } finally {
      this.loading = false;
    }
  }

  getRatingColor(rating: string): string {
    switch (rating.toLowerCase()) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'fair': return 'warning';
      case 'poor': return 'danger';
      default: return 'medium';
    }
  }

  getRatingIcon(rating: string): string {
    switch (rating.toLowerCase()) {
      case 'excellent': return 'star';
      case 'good': return 'star_half';
      case 'fair': return 'star_outline';
      case 'poor': return 'close';
      default: return 'help';
    }
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➖';
      default: return '❓';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'danger';
      case 'stable': return 'medium';
      default: return 'medium';
    }
  }

  formatDuration(seconds: number): string {
    const totalSeconds = Math.floor(seconds || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getAverageRating(entry: SpeechHistoryEntry): number {
    const clarity = entry.feedback?.articulation_clarity || 0;
    const pace = entry.feedback?.speech_pace || 0;
    const tone = entry.feedback?.pitch_variation || 0;
    return (clarity + pace + tone) / 3;
  }

  formatNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0';
    }
    return value.toFixed(1);
  }

  formatInteger(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return Math.round(value).toString();
  }

  async openSession(entry: SpeechHistoryEntry) {
    const dialogRef = this.dialog.open(SessionDetailsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        entry: entry,
        loading: true,
        error: null
      }
    });

    // Load audio if needed
    if (!entry.audioData) {
      try {
        const user = this.firebaseService.auth.currentUser;
        if (user) {
          const nearest = await this.firebaseService.getNearestSpeechAudio(user.uid, entry.createdAt);
          if (nearest) {
            dialogRef.componentInstance.data = {
              entry: {
                ...entry,
                audioData: nearest.audioData,
                audioMimeType: nearest.audioMimeType || 'audio/webm'
              },
              loading: false,
              error: null
            };
          } else {
            dialogRef.componentInstance.data = {
              entry: entry,
              loading: false,
              error: null
            };
          }
        }
      } catch (e) {
        dialogRef.componentInstance.data = {
          entry: entry,
          loading: false,
          error: 'Failed to load audio for this session'
        };
      }
    } else {
      dialogRef.componentInstance.data = {
        entry: entry,
        loading: false,
        error: null
      };
    }
  }

  getProgressWidth(value: number | undefined | null): number {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, (value / 4) * 100));
  }

  getRatingColorSafe(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return 'medium';
    }
    if (value >= 3) return 'success';
    if (value >= 2) return 'warning';
    return 'danger';
  }
}
