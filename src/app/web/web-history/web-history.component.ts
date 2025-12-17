import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../../models/speech-history.model';
import { MatDialog } from '@angular/material/dialog';

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
  selectedEntry: SpeechHistoryEntry | null = null;
  isModalOpen = false;
  modalLoading = false;
  modalError: string | null = null;
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
    this.modalError = null;
    this.modalLoading = true;
    this.selectedEntry = entry;
    this.isModalOpen = true;

    // If no embedded audio, try fetch from speeches collection nearest by time
    if (!entry.audioData) {
      try {
        const user = this.firebaseService.auth.currentUser;
        if (user) {
          const nearest = await this.firebaseService.getNearestSpeechAudio(user.uid, entry.createdAt);
          if (nearest) {
            this.selectedEntry = {
              ...entry,
              audioData: nearest.audioData,
              audioMimeType: nearest.audioMimeType || 'audio/webm'
            };
          }
        }
      } catch (e) {
        this.modalError = 'Failed to load audio for this session';
      }
    }

    this.modalLoading = false;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedEntry = null;
    this.modalLoading = false;
    this.modalError = null;
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
