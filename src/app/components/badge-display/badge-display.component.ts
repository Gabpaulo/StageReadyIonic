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

  getSvgColorFilter(): string {
    let color = '';
    switch (this.badge.rarity) {
      case BadgeRarity.COMMON:
        color = '6c757d'; // Gray
        break;
      case BadgeRarity.RARE:
        color = '007bff'; // Blue
        break;
      case BadgeRarity.EPIC:
        color = '6f42c1'; // Purple
        break;
      case BadgeRarity.LEGENDARY:
        color = 'fd7e14'; // Orange
        break;
      default:
        color = '6c757d'; // Default to gray
        break;
    }

    // Convert hex to RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Apply a simple SVG color filter (this is a simplified approach and might need fine-tuning)
    // This filter attempts to tint the SVG to the desired color.
    return `
      filter: brightness(0) saturate(100%) invert(${r / 255}) sepia(1) saturate(500%) hue-rotate(180deg) brightness(1.5) contrast(1.5);
      filter: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='colorize'><feColorMatrix type='matrix' values='0 0 0 0 ${r / 255} 0 0 0 0 ${g / 255} 0 0 0 0 ${b / 255} 0 0 0 1 0'/></filter></svg>#colorize");
    `;
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

  getBadgeIconPath(): string {
    if (!this.badge || !this.badge.icon) {
      return '/assets/badges/first-step.svg';
    }
    // Ensure path starts with / for absolute path from root
    if (this.badge.icon.startsWith('/')) {
      return this.badge.icon;
    }
    return '/' + this.badge.icon;
  }

  onImageError(event: any): void {
    // Log the error for debugging
    console.error('Badge icon failed to load:', event.target.src);
    // Try alternative path formats
    try {
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
    } catch (e) {
      // If URL parsing fails, try simple string manipulation
      const currentSrc = event.target.src;
      if (currentSrc.startsWith('/assets/')) {
        event.target.src = currentSrc.substring(1);
      } else if (currentSrc.includes('assets/') && !currentSrc.startsWith('/')) {
        event.target.src = '/' + currentSrc;
      }
    }
  }
}
