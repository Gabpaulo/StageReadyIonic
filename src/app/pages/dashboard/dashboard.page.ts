import { Component, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/services/firebase.service';
import { BadgeService } from 'src/app/services/badge.service';
import { Badge } from 'src/app/models/badge.model';

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

  constructor(
    private firebaseService: FirebaseService,
    private badgeService: BadgeService
  ) { }

  ngOnInit() {
    this.firebaseService.auth.onAuthStateChanged(async user => {
      if (user) {
        const profile = await this.firebaseService.getUserProfile(user.uid);
        this.firstName = profile.firstName || '';
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
  }
}