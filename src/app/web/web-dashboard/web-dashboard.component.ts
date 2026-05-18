import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { BadgeService } from '../../services/badge.service';
import { GamificationService } from '../../services/gamification.service';
import { AdaptiveLearningService, WeeklyPlan, RecommendedScript } from '../../services/adaptive-learning.service';
import { Badge } from '../../models/badge.model';
import { XP_PER_LEVEL } from '../../models/gamification.model';

@Component({
  selector: 'app-web-dashboard',
  templateUrl: './web-dashboard.component.html',
  styleUrls: ['./web-dashboard.component.scss'],
  standalone: false
})
export class WebDashboardComponent implements OnInit {
  firstName: string = '';
  userPhotoURL: string | null = null;
  userId: string = '';
  recentBadges: Badge[] = [];
  badgeProgress: { total: number; unlocked: number; percentage: number } = { total: 0, unlocked: 0, percentage: 0 };

  // Gamification properties
  userLevel: number = 1;
  currentXP: number = 0;
  nextLevelXP: number = XP_PER_LEVEL;
  xpPercentage: number = 0;
  currentStreak: number = 0;
  dailyChallenge: string = 'Complete a 2-minute practice speech';
  dailyChallengeXP: number = 25;
  motivationalQuote: string = 'The way to get started is to quit talking and begin doing.';
  quoteAuthor: string = 'Walt Disney';

  totalSpeeches: number = 0;

  // Weekly plan
  weeklyPlan: WeeklyPlan | null = null;
  planLoading = false;

  // Upcoming badge preview
  upcomingBadge: Badge | null = null;
  upcomingBadgeProgress: number = 0;

  // Tip of the day
  tipOfTheDay: string = '';
  tipCategory: string = '';

  private quotes = [
    { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
    { text: 'There are no secrets to success. It is the result of preparation, hard work, and learning from failure.', author: 'Colin Powell' },
    { text: 'Your limitation—it\'s only your imagination.', author: 'Unknown' },
    { text: 'Great things never come from comfort zones.', author: 'Unknown' },
    { text: 'Success doesn\'t just find you. You have to go out and get it.', author: 'Unknown' },
    { text: 'The harder you work for something, the greater you\'ll feel when you achieve it.', author: 'Unknown' },
    { text: 'Dream bigger. Do bigger.', author: 'Unknown' },
    { text: 'Don\'t stop when you\'re tired. Stop when you\'re done.', author: 'Unknown' }
  ];

  private tips = [
    { tip: 'Practice in front of a mirror to observe your body language and facial expressions.', category: 'Body Language' },
    { tip: 'Record yourself speaking and listen back to identify filler words like "um" and "uh".', category: 'Filler Words' },
    { tip: 'Pause for 2-3 seconds after making an important point to let it sink in.', category: 'Pacing' },
    { tip: 'Vary your pitch and tone to keep your audience engaged and emphasize key points.', category: 'Vocal Variety' },
    { tip: 'Make eye contact with different sections of your audience every few seconds.', category: 'Eye Contact' },
    { tip: 'Start with a hook - a surprising fact, question, or story to grab attention.', category: 'Opening' },
    { tip: 'Use the "rule of three" - group ideas in threes for better retention.', category: 'Structure' },
    { tip: 'Practice deep breathing before speaking to calm nerves and project confidence.', category: 'Confidence' },
    { tip: 'Speak slightly slower than feels natural - nervousness often speeds us up.', category: 'Pacing' },
    { tip: 'End with a clear call to action or memorable takeaway for your audience.', category: 'Closing' },
    { tip: 'Use gestures purposefully to reinforce your message, not randomly.', category: 'Body Language' },
    { tip: 'Practice your speech standing up, even if you\'ll deliver it seated.', category: 'Practice' },
    { tip: 'Know your first and last sentences by heart - they\'re the most important.', category: 'Preparation' },
    { tip: 'Smile genuinely when appropriate - it makes you more likeable and relatable.', category: 'Connection' }
  ];

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private badgeService: BadgeService,
    private gamificationService: GamificationService,
    private adaptiveLearning: AdaptiveLearningService
  ) { }

