import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

const LEVEL_MAP: Record<string, number> = { low: 1, medium: 2, high: 3 };

@Component({
  selector: 'app-web-admin',
  templateUrl: './web-admin.component.html',
  styleUrls: ['./web-admin.component.scss'],
  standalone: false
})
export class WebAdminComponent implements OnInit {

  readonly Math = Math;
  loading  = true;
  error    = '';
  isAdmin  = false;

  sessions: any[] = [];

  // Stats
  totalSessions   = 0;
  uniqueUsers     = 0;
  byCategory: Record<string, number> = {};
  byDifficulty: Record<string, number> = {};

  // Table pagination
  pageSize    = 20;
  currentPage = 0;

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.firebaseService.auth.currentUser;
    if (!user) { this.router.navigate(['/web/login']); return; }

    // Check admin flag in Firestore profile
    const profile = await this.firebaseService.getUserProfile(user.uid);
    if (!profile?.isAdmin) {
      this.router.navigate(['/web/dashboard']);
      return;
    }

    this.isAdmin = true;
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    this.error   = '';
    try {
      this.sessions = await this.firebaseService.getAllPracticeSessions();
      this.computeStats();
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to load data';
    } finally {
      this.loading = false;
    }
  }

  private computeStats() {
    this.totalSessions = this.sessions.length;
    this.uniqueUsers   = new Set(this.sessions.map(s => s.userId)).size;

    this.byCategory   = {};
    this.byDifficulty = {};
    for (const s of this.sessions) {
      this.byCategory[s.scriptCategory]   = (this.byCategory[s.scriptCategory]   || 0) + 1;
      this.byDifficulty[s.scriptDifficulty] = (this.byDifficulty[s.scriptDifficulty] || 0) + 1;
    }
  }

  get pagedSessions() {
    const start = this.currentPage * this.pageSize;
    return this.sessions.slice(start, start + this.pageSize);
  }

  get totalPages() { return Math.ceil(this.sessions.length / this.pageSize); }
  prevPage() { if (this.currentPage > 0) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages - 1) this.currentPage++; }

  formatDate(ts: any): string {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getScore(obj: any, key: string): number {
    return obj?.[key] ?? 0;
  }

  signed(v: number): string {
    return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
  }

  improvementColor(v: number): string {
    if (v > 0.3)  return '#4caf50';
    if (v < -0.3) return '#f44336';
    return '#9bb2c8';
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  exportCSV() {
    const headers = [
      'user_id', 'timestamp',
      'script_id', 'script_title', 'script_category', 'script_difficulty',
      'script_target_pausing', 'script_target_pitch',
      'script_target_filler', 'script_target_articulation',
      // Pre-session scores (running averages before this session)
      'pre_speech_pace', 'pre_pausing_fluency', 'pre_loud_control',
      'pre_pitch_variation', 'pre_articulation_clarity',
      'pre_expressive_emph', 'pre_filler_words', 'pre_session_count',
      // Post-session scores (this session result)
      'post_speech_pace', 'post_pausing_fluency', 'post_loud_control',
      'post_pitch_variation', 'post_articulation_clarity',
      'post_expressive_emph', 'post_filler_words', 'post_overall',
      // Improvement = post - pre
      'improvement_speech_pace', 'improvement_pausing_fluency', 'improvement_loud_control',
      'improvement_pitch_variation', 'improvement_articulation_clarity',
      'improvement_expressive_emph', 'improvement_filler_words', 'improvement_overall',
      // Session metadata
      'word_accuracy', 'actual_wpm', 'duration_sec', 'filler_count'
    ];

    // Anonymise user IDs (map uid → user_1, user_2, etc.)
    const userMap: Record<string, string> = {};
    let userCounter = 1;
    for (const s of this.sessions) {
      if (!userMap[s.userId]) userMap[s.userId] = `user_${userCounter++}`;
    }

    const rows = this.sessions.map(s => {
      const pre  = s.preScores  ?? {};
      const post = s.postScores ?? {};
      const imp  = s.improvement ?? {};
      const ts   = s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : '';

      return [
        userMap[s.userId] ?? s.userId,
        ts,
        s.scriptId        ?? '',
        `"${(s.scriptTitle ?? '').replace(/"/g, '""')}"`,
        s.scriptCategory  ?? '',
        s.scriptDifficulty ?? '',
        LEVEL_MAP[s.scriptTargetPausing]      ?? '',
        LEVEL_MAP[s.scriptTargetPitch]        ?? '',
        LEVEL_MAP[s.scriptTargetFiller]       ?? '',
        LEVEL_MAP[s.scriptTargetArticulation] ?? '',
        // pre
        pre.speech_pace           ?? '',
        pre.pausing_fluency       ?? '',
        pre.loud_control          ?? '',
        pre.pitch_variation       ?? '',
        pre.articulation_clarity  ?? '',
        pre.expressive_emph       ?? '',
        pre.filler_words_score    ?? '',
        s.preSessionCount         ?? '',
        // post
        post.speech_pace          ?? '',
        post.pausing_fluency      ?? '',
        post.loud_control         ?? '',
        post.pitch_variation      ?? '',
        post.articulation_clarity ?? '',
        post.expressive_emph      ?? '',
        post.filler_words_score   ?? '',
        post.overall              ?? '',
        // improvement
        imp.speech_pace           ?? '',
        imp.pausing_fluency       ?? '',
        imp.loud_control          ?? '',
        imp.pitch_variation       ?? '',
        imp.articulation_clarity  ?? '',
        imp.expressive_emph       ?? '',
        imp.filler_words_score    ?? '',
        imp.overall               ?? '',
        // metadata
        s.wordAccuracy  ?? '',
        s.actualWpm     ?? '',
        s.duration      ?? '',
        s.fillerCount   ?? ''
      ].join(',');
    });

    const csv     = [headers.join(','), ...rows].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const link    = document.createElement('a');
    link.href     = url;
    link.download = `practice_sessions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
