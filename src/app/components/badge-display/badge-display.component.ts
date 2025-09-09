import { Component, Input, OnInit } from '@angular/core';
import { Badge, BadgeCategory, BadgeRarity } from '../../models/badge.model';

@Component({
  selector: 'app-badge-display',
  templateUrl: './badge-display.component.html',
  styleUrls: ['./badge-display.component.scss'],
  standalone: false
})
export class BadgeDisplayComponent implements OnInit {
  @Input() badge!: Badge;
  @Input() showProgress: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  constructor() { }

  ngOnInit() {}

  getBadgeRarityClass(): string {
    return `badge-${this.badge.rarity}`;
  }

  getBadgeSizeClass(): string {
    return `badge-${this.size}`;
  }

  getProgressPercentage(): number {
    if (!this.badge.maxProgress || this.badge.maxProgress === 0) return 0;
    return Math.round(((this.badge.progress || 0) / this.badge.maxProgress) * 100);
  }

  getRarityColor(): string {
    switch (this.badge.rarity) {
      case BadgeRarity.COMMON:
        return '#6c757d';
      case BadgeRarity.RARE:
        return '#007bff';
      case BadgeRarity.EPIC:
        return '#6f42c1';
      case BadgeRarity.LEGENDARY:
        return '#fd7e14';
      default:
        return '#6c757d';
    }
  }

  getCategoryIcon(): string {
    switch (this.badge.category) {
      case BadgeCategory.PRACTICE:
        return 'fitness-outline';
      case BadgeCategory.PROGRESS:
        return 'trending-up-outline';
      case BadgeCategory.PERFORMANCE:
        return 'trophy-outline';
      case BadgeCategory.SPECIAL:
        return 'star-outline';
      case BadgeCategory.LEARNING:
        return 'book-outline';
      default:
        return 'ribbon-outline';
    }
  }

  formatUnlockedDate(unlockedAt: any): string {
    if (!unlockedAt) {
      return '';
    }

    let date: Date;
    
    // Handle Firestore Timestamp
    if (unlockedAt && typeof unlockedAt.toDate === 'function') {
      date = unlockedAt.toDate();
    }
    // Handle JavaScript Date
    else if (unlockedAt instanceof Date) {
      date = unlockedAt;
    }
    // Handle string or number
    else {
      date = new Date(unlockedAt);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
