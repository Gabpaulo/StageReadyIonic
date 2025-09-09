export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  isUnlocked: boolean;
}

export enum BadgeCategory {
  PRACTICE = 'practice',
  PROGRESS = 'progress', 
  PERFORMANCE = 'performance',
  SPECIAL = 'special',
  LEARNING = 'learning'
}

export enum BadgeRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface UserBadgeProgress {
  userId: string;
  badges: Badge[];
  totalBadges: number;
  unlockedBadges: number;
  lastUpdated: Date;
}

export interface BadgeCriteria {
  type: 'speech_count' | 'consecutive_days' | 'total_days' | 'rating_achievement' | 'profile_completion' | 'time_based';
  value: number;
  condition?: 'greater_than' | 'equal_to' | 'less_than';
  ratingType?: 'clarity' | 'pace' | 'tone' | 'overall' | 'profile' | 'interests' | 'bio';
  ratingValue?: 'excellent' | 'good' | 'fair' | 'poor';
}
