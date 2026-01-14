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

  constructor(
    private firebaseService: FirebaseService,
    private badgeService: BadgeService,
    private gamificationService: GamificationService
  ) { }

  ngOnInit() {
    this.firebaseService.auth.onAuthStateChanged(async user => {
      if (user) {
        const profile = await this.firebaseService.getUserProfile(user.uid);
        this.firstName = profile.firstName || '';

        // Load speech count
        const speeches = await this.firebaseService.getSpeechHistory(user.uid);
        this.totalSpeeches = speeches.length;
      } else {
        this.firstName = '';
      }
    });

    // Subscribe to badge updates
    this.badgeService.userBadges$.subscribe(badges => {
      this.badgeProgress = this.badgeService.getBadgeProgress();
      this.recentBadges = badges
        .filter(badge => badge.isUnlocked && badge.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
        .slice(0, 3);
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
}