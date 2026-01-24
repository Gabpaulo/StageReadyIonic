import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { BadgeNotificationService } from './badge-notification.service';
import { GamificationService } from './gamification.service';
import { Badge, UserBadgeProgress, BadgeCategory, BadgeRarity } from '../models/badge.model';
import { BADGE_DEFINITIONS, BADGE_CRITERIA } from '../data/badges.data';
import { AnalyzeSpeechForFeedbackOutput } from '../pages/speech-analysis/model';

@Injectable({
  providedIn: 'root'
})
export class BadgeService {
  private userBadgesSubject = new BehaviorSubject<Badge[]>([]);
  public userBadges$ = this.userBadgesSubject.asObservable();

  private currentUserId: string | null = null;

  // XP rewards based on badge rarity
  private readonly BADGE_XP_REWARDS = {
    [BadgeRarity.COMMON]: 10,
    [BadgeRarity.RARE]: 25,
    [BadgeRarity.EPIC]: 50,
    [BadgeRarity.LEGENDARY]: 100
  };

  constructor(
    private firebaseService: FirebaseService,
    private badgeNotificationService: BadgeNotificationService,
    private gamificationService: GamificationService
  ) {
    this.initializeBadgeService();
  }

  private async initializeBadgeService() {
    this.firebaseService.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUserId = user.uid;
        await this.loadUserBadges();
      } else {
        this.currentUserId = null;
        this.userBadgesSubject.next([]);
      }
    });
  }

  async loadUserBadges(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const userBadgeData = await this.firebaseService.getUserBadges(this.currentUserId);
      if (userBadgeData && userBadgeData.badges && userBadgeData.badges.length > 0) {
        // Merge with BADGE_DEFINITIONS to ensure icon paths are correct
        const mergedBadges = userBadgeData.badges.map(savedBadge => {
          const definition = BADGE_DEFINITIONS.find(def => def.id === savedBadge.id);
          if (definition) {
            // Preserve user progress but use correct icon path from definition
            return {
              ...savedBadge,
              icon: definition.icon, // Always use the correct icon path from definition
              name: definition.name,
              description: definition.description,
              category: definition.category,
              rarity: definition.rarity,
              maxProgress: definition.maxProgress
            };
          }
          return savedBadge;
        });
        this.userBadgesSubject.next(mergedBadges);
      } else {
        // Initialize with default badges if none exist
        const defaultBadges = BADGE_DEFINITIONS.map(badge => ({ ...badge }));
        await this.saveUserBadges(defaultBadges);
        this.userBadgesSubject.next(defaultBadges);
      }
    } catch (error) {
      console.error('Error loading user badges:', error);
      // Fallback to default badges on error
      const defaultBadges = BADGE_DEFINITIONS.map(badge => ({ ...badge }));
      this.userBadgesSubject.next(defaultBadges);
    }
  }

  async checkAndAwardBadges(eventType: string, data?: any): Promise<Badge[]> {
    if (!this.currentUserId) return [];

    const currentBadges = this.userBadgesSubject.value;
    const newlyUnlockedBadges: Badge[] = [];

    for (const badge of currentBadges) {
      if (badge.isUnlocked) continue;

      const shouldUnlock = await this.checkBadgeCriteria(badge.id, eventType, data);
      if (shouldUnlock) {
        badge.isUnlocked = true;
        badge.unlockedAt = new Date();
        badge.progress = badge.maxProgress;
        newlyUnlockedBadges.push(badge);
      } else {
        // Update progress even if not unlocked
        await this.updateBadgeProgress(badge, eventType, data);
      }
    }

    if (newlyUnlockedBadges.length > 0) {
      await this.saveUserBadges(currentBadges);
      this.userBadgesSubject.next(currentBadges);

      // Award XP for each unlocked badge based on rarity
      for (const badge of newlyUnlockedBadges) {
        const xpReward = this.BADGE_XP_REWARDS[badge.rarity] || 10;
        await this.gamificationService.awardXP(xpReward, `${badge.name} badge unlocked`);
      }

      // Show badge unlock popup for each newly unlocked badge
      this.badgeNotificationService.showBadgeUnlock(newlyUnlockedBadges);
    }

    return newlyUnlockedBadges;
  }

  private async checkBadgeCriteria(badgeId: string, eventType: string, data?: any): Promise<boolean> {
    const criteria = BADGE_CRITERIA[badgeId];
    if (!criteria) return false;

    switch (criteria.type) {
      case 'speech_count':
        return await this.checkSpeechCountCriteria(criteria, eventType, data);
      case 'consecutive_days':
        return await this.checkConsecutiveDaysCriteria(criteria, eventType, data);
      case 'total_days':
        return await this.checkTotalDaysCriteria(criteria, eventType, data);
      case 'rating_achievement':
        return await this.checkRatingAchievementCriteria(criteria, eventType, data);
      case 'profile_completion':
        return await this.checkProfileCompletionCriteria(criteria, eventType, data);
      case 'time_based':
        return await this.checkTimeBasedCriteria(criteria, eventType, data);
      default:
        return false;
    }
  }

  private async checkSpeechCountCriteria(criteria: any, eventType: string, data?: any): Promise<boolean> {
    if (eventType !== 'speech_completed') return false;
    
    const speechCount = await this.firebaseService.getUserSpeechCount(this.currentUserId!);
    return this.evaluateCondition(speechCount, criteria.value, criteria.condition);
  }

  private async checkConsecutiveDaysCriteria(criteria: any, eventType: string, data?: any): Promise<boolean> {
    if (eventType !== 'speech_completed') return false;
    
    const consecutiveDays = await this.firebaseService.getUserConsecutiveDays(this.currentUserId!);
    return this.evaluateCondition(consecutiveDays, criteria.value, criteria.condition);
  }

  private async checkTotalDaysCriteria(criteria: any, eventType: string, data?: any): Promise<boolean> {
    if (eventType !== 'speech_completed') return false;
    
    const totalDays = await this.firebaseService.getUserTotalDays(this.currentUserId!);
    return this.evaluateCondition(totalDays, criteria.value, criteria.condition);
  }

  private async checkRatingAchievementCriteria(criteria: any, eventType: string, data?: any): Promise<boolean> {
    if (eventType !== 'speech_analyzed' || !data) return false;
    
    const feedback: AnalyzeSpeechForFeedbackOutput = data;
    const rating = this.getRatingFromFeedback(feedback, criteria.ratingType);
    return rating === criteria.ratingValue;
  }

  private async checkProfileCompletionCriteria(criteria: any, eventType: string, data?: any): Promise<boolean> {
    if (eventType !== 'profile_updated') return false;
    
    const profile = data || await this.firebaseService.getUserProfile(this.currentUserId!);
    if (!profile) return false;

    // Check specific profile completion criteria based on ratingType
    if (criteria.ratingType === 'interests') {
      return profile.interests && profile.interests.length >= criteria.value;
    } else if (criteria.ratingType === 'bio') {
      return profile.bio && profile.bio.trim().length > 0;
    } else if (criteria.ratingType === 'profile') {
      return profile.firstName && profile.lastName && profile.age;
    }
    
    return false;
  }

  private async checkTimeBasedCriteria(criteria: any, eventType: string, data?: any): Promise<boolean> {
    if (eventType !== 'speech_completed') return false;
    
    const currentHour = new Date().getHours();
    return currentHour >= 22; // 10 PM or later for night owl badge
  }

  private evaluateCondition(actual: number, expected: number, condition?: string): boolean {
    switch (condition) {
      case 'greater_than':
        return actual > expected;
      case 'equal_to':
        return actual === expected;
      case 'less_than':
        return actual < expected;
      default:
        return actual >= expected;
    }
  }

  private getRatingFromFeedback(feedback: AnalyzeSpeechForFeedbackOutput, ratingType: string): string {
    // Handle new backend response structure where feedback fields may not exist
    switch (ratingType) {
      case 'clarity':
        return feedback.clarity_feedback?.toLowerCase() || this.scoreToRating(feedback.articulation_clarity);
      case 'pace':
        return feedback.pace_feedback?.toLowerCase() || this.scoreToRating(feedback.speech_pace);
      case 'tone':
        return feedback.tone_feedback?.toLowerCase() || this.scoreToRating(feedback.pitch_variation);
      default:
        return 'fair';
    }
  }

  private scoreToRating(score: number | undefined): string {
    if (!score) return 'fair';
    if (score >= 4) return 'excellent';
    if (score >= 3) return 'good';
    if (score >= 2) return 'fair';
    return 'poor';
  }

  private async updateBadgeProgress(badge: Badge, eventType: string, data?: any): Promise<void> {
    const criteria = BADGE_CRITERIA[badge.id];
    if (!criteria) return;

    let newProgress = badge.progress || 0;

    switch (criteria.type) {
      case 'speech_count':
        if (eventType === 'speech_completed') {
          newProgress = Math.min(newProgress + 1, badge.maxProgress || 1);
        }
        break;
      case 'consecutive_days':
        if (eventType === 'speech_completed') {
          const consecutiveDays = await this.firebaseService.getUserConsecutiveDays(this.currentUserId!);
          newProgress = Math.min(consecutiveDays, badge.maxProgress || 7);
        }
        break;
      case 'total_days':
        if (eventType === 'speech_completed') {
          const totalDays = await this.firebaseService.getUserTotalDays(this.currentUserId!);
          newProgress = Math.min(totalDays, badge.maxProgress || 30);
        }
        break;
      case 'profile_completion':
        if (eventType === 'profile_updated' && data) {
          const profile = data;
          if (criteria.ratingType === 'interests') {
            newProgress = Math.min(profile.interests?.length || 0, badge.maxProgress || 5);
          } else if (criteria.ratingType === 'bio') {
            newProgress = profile.bio && profile.bio.trim().length > 0 ? 1 : 0;
          } else if (criteria.ratingType === 'profile') {
            newProgress = (profile.firstName && profile.lastName && profile.age) ? 1 : 0;
          }
        }
        break;
    }

    if (newProgress !== badge.progress) {
      badge.progress = newProgress;
    }
  }

  private async saveUserBadges(badges: Badge[]): Promise<void> {
    if (!this.currentUserId) return;

    // Ensure all badges have correct icon paths from definitions before saving
    const badgesWithCorrectIcons = badges.map(badge => {
      const definition = BADGE_DEFINITIONS.find(def => def.id === badge.id);
      if (definition) {
        return {
          ...badge,
          icon: definition.icon, // Always use correct icon path from definition
          name: definition.name,
          description: definition.description,
          category: definition.category,
          rarity: definition.rarity,
          maxProgress: definition.maxProgress
        };
      }
      return badge;
    });

    const userBadgeProgress: UserBadgeProgress = {
      userId: this.currentUserId,
      badges: badgesWithCorrectIcons,
      totalBadges: BADGE_DEFINITIONS.length,
      unlockedBadges: badgesWithCorrectIcons.filter(b => b.isUnlocked).length,
      lastUpdated: new Date()
    };

    await this.firebaseService.saveUserBadges(this.currentUserId, userBadgeProgress);
  }

  getBadgesByCategory(category: BadgeCategory): Badge[] {
    return this.userBadgesSubject.value.filter(badge => badge.category === category);
  }

  getUnlockedBadges(): Badge[] {
    return this.userBadgesSubject.value.filter(badge => badge.isUnlocked);
  }

  getBadgeProgress(): { total: number; unlocked: number; percentage: number } {
    const badges = this.userBadgesSubject.value;
    const total = badges.length;
    const unlocked = badges.filter(b => b.isUnlocked).length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return { total, unlocked, percentage };
  }

  // Public methods for triggering badge checks
  async onSpeechCompleted(feedback?: AnalyzeSpeechForFeedbackOutput): Promise<Badge[]> {
    return this.checkAndAwardBadges('speech_completed', feedback);
  }

  async onSpeechAnalyzed(feedback: AnalyzeSpeechForFeedbackOutput): Promise<Badge[]> {
    return this.checkAndAwardBadges('speech_analyzed', feedback);
  }

  async onProfileUpdated(profile: any): Promise<Badge[]> {
    return this.checkAndAwardBadges('profile_updated', profile);
  }
}
