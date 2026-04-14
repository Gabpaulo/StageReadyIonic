import { Component, OnInit, Inject } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../../models/speech-history.model';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

// ─── Session Details Dialog ──────────────────────────────────────────────────
@Component({
  selector: 'app-session-details-dialog',
  template: `
    <h2 mat-dialog-title>Session Details</h2>
    <mat-dialog-content class="dialog-content">

      <div *ngIf="data.loading" style="text-align:center;padding:32px">
        <mat-spinner diameter="40" style="margin:0 auto 12px"></mat-spinner>
        <p>Loading session…</p>
      </div>

      <div *ngIf="data.error && !data.loading" style="padding:16px">
        <p style="color:#f44336">{{ data.error }}</p>
      </div>

      <ng-container *ngIf="!data.loading && !data.error">

        <!-- Grade Ring + Meta -->
        <div class="grade-row">
          <div class="grade-ring" [style.borderColor]="getGradeColor(data.entry.feedback?.overall)">
            <span class="grade-letter" [style.color]="getGradeColor(data.entry.feedback?.overall)">
              {{ getGradeLetter(data.entry.feedback?.overall) }}
            </span>
            <span class="grade-sub">{{ (data.entry.feedback?.overall ?? 0) | number:'1.1-1' }}/5</span>
          </div>
          <div class="grade-meta">
            <div class="grade-label" [style.color]="getGradeColor(data.entry.feedback?.overall)">
              {{ getGradeLabel(data.entry.feedback?.overall) }}
            </div>
            <div class="meta-chips">
              <span class="type-chip" *ngIf="data.entry.speechType">{{ data.entry.speechType | titlecase }}</span>
              <span class="meta-item">{{ formatDate(data.entry.createdAt) }}</span>
              <span class="meta-item" *ngIf="data.entry.duration">{{ formatDuration(data.entry.duration) }}</span>
              <span class="meta-item" *ngIf="data.entry.averagePace">{{ formatInteger(data.entry.averagePace) }} WPM</span>
              <span class="meta-item" *ngIf="data.entry.wordCount">{{ data.entry.wordCount }} words</span>
            </div>
          </div>
        </div>

        <!-- Transcript -->
        <div class="section-card">
          <div class="section-title">📄 Transcript</div>
          <p class="transcript-text">{{ data.entry.transcript }}</p>
        </div>

        <!-- Audio Playback -->
        <div *ngIf="data.entry.audioUrl || data.entry.audioData" class="section-card">
          <div class="section-title">▶ Playback</div>
          <audio *ngIf="data.entry.audioUrl" [src]="data.entry.audioUrl" controls style="width:100%"></audio>
          <audio *ngIf="!data.entry.audioUrl && data.entry.audioData"
                 [src]="'data:' + (data.entry.audioMimeType || 'audio/webm') + ';base64,' + data.entry.audioData"
                 controls style="width:100%"></audio>
        </div>

        <!-- Score Breakdown -->
        <div class="section-card" *ngIf="data.entry.feedback">
          <div class="section-title">📊 Score Breakdown</div>
          <div class="breakdown-item" *ngFor="let item of getScoreItems(data.entry)">
            <div class="breakdown-row">
              <span class="breakdown-label">{{ item.label }}</span>
              <span class="breakdown-score" [style.color]="getGradeColor(item.value)">{{ item.value | number:'1.1-1' }}/5</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="(item.value / 5) * 100" [style.background]="getScoreBarColor(item.value)"></div>
            </div>
            <p class="breakdown-feedback" *ngIf="item.feedback">{{ item.feedback }}</p>
          </div>
        </div>

        <!-- Coach Report -->
        <div class="section-card coach-card" *ngIf="data.entry.feedback?.overall_assessment">
          <div class="section-title">🎓 Coach Assessment</div>
          <p class="assessment-text">{{ data.entry.feedback?.overall_assessment }}</p>
        </div>

        <div class="section-card" *ngIf="(data.entry.feedback?.strengths?.length ?? 0) > 0">
          <div class="section-title strengths-title">✅ Strengths</div>
          <ul class="coach-list">
            <li *ngFor="let s of data.entry.feedback?.strengths">{{ s }}</li>
          </ul>
        </div>

        <div class="section-card" *ngIf="(data.entry.feedback?.improvements?.length ?? 0) > 0">
          <div class="section-title improvements-title">📈 Areas to Improve</div>
          <ul class="coach-list">
            <li *ngFor="let im of data.entry.feedback?.improvements">{{ im }}</li>
          </ul>
        </div>

        <div class="section-card closing-card" *ngIf="data.entry.feedback?.closing_message">
          <p class="closing-text">💬 {{ data.entry.feedback?.closing_message }}</p>
        </div>

      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { max-height: 78vh; overflow-y: auto; padding: 0 24px 16px; }

    /* Grade row */
    .grade-row { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; padding: 18px; background: #1e2c3a; border-radius: 12px; border: 1px solid #2b3b4c; }
    .grade-ring { width: 76px; height: 76px; min-width: 76px; border-radius: 50%; border: 4px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a2734; }
    .grade-letter { font-size: 2rem; font-weight: 900; line-height: 1; }
    .grade-sub { font-size: .6rem; font-weight: 700; color: #9bb2c8; margin-top: 1px; }
    .grade-meta { flex: 1; }
    .grade-label { font-size: 1.1rem; font-weight: 800; margin-bottom: 8px; }
    .meta-chips { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
    .type-chip { font-size: .7rem; font-weight: 700; color: #00bcd4; background: rgba(0,188,212,.12); border: 1px solid rgba(0,188,212,.35); border-radius: 20px; padding: 2px 10px; text-transform: uppercase; }
    .meta-item { font-size: .8rem; color: #9bb2c8; }

    /* Section cards */
    .section-card { background: #1e2c3a; border: 1px solid #2b3b4c; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
    .section-title { font-size: .82rem; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: #9bb2c8; margin-bottom: 12px; }
    .strengths-title { color: #4caf50; }
    .improvements-title { color: #22a7f0; }

    /* Score breakdown */
    .breakdown-item { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
    .breakdown-item:last-child { border-bottom: none; }
    .breakdown-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .breakdown-label { font-size: .9rem; font-weight: 600; color: #e8f1f9; }
    .breakdown-score { font-size: .85rem; font-weight: 800; }
    .bar-track { height: 5px; border-radius: 3px; background: #1a2734; overflow: hidden; margin-bottom: 5px; }
    .bar-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
    .breakdown-feedback { font-size: .8rem; color: #9bb2c8; line-height: 1.5; margin: 0; }

    /* Coach report */
    .coach-card { background: rgba(34,167,240,.05); border-color: rgba(34,167,240,.2); }
    .assessment-text { font-size: .9rem; color: #e8f1f9; line-height: 1.65; margin: 0; padding: 10px 12px; background: rgba(34,167,240,.06); border-left: 3px solid #9c27b0; border-radius: 6px; }
    .coach-list { margin: 0; padding: 0 0 0 4px; list-style: none; }
    .coach-list li { font-size: .88rem; color: #e8f1f9; padding: 6px 0 6px 14px; border-bottom: 1px solid rgba(255,255,255,.04); position: relative; }
    .coach-list li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; border-radius: 50%; background: #22a7f0; }
    .coach-list li:last-child { border-bottom: none; }
    .closing-card { background: rgba(156,39,176,.07); border-color: rgba(156,39,176,.25); }
    .closing-text { font-size: .88rem; color: #e8f1f9; line-height: 1.6; margin: 0; font-style: italic; }

    /* Transcript */
    .transcript-text { font-size: .9rem; color: #e8f1f9; line-height: 1.65; margin: 0; white-space: pre-wrap; }
  `],
  standalone: false
})
export class SessionDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SessionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

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

  getScoreItems(entry: SpeechHistoryEntry): Array<{ label: string; value: number; feedback: string }> {
    if (!entry.feedback) return [];
    const f = entry.feedback;
    return [
      { label: 'Speech Pace',       value: f.speech_pace,          feedback: f.pace_feedback     || '' },
      { label: 'Pausing & Fluency', value: f.pausing_fluency,      feedback: f.pausing_feedback  || '' },
      { label: 'Volume Control',    value: f.loud_control,         feedback: f.volume_feedback   || '' },
      { label: 'Pitch Variation',   value: f.pitch_variation,      feedback: f.pitch_feedback    || '' },
      { label: 'Articulation',      value: f.articulation_clarity, feedback: f.clarity_feedback  || '' },
      { label: 'Expressiveness',    value: f.expressive_emph,      feedback: f.tone_feedback     || '' },
      { label: 'Filler Words',      value: f.filler_words_score,   feedback: f.filler_feedback   || '' },
    ];
  }

  getScoreBarColor(value: number): string {
    if (value >= 4) return '#4caf50';
    if (value >= 3) return '#22a7f0';
    if (value >= 2) return '#ff9800';
    return '#f44336';
  }

  formatDuration(seconds: number): string {
    const total = Math.floor(seconds || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  formatInteger(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Math.round(value).toString();
  }
}

// ─── Web History List Component ───────────────────────────────────────────────
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
  readonly Math = Math;

  constructor(
    private firebaseService: FirebaseService,
    private dialog: MatDialog
  ) { }

  async ngOnInit() {
    this.firebaseService.auth.onAuthStateChanged(user => {
      this.userPhotoURL = user?.photoURL || null;
    });
    await this.loadSpeechHistory();
  }

  async loadSpeechHistory() {
    this.loading = true;
    this.error = null;
    try {
      const user = await new Promise<any>((resolve) => {
        const unsubscribe = this.firebaseService.auth.onAuthStateChanged((u) => {
          unsubscribe();
          resolve(u);
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

  // ── Grade helpers ────────────────────────────────────────────────────────
  getGradeLetter(overall: number | undefined): string {
    const v = overall ?? 0;
    if (v >= 4.5) return 'A';
    if (v >= 3.5) return 'B';
    if (v >= 2.5) return 'C';
    if (v >= 1.5) return 'D';
    return 'F';
  }

  getGradeColor(overall: number | undefined): string {
    const v = overall ?? 0;
    if (v >= 4.5) return '#4caf50';
    if (v >= 3.5) return '#8bc34a';
    if (v >= 2.5) return '#22a7f0';
    if (v >= 1.5) return '#ff9800';
    return '#f44336';
  }

  // ── Display ──────────────────────────────────────────────────────────────
  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➖';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'improving': return 'success';
      case 'declining': return 'danger';
      default: return 'medium';
    }
  }

  formatDuration(seconds: number): string {
    const total = Math.floor(seconds || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  formatInteger(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Math.round(value).toString();
  }

  formatNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) return '0.0';
    return value.toFixed(1);
  }

  getProgressWidth(value: number | undefined | null): number {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Math.max(0, Math.min(100, (value / 5) * 100));
  }

  // ── Progress Trend Analytics ─────────────────────────────────────────────

  /** Sessions sorted oldest→newest for the chart (capped at last 20) */
  get chartSessions(): SpeechHistoryEntry[] {
    return [...this.speechHistory]
      .filter(e => e.feedback?.overall != null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-20);
  }

  /** SVG polyline points for a given dimension key (overall or feedback key) */
  getChartPoints(dim: 'overall' | 'speech_pace' | 'pausing_fluency' | 'loud_control' | 'pitch_variation' | 'articulation_clarity' | 'expressive_emph' | 'filler_words_score'): string {
    const sessions = this.chartSessions;
    if (sessions.length < 2) return '';
    const W = 560, H = 120, padL = 4, padR = 4, padT = 8, padB = 8;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    return sessions.map((s, i) => {
      const val = dim === 'overall' ? (s.feedback?.overall ?? 0) : ((s.feedback as any)?.[dim] ?? 0);
      const x = padL + (i / (sessions.length - 1)) * plotW;
      const y = padT + plotH - ((val / 5) * plotH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  /** Y-axis grid line Y position for a given score value (0-5) */
  gridY(score: number): number {
    const H = 120, padT = 8, padB = 8;
    return padT + (H - padT - padB) - ((score / 5) * (H - padT - padB));
  }

  /** Average score for a dimension across all chart sessions */
  dimAvg(dim: string): number {
    const sessions = this.chartSessions;
    if (!sessions.length) return 0;
    const vals = sessions.map(s => (s.feedback as any)?.[dim] ?? 0).filter((v: number) => v > 0);
    return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
  }

  /** Trend direction for a dimension (+1 improving, -1 declining, 0 stable) */
  dimTrend(dim: string): number {
    const sessions = this.chartSessions;
    if (sessions.length < 4) return 0;
    const half = Math.floor(sessions.length / 2);
    const first = sessions.slice(0, half);
    const last  = sessions.slice(-half);
    const avg   = (arr: SpeechHistoryEntry[]) => arr.reduce((a, s) => a + ((s.feedback as any)?.[dim] ?? 0), 0) / arr.length;
    const diff  = avg(last) - avg(first);
    if (diff > 0.15) return 1;
    if (diff < -0.15) return -1;
    return 0;
  }

  trendIcon(dir: number): string {
    if (dir > 0) return '↑';
    if (dir < 0) return '↓';
    return '→';
  }

  trendColor(dir: number): string {
    if (dir > 0) return '#4caf50';
    if (dir < 0) return '#f44336';
    return '#9bb2c8';
  }

  /** X position label for a session index */
  chartXLabel(i: number): string {
    const s = this.chartSessions[i];
    if (!s) return '';
    const d = new Date(s.createdAt);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  readonly DIMS: Array<{ key: string; label: string; color: string }> = [
    { key: 'speech_pace',          label: 'Pace',          color: '#22a7f0' },
    { key: 'pausing_fluency',      label: 'Pausing',       color: '#9c27b0' },
    { key: 'loud_control',         label: 'Volume',        color: '#ff9800' },
    { key: 'pitch_variation',      label: 'Pitch',         color: '#4caf50' },
    { key: 'articulation_clarity', label: 'Clarity',       color: '#00bcd4' },
    { key: 'expressive_emph',      label: 'Expression',    color: '#e91e63' },
    { key: 'filler_words_score',   label: 'Filler Words',  color: '#795548' },
  ];

  // ── Session open ─────────────────────────────────────────────────────────
  async openSession(entry: SpeechHistoryEntry) {
    const dialogRef = this.dialog.open(SessionDetailsDialogComponent, {
      width: '700px',
      maxWidth: '92vw',
      maxHeight: '90vh',
      panelClass: 'session-dialog',
      data: { entry, loading: true, error: null }
    });

    if (!entry.audioData && !entry.audioUrl) {
      try {
        const user = this.firebaseService.auth.currentUser;
        if (user) {
          const nearest = await this.firebaseService.getNearestSpeechAudio(user.uid, entry.createdAt);
          dialogRef.componentInstance.data = {
            entry: nearest
              ? { ...entry, audioUrl: nearest.audioUrl, audioData: nearest.audioData, audioMimeType: nearest.audioMimeType || 'audio/webm' }
              : entry,
            loading: false,
            error: null
          };
        } else {
          dialogRef.componentInstance.data = { entry, loading: false, error: null };
        }
      } catch (e) {
        dialogRef.componentInstance.data = { entry, loading: false, error: 'Failed to load audio for this session' };
      }
    } else {
      dialogRef.componentInstance.data = { entry, loading: false, error: null };
    }
  }
}
