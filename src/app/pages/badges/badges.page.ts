import { Component, OnInit } from '@angular/core';
import { BadgeService } from '../../services/badge.service';
import { Badge } from '../../models/badge.model';

@Component({
  selector: 'app-badges',
  templateUrl: './badges.page.html',
  styleUrls: ['./badges.page.scss'],
  standalone: false
})
export class BadgesPage implements OnInit {
  badges: Badge[] = [];
  badgeProgress: { total: number; unlocked: number; percentage: number } = { total: 0, unlocked: 0, percentage: 0 };

  constructor(private badgeService: BadgeService) { }

  ngOnInit() {
    this.badgeService.userBadges$.subscribe(badges => {
      this.badges = badges;
      this.badgeProgress = this.badgeService.getBadgeProgress();
    });
  }

  get unlockedBadges(): Badge[] {
    return this.badges.filter(badge => badge.isUnlocked);
  }

  get recentBadges(): Badge[] {
    return this.unlockedBadges
      .filter(badge => badge.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 3);
  }

  getBadgeIconPath(icon: string): string {
    if (!icon) {
      return 'assets/badges/first-step.svg';
    }
    // Ensure path starts with / for absolute path from root
    if (icon.startsWith('/')) {
      return icon;
    }
    return '/' + icon;
  }

  onImageError(event: any): void {
    console.error('Badge icon failed to load:', event.target.src);
    // Fallback to default badge icon
    event.target.src = '/assets/badges/first-step.svg';
  }
}
