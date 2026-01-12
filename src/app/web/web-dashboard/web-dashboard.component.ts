import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { BadgeService } from '../../services/badge.service';
import { GamificationService } from '../../services/gamification.service';
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
        this.userPhotoURL = user.photoURL || null;
      } else {
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

    // Set random motivational quote
    this.setRandomQuote();
  }

  private setRandomQuote() {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.motivationalQuote = this.quotes[randomIndex].text;
    this.quoteAuthor = this.quotes[randomIndex].author;
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


