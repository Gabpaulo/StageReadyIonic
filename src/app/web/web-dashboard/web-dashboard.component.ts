import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { BadgeService } from '../../services/badge.service';
import { Badge } from '../../models/badge.model';

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

  constructor(
    private firebaseService: FirebaseService,
    private badgeService: BadgeService
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


