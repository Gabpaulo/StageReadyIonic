import { Component, OnInit } from '@angular/core';
import { BadgeService } from '../../services/badge.service';
import { Badge, BadgeCategory } from '../../models/badge.model';

@Component({
  selector: 'app-badge-collection',
  templateUrl: './badge-collection.component.html',
  styleUrls: ['./badge-collection.component.scss'],
  standalone: false
})
export class BadgeCollectionComponent implements OnInit {
  badges: Badge[] = [];
  selectedCategory: BadgeCategory | 'all' = 'all';
  badgeProgress: { total: number; unlocked: number; percentage: number } = { total: 0, unlocked: 0, percentage: 0 };

  categories = [
    { value: 'all', label: 'All Badges', icon: 'apps-outline' },
    { value: BadgeCategory.PRACTICE, label: 'Practice', icon: 'fitness-outline' },
    { value: BadgeCategory.PROGRESS, label: 'Progress', icon: 'trending-up-outline' },
    { value: BadgeCategory.PERFORMANCE, label: 'Performance', icon: 'trophy-outline' },
    { value: BadgeCategory.SPECIAL, label: 'Special', icon: 'star-outline' },
    { value: BadgeCategory.LEARNING, label: 'Learning', icon: 'book-outline' }
  ];

  constructor(private badgeService: BadgeService) { }

  ngOnInit() {
    this.badgeService.userBadges$.subscribe(badges => {
      this.badges = badges;
      this.badgeProgress = this.badgeService.getBadgeProgress();
    });
  }

  get filteredBadges(): Badge[] {
    if (this.selectedCategory === 'all') {
      return this.badges;
    }
    return this.badges.filter(badge => badge.category === this.selectedCategory);
  }

  get unlockedBadges(): Badge[] {
    return this.badges.filter(badge => badge.isUnlocked);
  }

  get lockedBadges(): Badge[] {
    return this.badges.filter(badge => !badge.isUnlocked);
  }

  selectCategory(category: any) {
    if (category && (category === 'all' || Object.values(BadgeCategory).includes(category))) {
      this.selectedCategory = category as BadgeCategory | 'all';
    }
  }

  getCategoryStats(category: BadgeCategory | string): { total: number; unlocked: number; percentage: number } {
    const categoryBadges = this.badges.filter(badge => badge.category === category);
    const total = categoryBadges.length;
    const unlocked = categoryBadges.filter(badge => badge.isUnlocked).length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    
    return { total, unlocked, percentage };
  }
}
