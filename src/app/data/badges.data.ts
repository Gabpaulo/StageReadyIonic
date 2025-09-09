import { Badge, BadgeCategory, BadgeRarity, BadgeCriteria } from '../models/badge.model';

export const BADGE_DEFINITIONS: Badge[] = [
  // Practice Badges
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first speech analysis',
    icon: 'footsteps-outline',
    category: BadgeCategory.PRACTICE,
    rarity: BadgeRarity.COMMON,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'daily_practice',
    name: 'Daily Practice',
    description: 'Practice for 7 consecutive days',
    icon: 'calendar-outline',
    category: BadgeCategory.PRACTICE,
    rarity: BadgeRarity.RARE,
    isUnlocked: false,
    maxProgress: 7
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Practice for 30 days total',
    icon: 'trophy-outline',
    category: BadgeCategory.PRACTICE,
    rarity: BadgeRarity.EPIC,
    isUnlocked: false,
    maxProgress: 30
  },
  {
    id: 'consistency_champion',
    name: 'Consistency Champion',
    description: 'Practice for 100 days total',
    icon: 'medal-outline',
    category: BadgeCategory.PRACTICE,
    rarity: BadgeRarity.LEGENDARY,
    isUnlocked: false,
    maxProgress: 100
  },

  // Progress Badges
  {
    id: 'clarity_master',
    name: 'Clarity Master',
    description: 'Achieve excellent clarity rating',
    icon: 'eye-outline',
    category: BadgeCategory.PROGRESS,
    rarity: BadgeRarity.RARE,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'pace_perfect',
    name: 'Pace Perfect',
    description: 'Achieve excellent pace rating',
    icon: 'speedometer-outline',
    category: BadgeCategory.PROGRESS,
    rarity: BadgeRarity.RARE,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'tone_expert',
    name: 'Tone Expert',
    description: 'Achieve excellent tone rating',
    icon: 'musical-notes-outline',
    category: BadgeCategory.PROGRESS,
    rarity: BadgeRarity.RARE,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'filler_fighter',
    name: 'Filler Fighter',
    description: 'Reduce filler words by 50%',
    icon: 'shield-outline',
    category: BadgeCategory.PROGRESS,
    rarity: BadgeRarity.EPIC,
    isUnlocked: false,
    maxProgress: 1
  },

  // Performance Badges
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 10 speech analyses',
    icon: 'flash-outline',
    category: BadgeCategory.PERFORMANCE,
    rarity: BadgeRarity.COMMON,
    isUnlocked: false,
    maxProgress: 10
  },
  {
    id: 'marathon_speaker',
    name: 'Marathon Speaker',
    description: 'Complete 50 speech analyses',
    icon: 'fitness-outline',
    category: BadgeCategory.PERFORMANCE,
    rarity: BadgeRarity.EPIC,
    isUnlocked: false,
    maxProgress: 50
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 speech analyses',
    icon: 'ribbon-outline',
    category: BadgeCategory.PERFORMANCE,
    rarity: BadgeRarity.LEGENDARY,
    isUnlocked: false,
    maxProgress: 100
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get all excellent ratings in one session',
    icon: 'star-outline',
    category: BadgeCategory.PERFORMANCE,
    rarity: BadgeRarity.LEGENDARY,
    isUnlocked: false,
    maxProgress: 1
  },

  // Special Badges
  {
    id: 'profile_pioneer',
    name: 'Profile Pioneer',
    description: 'Complete your profile setup',
    icon: 'person-outline',
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.COMMON,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Use the app for the first time',
    icon: 'sunny-outline',
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.COMMON,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Return after 7+ days away',
    icon: 'refresh-outline',
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.RARE,
    isUnlocked: false,
    maxProgress: 1
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Practice after 10 PM',
    icon: 'moon-outline',
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.RARE,
    isUnlocked: false,
    maxProgress: 1
  },

  // Learning Badges
  {
    id: 'interests_explorer',
    name: 'Interests Explorer',
    description: 'Add 5+ interests to your profile',
    icon: 'compass-outline',
    category: BadgeCategory.LEARNING,
    rarity: BadgeRarity.COMMON,
    isUnlocked: false,
    maxProgress: 5
  },
  {
    id: 'bio_writer',
    name: 'Bio Writer',
    description: 'Write a personal bio',
    icon: 'document-text-outline',
    category: BadgeCategory.LEARNING,
    rarity: BadgeRarity.COMMON,
    isUnlocked: false,
    maxProgress: 1
  }
];

export const BADGE_CRITERIA: Record<string, BadgeCriteria> = {
  first_steps: {
    type: 'speech_count',
    value: 1,
    condition: 'greater_than'
  },
  daily_practice: {
    type: 'consecutive_days',
    value: 7,
    condition: 'greater_than'
  },
  week_warrior: {
    type: 'total_days',
    value: 30,
    condition: 'greater_than'
  },
  consistency_champion: {
    type: 'total_days',
    value: 100,
    condition: 'greater_than'
  },
  clarity_master: {
    type: 'rating_achievement',
    value: 1,
    ratingType: 'clarity',
    ratingValue: 'excellent'
  },
  pace_perfect: {
    type: 'rating_achievement',
    value: 1,
    ratingType: 'pace',
    ratingValue: 'excellent'
  },
  tone_expert: {
    type: 'rating_achievement',
    value: 1,
    ratingType: 'tone',
    ratingValue: 'excellent'
  },
  speed_demon: {
    type: 'speech_count',
    value: 10,
    condition: 'greater_than'
  },
  marathon_speaker: {
    type: 'speech_count',
    value: 50,
    condition: 'greater_than'
  },
  centurion: {
    type: 'speech_count',
    value: 100,
    condition: 'greater_than'
  },
  profile_pioneer: {
    type: 'profile_completion',
    value: 1,
    ratingType: 'profile'
  },
  early_bird: {
    type: 'speech_count',
    value: 1,
    condition: 'greater_than'
  },
  interests_explorer: {
    type: 'profile_completion',
    value: 5,
    ratingType: 'interests'
  },
  bio_writer: {
    type: 'profile_completion',
    value: 1,
    ratingType: 'bio'
  }
};
