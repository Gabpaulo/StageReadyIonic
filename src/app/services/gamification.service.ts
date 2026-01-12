import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { UserGamification, XP_REWARDS, XP_PER_LEVEL } from '../models/gamification.model';

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private userGamificationSubject = new BehaviorSubject<UserGamification | null>(null);
  public userGamification$ = this.userGamificationSubject.asObservable();

  private currentUserId: string | null = null;

  constructor(private firebaseService: FirebaseService) {
    this.initializeGamificationService();
  }

  private async initializeGamificationService() {
    this.firebaseService.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUserId = user.uid;
        await this.loadUserGamification();
      } else {
        this.currentUserId = null;
        this.userGamificationSubject.next(null);
      }
    });
  }

  async loadUserGamification(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      let gamification = await this.firebaseService.getUserGamification(this.currentUserId);

      if (!gamification) {
        // Initialize gamification if it doesn't exist
        gamification = await this.firebaseService.initializeUserGamification(this.currentUserId);
      } else {
        // Refresh daily challenge if needed
        await this.firebaseService.refreshDailyChallenge(this.currentUserId);
        gamification = await this.firebaseService.getUserGamification(this.currentUserId);
      }

      this.userGamificationSubject.next(gamification);
    } catch (error) {
      console.error('Error loading user gamification:', error);
    }
  }

  async awardXP(amount: number, reason: string): Promise<void> {
    if (!this.currentUserId) return;

    const gamification = this.userGamificationSubject.value;
    if (!gamification) return;

    const newTotalXP = gamification.totalXP + amount;
    const newCurrentXP = gamification.currentXP + amount;

    // Check for level up
    const levelsGained = Math.floor(newCurrentXP / XP_PER_LEVEL);
    const newLevel = gamification.level + levelsGained;
    const remainingXP = newCurrentXP % XP_PER_LEVEL;

    gamification.totalXP = newTotalXP;
    gamification.currentXP = remainingXP;
    gamification.level = newLevel;

    await this.firebaseService.saveUserGamification(this.currentUserId, gamification);
    this.userGamificationSubject.next(gamification);

    console.log(`Awarded ${amount} XP for: ${reason}. New level: ${newLevel}, Current XP: ${remainingXP}/${XP_PER_LEVEL}`);
  }

  async onSpeechCompleted(): Promise<void> {
    if (!this.currentUserId) return;

    // Update streak
    const streakResult = await this.firebaseService.updateStreak(this.currentUserId);

    // Award XP for speech completion
    await this.awardXP(XP_REWARDS.SPEECH_COMPLETED, 'Speech completed');

    // Award bonus XP if it's first speech of the day
    if (streakResult.isNewDay) {
      await this.awardXP(XP_REWARDS.FIRST_SPEECH_OF_DAY, 'First speech of the day');
    }

    // Award streak milestone bonus (every 7 days)
    if (streakResult.currentStreak % 7 === 0 && streakResult.currentStreak > 0) {
      await this.awardXP(XP_REWARDS.STREAK_MILESTONE, `${streakResult.currentStreak}-day streak milestone`);
    }

    // Reload gamification data
    await this.loadUserGamification();
  }

  async completeDailyChallenge(): Promise<void> {
    if (!this.currentUserId) return;

    const gamification = this.userGamificationSubject.value;
    if (!gamification || gamification.dailyChallenge.completed) return;

    gamification.dailyChallenge.completed = true;
    await this.firebaseService.saveUserGamification(this.currentUserId, gamification);

    await this.awardXP(gamification.dailyChallenge.xpReward, 'Daily challenge completed');

    // Reload gamification data
    await this.loadUserGamification();
  }

  async onBadgeUnlocked(): Promise<void> {
    await this.awardXP(XP_REWARDS.BADGE_UNLOCKED, 'Badge unlocked');
  }

  async onPerfectScore(): Promise<void> {
    await this.awardXP(XP_REWARDS.PERFECT_SCORE, 'Perfect score achieved');
  }

  getGamificationData(): UserGamification | null {
    return this.userGamificationSubject.value;
  }

  getLevel(): number {
    return this.userGamificationSubject.value?.level || 1;
  }

  getCurrentXP(): number {
    return this.userGamificationSubject.value?.currentXP || 0;
  }

  getXPPercentage(): number {
    const currentXP = this.getCurrentXP();
    return (currentXP / XP_PER_LEVEL) * 100;
  }

  getCurrentStreak(): number {
    return this.userGamificationSubject.value?.currentStreak || 0;
  }

  getDailyChallenge(): string {
    return this.userGamificationSubject.value?.dailyChallenge.challenge || 'Complete a practice speech';
  }

  getDailyChallengeXP(): number {
    return this.userGamificationSubject.value?.dailyChallenge.xpReward || XP_REWARDS.DAILY_CHALLENGE;
  }

  isDailyChallengeCompleted(): boolean {
    return this.userGamificationSubject.value?.dailyChallenge.completed || false;
  }
}
