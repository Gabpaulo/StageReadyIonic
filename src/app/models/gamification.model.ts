export interface UserGamification {
  userId: string;
  level: number;
  currentXP: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  dailyChallenge: DailyChallenge;
  lastUpdated: Date;
}

export interface DailyChallenge {
  challenge: string;
  xpReward: number;
  date: Date;
  completed: boolean;
}

export interface XPReward {
  amount: number;
  reason: string;
  timestamp: Date;
}

export const XP_REWARDS = {
  SPEECH_COMPLETED: 10,
  DAILY_CHALLENGE: 25,
  FIRST_SPEECH_OF_DAY: 5,
  BADGE_UNLOCKED: 15,
  STREAK_MILESTONE: 20,
  PERFECT_SCORE: 30
};

export const XP_PER_LEVEL = 100;

export const DAILY_CHALLENGES = [
  'Complete a 2-minute practice speech',
  'Practice speaking without filler words',
  'Record a speech on a new topic',
  'Practice speaking at a moderate pace',
  'Deliver a speech with clear articulation',
  'Practice speaking with varied pitch',
  'Complete three practice sessions today'
];