  ngOnInit() {
    this.firebaseService.auth.onAuthStateChanged(async user => {
      if (user) {
        this.userId = user.uid;
        const profile = await this.firebaseService.getUserProfile(user.uid);
        this.firstName = profile.firstName || '';
        this.userPhotoURL = user.photoURL || null;

        // Load actual speech count
        const summary = await this.firebaseService.getSpeechHistorySummary(user.uid);
        this.totalSpeeches = summary.totalSessions;

        // Load weekly AI plan
        this.planLoading = true;
        try {
          this.weeklyPlan = await this.adaptiveLearning.generatePlan(user.uid);
        } catch { /* silently skip */ } finally {
          this.planLoading = false;
        }
      } else {
        this.userId = '';
        this.firstName = '';
        this.userPhotoURL = null;
      }
    });

    // Subscribe to badge updates
    this.badgeService.userBadges$.subscribe(badges => {
      this.badgeProgress = this.badgeService.getBadgeProgress();
      this.recentBadges = badges
        .filter(badge => badge.isUnlocked && badge.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
        .slice(0, 3);

      // Find upcoming badge (closest to completion)
      this.findUpcomingBadge(badges);
    });

    // Subscribe to gamification updates
    this.gamificationService.userGamification$.subscribe(gamification => {
      if (gamification) {
        this.userLevel = gamification.level;
        this.currentXP = gamification.currentXP;
        this.nextLevelXP = XP_PER_LEVEL;
        this.xpPercentage = (this.currentXP / this.nextLevelXP) * 100;
        this.currentStreak = gamification.currentStreak;
        this.dailyChallenge = gamification.dailyChallenge.challenge;
        this.dailyChallengeXP = gamification.dailyChallenge.xpReward;
      }
    });

    // Set random motivational quote and tip of the day
    this.setRandomQuote();
    this.setTipOfTheDay();
  }

  private setRandomQuote() {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.motivationalQuote = this.quotes[randomIndex].text;
    this.quoteAuthor = this.quotes[randomIndex].author;
  }

  private setTipOfTheDay() {
    // Use date-based index so tip changes daily but is consistent throughout the day
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const tipIndex = dayOfYear % this.tips.length;
    this.tipOfTheDay = this.tips[tipIndex].tip;
    this.tipCategory = this.tips[tipIndex].category;
  }

  private findUpcomingBadge(badges: Badge[]) {
    // Find locked badges sorted by progress percentage (highest first)
    const lockedBadges = badges
      .filter(badge => !badge.isUnlocked && badge.maxProgress && badge.maxProgress > 0)
      .map(badge => ({
        badge,
        progressPercent: ((badge.progress || 0) / badge.maxProgress!) * 100
      }))
      .sort((a, b) => b.progressPercent - a.progressPercent);

    if (lockedBadges.length > 0) {
      this.upcomingBadge = lockedBadges[0].badge;
      this.upcomingBadgeProgress = lockedBadges[0].progressPercent;
    } else {
      this.upcomingBadge = null;
      this.upcomingBadgeProgress = 0;
    }
  }

  readonly Math = Math;

  get sessionsToUnlock(): number {
    return Math.max(0, 5 - (this.weeklyPlan?.sessionCount ?? 0));
  }

  humanLabel(dim: string): string {
    return this.adaptiveLearning.humanLabel(dim as any);
  }

  getMetricItems(): Array<{ label: string; value: number }> {
    if (!this.weeklyPlan?.avgScores) return [];
    const order: Array<[string, string]> = [
      ['speech_pace',          'Speech Pace'],
      ['pausing_fluency',      'Pausing & Fluency'],
      ['loud_control',         'Volume Control'],
      ['pitch_variation',      'Pitch Variation'],
      ['articulation_clarity', 'Articulation & Clarity'],
      ['expressive_emph',      'Expressiveness'],
      ['filler_words_score',   'Filler Words'],
    ];
    const scores = this.weeklyPlan!.avgScores as Record<string, number>;
    return order.map(([key, label]) => ({
      label,
      value: +(scores[key] ?? 0).toFixed(2)
    }));
  }

  getScoreColor(v: number): string {
    if (v >= 4) return '#4caf50';
    if (v >= 3) return '#22a7f0';
    if (v >= 2) return '#ff9800';
    return '#f44336';
  }

  navigateToScript(rec: RecommendedScript) {
    this.router.navigate(['/web/practice-mode'], { state: { recommendation: rec } });
  }

  getBadgeIconPath(icon: string): string {
    if (!icon) {
      return '/assets/badges/first-step.svg';
    }
    // Ensure path starts with / for absolute path from root
    if (icon.startsWith('/')) {
      return icon;
    }
    return '/' + icon;
  }

  onImageError(event: any): void {
    // Log the error for debugging
    console.error('Badge icon failed to load:', event.target.src);
    // Try alternative path formats
    const currentSrc = event.target.src;
    const url = new URL(currentSrc);
    const path = url.pathname;
    
    // If it has leading slash, try without
    if (path.startsWith('/assets/')) {
      event.target.src = path.substring(1);
    } 
    // If it doesn't have leading slash, try with
    else if (path.startsWith('assets/')) {
      event.target.src = '/' + path;
    }
  }
}


