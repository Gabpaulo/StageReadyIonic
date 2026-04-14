import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../../models/speech-history.model';

@Component({
  selector: 'app-speech-history',
  templateUrl: './speech-history.page.html',
  styleUrls: ['./speech-history.page.scss'],
  standalone: false
})
export class SpeechHistoryPage implements OnInit {
  speechHistory: SpeechHistoryEntry[] = [];
  summary: SpeechHistorySummary | null = null;
  loading = true;
  error: string | null = null;
  selectedEntry: SpeechHistoryEntry | null = null;
  isModalOpen = false;
  modalLoading = false;
  modalError: string | null = null;

  constructor(private firebaseService: FirebaseService) { }

  async ngOnInit() {
    await this.loadSpeechHistory();
  }

  ionViewWillEnter() {
    this.loadSpeechHistory();
  }

  async loadSpeechHistory() {
    this.loading = true;
    this.error = null;

    try {
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

  // ── Grade helpers ────────────────────────────────────────────────────────────
  getGradeLetter(overall: number | undefined): string {
    const v = overall ?? 0;
    if (v >= 4.5) return 'A';
    if (v >= 3.5) return 'B';
    if (v >= 2.5) return 'C';
    if (v >= 1.5) return 'D';
    return 'F';
  }

  getGradeLabel(overall: number | undefined): string {
    const v = overall ?? 0;
    if (v >= 4.5) return 'Excellent';
    if (v >= 3.5) return 'Good';
    if (v >= 2.5) return 'Fair';
    if (v >= 1.5) return 'Needs Work';
    return 'Poor';
  }

  getGradeColor(overall: number | undefined): string {
    const v = overall ?? 0;
    if (v >= 4.5) return '#4caf50';
    if (v >= 3.5) return '#8bc34a';
    if (v >= 2.5) return '#22a7f0';
    if (v >= 1.5) return '#ff9800';
    return '#f44336';
  }

  // ── Score breakdown ──────────────────────────────────────────────────────────
  getScoreItems(entry: SpeechHistoryEntry): Array<{ label: string; value: number; feedback: string; icon: string }> {
    if (!entry.feedback) return [];
    const f = entry.feedback;
    return [
      { label: 'Speech Pace',       value: f.speech_pace,          feedback: f.pace_feedback     || '', icon: 'speedometer-outline' },
      { label: 'Pausing & Fluency', value: f.pausing_fluency,      feedback: f.pausing_feedback  || '', icon: 'pause-circle-outline' },
      { label: 'Volume Control',    value: f.loud_control,         feedback: f.volume_feedback   || '', icon: 'volume-high-outline' },
      { label: 'Pitch Variation',   value: f.pitch_variation,      feedback: f.pitch_feedback    || '', icon: 'musical-notes-outline' },
      { label: 'Articulation',      value: f.articulation_clarity, feedback: f.clarity_feedback  || '', icon: 'mic-outline' },
      { label: 'Expressiveness',    value: f.expressive_emph,      feedback: f.tone_feedback     || '', icon: 'color-palette-outline' },
      { label: 'Filler Words',      value: f.filler_words_score,   feedback: f.filler_feedback   || '', icon: 'chatbubble-ellipses-outline' },
    ];
  }

  getScoreColor(value: number): string {
    if (value >= 4) return 'success';
    if (value >= 3) return 'primary';
    if (value >= 2) return 'warning';
    return 'danger';
  }

  getProgressWidth(value: number | undefined | null): number {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Math.max(0, Math.min(100, (value / 5) * 100));
  }

  // ── Trend helpers ─────────────────────────────────────────────────────────────
  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'danger';
      default: return 'medium';
    }
  }

  // ── Modal ────────────────────────────────────────────────────────────────────
  async openSession(entry: SpeechHistoryEntry) {
    this.modalError = null;
    this.modalLoading = true;
    this.selectedEntry = entry;
    this.isModalOpen = true;

    if (!entry.audioData && !entry.audioUrl) {
      try {
        const user = this.firebaseService.auth.currentUser;
        if (user) {
          const nearest = await this.firebaseService.getNearestSpeechAudio(user.uid, entry.createdAt);
          if (nearest) {
            this.selectedEntry = {
              ...entry,
              audioUrl: nearest.audioUrl,
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

  // ── Formatting ────────────────────────────────────────────────────────────────
  formatDuration(seconds: number): string {
    const total = Math.floor(seconds || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  formatNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0.0';
    return value.toFixed(1);
  }

  formatInteger(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Math.round(value).toString();
  }
}
