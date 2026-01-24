import { Component, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/services/firebase.service';
import { BadgeService } from 'src/app/services/badge.service';
import { GamificationService } from 'src/app/services/gamification.service';
import { Badge } from 'src/app/models/badge.model';
import { XP_PER_LEVEL } from 'src/app/models/gamification.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  firstName: string = '';
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
  totalSpeeches: number = 0;

  // Upcoming badge preview
  upcomingBadge: Badge | null = null;
  upcomingBadgeProgress: number = 0;

  // Tip of the day
  tipOfTheDay: string = '';
  tipCategory: string = '';

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
    private firebaseService: FirebaseService,
    private badgeService: BadgeService,
    private gamificationService: GamificationService
  ) { }

  ngOnInit() {
    this.firebaseService.auth.onAuthStateChanged(async user => {
      if (user) {
        this.userId = user.uid;
        const profile = await this.firebaseService.getUserProfile(user.uid);
        this.firstName = profile.firstName || '';

        // Load speech count
        const speeches = await this.firebaseService.getSpeechHistory(user.uid);
        this.totalSpeeches = speeches.length;
      } else {
        this.firstName = '';
        this.userId = '';
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

    // Set tip of the day
    this.setTipOfTheDay();

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
  }

  getBadgeIconPath(icon: string): string {
    if (!icon) {
      return 'assets/badges/first-step.svg';
    }
    if (icon.startsWith('/')) {
      return icon;
    }
    return '/' + icon;
  }

  onImageError(event: any): void {
    console.error('Badge icon failed to load:', event.target.src);
    event.target.src = '/assets/badges/first-step.svg';
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
}