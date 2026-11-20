import { Component, OnInit } from '@angular/core';
import { BadgeService } from '../../services/badge.service';
import { Observable } from 'rxjs';
import { Badge } from '../../models/badge.model';

@Component({
  selector: 'app-web-badges',
  templateUrl: './web-badges.component.html',
  styleUrls: ['./web-badges.component.scss'],
  standalone: false
})
export class WebBadgesComponent implements OnInit {
  badges$!: Observable<Badge[]>;
  constructor(private badgeService: BadgeService) {}
  ngOnInit(): void {
    this.badges$ = this.badgeService.userBadges$;
  }

  getUnlockedCount(badges: Badge[]): number {
    return badges.filter(badge => badge.isUnlocked).length;
  }

  getInProgressCount(badges: Badge[]): number {
    return badges.filter(badge => badge.progress !== undefined && badge.maxProgress && badge.progress < badge.maxProgress).length;
  }

  getBadgeIconPath(icon: string): string {
    if (!icon) {
      return 'assets/badges/first-step.svg';
    }
    // Ensure path starts with / for absolute path from root
  
    if (icon.startsWith('/') || icon.startsWith('http:') || icon.startsWith('https:') || icon.startsWith('data:')){
      return icon;
    }
    return '/' + icon;
  }

  onImageError(event: any): void {
    // Log the error for debugging
    console.error('Badge icon failed to load:', event.target.src);
    // Try alternative path formats
    const currentSrc = event.target.src;
    let path = currentSrc;
    
    // Extract pathname if it's a full URL
    try {
      const url = new URL(currentSrc);
      path = url.pathname;
    } catch (e) {
      // If URL parsing fails, use the src as-is
      path = currentSrc;
    }
    
    // If it has leading slash, try without
    if (path.startsWith('/assets/')) {
      event.target.src = path.substring(1);
    } 
    // If it doesn't have leading slash, try with
    else if (path.includes('assets/') && !path.startsWith('/')) {
      const assetIndex = path.indexOf('assets/');
      event.target.src = '/' + path.substring(assetIndex);
    }
  }
}


