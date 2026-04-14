import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { UserBadgeProgress } from '../models/badge.model';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../models/speech-history.model';
import { UserGamification, DailyChallenge, DAILY_CHALLENGES, XP_REWARDS } from '../models/gamification.model';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private firebaseApp: FirebaseApp;
  public auth: Auth;
  public firestore: Firestore;
  public storage: FirebaseStorage;

  constructor() {
    this.firebaseApp = initializeApp(environment.firebaseConfig);
    this.auth = getAuth(this.firebaseApp);
    this.firestore = getFirestore(this.firebaseApp);
    this.storage = getStorage(this.firebaseApp);
  }

  async userProfileExists(uid: string): Promise<boolean> {
    if (!uid) return false;
    const docRef = doc(this.firestore, `users/${uid}`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  async createUserProfile(uid: string, data: any): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async updateUserProfile(uid: string, data: any): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  async getUserProfile(uid: string): Promise<any | null> {
    if (!uid) return null;
    const docRef = doc(this.firestore, `users/${uid}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as any;

      // Convert Firebase Timestamps to JavaScript Dates
      if (data.createdAt instanceof Timestamp) {
        data.createdAt = data.createdAt.toDate();
      }
      if (data.updatedAt instanceof Timestamp) {
        data.updatedAt = data.updatedAt.toDate();
      }

      return data;
    }
    return null;
  }

  async signInWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    try {
      return await signInWithPopup(this.auth, provider);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }

  // Badge-related methods
  async getUserBadges(uid: string): Promise<UserBadgeProgress | null> {
    if (!uid) return null;
    const docRef = doc(this.firestore, `userBadges/${uid}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as any;

      // Convert Firebase Timestamps to JavaScript Dates
      if (data.badges) {
        data.badges = data.badges.map((badge: any) => ({
          ...badge,
          unlockedAt: badge.unlockedAt instanceof Timestamp
            ? badge.unlockedAt.toDate()
            : badge.unlockedAt
        }));
      }

      if (data.lastUpdated instanceof Timestamp) {
        data.lastUpdated = data.lastUpdated.toDate();
      }

      return data as UserBadgeProgress;
    }
    return null;
  }

  async saveUserBadges(uid: string, badgeProgress: UserBadgeProgress): Promise<void> {
    const userRef = doc(this.firestore, `userBadges/${uid}`);

    // Clean badges to remove undefined values
    const cleanedBadges = badgeProgress.badges.map(badge => {
      const cleanBadge: any = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        isUnlocked: badge.isUnlocked || false,
        progress: badge.progress || 0,
        maxProgress: badge.maxProgress || 1
      };

      // Only add unlockedAt if it exists
      if (badge.unlockedAt) {
        cleanBadge.unlockedAt = Timestamp.fromDate(badge.unlockedAt instanceof Date ? badge.unlockedAt : new Date(badge.unlockedAt));
      }

      return cleanBadge;
    });

    await setDoc(userRef, {
      userId: badgeProgress.userId,
      badges: cleanedBadges,
      totalBadges: badgeProgress.totalBadges,
      unlockedBadges: badgeProgress.unlockedBadges,
      lastUpdated: Timestamp.now(),
    });
  }

  async getUserSpeechCount(uid: string): Promise<number> {
    const speechesRef = collection(this.firestore, `users/${uid}/speeches`);
    const q = query(speechesRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }

  async getUserConsecutiveDays(uid: string): Promise<number> {
    const speechesRef = collection(this.firestore, `users/${uid}/speeches`);
    const q = query(speechesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return 0;

    // Get unique days with speeches (sorted desc)
    const uniqueDays = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const speechData = doc.data();
      const speechDate = speechData['createdAt']?.toDate();
      if (speechDate) {
        const dateString = speechDate.toDateString();
        uniqueDays.add(dateString);
      }
    });

    // Convert to sorted array (most recent first)
    const sortedDays = Array.from(uniqueDays).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    if (sortedDays.length === 0) return 0;

    // Check if the most recent speech was today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mostRecentDay = new Date(sortedDays[0]);
    mostRecentDay.setHours(0, 0, 0, 0);

    const daysSinceLast = Math.floor((today.getTime() - mostRecentDay.getTime()) / (1000 * 60 * 60 * 24));

    // If last speech was more than 1 day ago, streak is broken (return 0)
    if (daysSinceLast > 1) return 0;

    // Count consecutive days starting from the most recent
    let consecutiveDays = 1;
    let expectedDate = new Date(mostRecentDay);
    expectedDate.setDate(expectedDate.getDate() - 1);

    for (let i = 1; i < sortedDays.length; i++) {
      const currentDay = new Date(sortedDays[i]);
      currentDay.setHours(0, 0, 0, 0);

      if (currentDay.getTime() === expectedDate.getTime()) {
        consecutiveDays++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  async getUserTotalDays(uid: string): Promise<number> {
    const speechesRef = collection(this.firestore, `users/${uid}/speeches`);
    const q = query(speechesRef);
    const querySnapshot = await getDocs(q);
    
    const uniqueDays = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const speechData = doc.data();
      const speechDate = speechData['createdAt']?.toDate();
      if (speechDate) {
        const dateString = speechDate.toDateString();
        uniqueDays.add(dateString);
      }
    });

    return uniqueDays.size;
  }

  async saveSpeechAnalysis(uid: string, speechData: any): Promise<void> {
    const speechRef = doc(collection(this.firestore, `users/${uid}/speeches`));
    
    // Upload to Storage if audio is provided
    let audioUrl: string | null = null;
    if (speechData.audioBlob) {
      const path = `users/${uid}/speeches/${speechRef.id}.${this.extensionFromMime(speechData.audioBlob.type)}`;
      const storageRef = ref(this.storage, path);
      await uploadBytes(storageRef, speechData.audioBlob, { contentType: speechData.audioBlob.type });
      audioUrl = await getDownloadURL(storageRef);
    }
    
    // Prepare data for Firestore (exclude the Blob)
    const { audioBlob, ...firestoreData } = speechData;
    
    await setDoc(speechRef, {
      ...firestoreData,
      audioUrl: audioUrl,
      createdAt: Timestamp.now(),
    });
  }

  async getNearestSpeechAudio(uid: string, targetDate: Date, searchWindowMinutes: number = 10): Promise<{ audioUrl?: string, audioData?: string, audioMimeType?: string | null } | null> {
    const speechesRef = collection(this.firestore, `users/${uid}/speeches`);
    const q = query(speechesRef, orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const targetMs = targetDate.getTime();
    const maxDiffMs = searchWindowMinutes * 60 * 1000;

    for (const d of snapshot.docs) {
      const data = d.data();
      const createdAt = data['createdAt']?.toDate?.() as Date | undefined;
      const audioUrl = data['audioUrl'] as string | undefined;
      const audioData = data['audioData'] as string | undefined; // legacy support
      const mime = data['audioMimeType'] as string | undefined;
      if (!createdAt || (!audioUrl && !audioData)) continue;
      const diff = Math.abs(createdAt.getTime() - targetMs);
      if (diff <= maxDiffMs) {
        return { audioUrl, audioData, audioMimeType: mime || null };
      }
    }
    return null;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private extensionFromMime(mime: string | undefined): string {
    if (!mime) return 'webm';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('mp3')) return 'mp3';
    if (mime.includes('mpeg')) return 'mp3';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('m4a')) return 'm4a';
    return 'dat';
  }

  // Speech History Methods
  async saveSpeechHistory(uid: string, speechData: any): Promise<void> {
    const historyRef = doc(collection(this.firestore, `users/${uid}/speechHistory`));

    // Extract transcript and duration from the data
    const transcript = speechData.transcript || speechData.feedback?.transcript || '[Transcript not available]';
    const wordCount = transcript !== '[Transcript not available]' ? transcript.split(' ').filter((w: string) => w.length > 0).length : 0;
    const duration = speechData.duration || speechData.feedback?.duration || 0; // in seconds
    const averagePace = duration > 0 && wordCount > 0 ? (wordCount / duration) * 60 : 0; // words per minute

    // Optional audio support via Storage
    let audioUrl: string | undefined;
    let audioData: string | undefined; // legacy fallback
    let audioMimeType: string | undefined;
    if (speechData.audioBlob) {
      const path = `users/${uid}/speechHistory/${historyRef.id}.${this.extensionFromMime(speechData.audioBlob.type)}`;
      const storageRef = ref(this.storage, path);
      await uploadBytes(storageRef, speechData.audioBlob, { contentType: speechData.audioBlob.type });
      audioUrl = await getDownloadURL(storageRef);
      audioMimeType = speechData.audioBlob.type;
    }

    const feedback = speechData.feedback;

    const baseEntry: any = {
      id: historyRef.id,
      userId: uid,
      transcript: transcript,
      speechType: speechData.speechType || 'general',
      scores: {
        speech_pace: feedback?.speech_pace || 0,
        pausing_fluency: feedback?.pausing_fluency || 0,
        loudness_control: feedback?.loudness_control || 0,
        pitch_variation: feedback?.pitch_variation || 0,
        articulation_clarity: feedback?.articulation_clarity || 0,
        expressive_emphasis: feedback?.expressive_emphasis || 0,
        filler_words: feedback?.filler_words || 0,
        overall: feedback?.overall || 0
      },
      feedbackDetails: {
        overall_assessment:  feedback?.overall_assessment  || '',
        closing_message:     feedback?.closing_message     || '',
        strengths:           Array.isArray(feedback?.strengths)    ? feedback.strengths    : [],
        improvements:        Array.isArray(feedback?.improvements) ? feedback.improvements : [],
        pace_feedback:       feedback?.pace_feedback       || '',
        volume_feedback:     feedback?.volume_feedback     || '',
        pitch_feedback:      feedback?.pitch_feedback      || '',
        clarity_feedback:    feedback?.clarity_feedback    || '',
        pausing_feedback:    feedback?.pausing_feedback    || '',
        filler_feedback:     feedback?.filler_feedback     || '',
        tone_feedback:       feedback?.tone_feedback       || '',
        filler_word_details: feedback?.filler_word_details || null,
        pause_details: feedback?.pause_details
          ? {
              total_count:      feedback.pause_details.total_count      ?? 0,
              average_duration: feedback.pause_details.average_duration ?? 0,
              longest_duration: feedback.pause_details.longest_duration ?? 0,
              short_count:      feedback.pause_details.short_count      ?? 0,
              medium_count:     feedback.pause_details.medium_count     ?? 0,
              long_count:       feedback.pause_details.long_count       ?? 0,
            }
          : null,
      },
      recommendations: feedback?.recommendations || [],
      createdAt: new Date(),
      duration: duration,
      wordCount: wordCount,
      averagePace: averagePace
    };
    if (audioUrl) baseEntry.audioUrl = audioUrl;
    if (audioData) baseEntry.audioData = audioData;
    if (audioMimeType) baseEntry.audioMimeType = audioMimeType;

    await setDoc(historyRef, {
      ...baseEntry,
      createdAt: Timestamp.now(),
    });
  }

  async getSpeechHistory(uid: string, limitCount: number = 50): Promise<SpeechHistoryEntry[]> {
    const historyRef = collection(this.firestore, `users/${uid}/speechHistory`);
    const q = query(historyRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();

      // Map the stored structure to the expected SpeechHistoryEntry format
      const entry: any = {
        id: data['id'],
        userId: data['userId'],
        transcript: data['transcript'],
        speechType: data['speechType'],
        createdAt: data['createdAt'].toDate(),
        duration: data['duration'],
        wordCount: data['wordCount'],
        averagePace: data['averagePace'],
        audioUrl: data['audioUrl'],
        audioData: data['audioData'],
        audioMimeType: data['audioMimeType']
      };

      // Map scores object to flat feedback structure
      if (data['scores']) {
        const fd = data['feedbackDetails'] || {};
        entry.feedback = {
          // Scores
          speech_pace:          data['scores'].speech_pace          || 0,
          pausing_fluency:      data['scores'].pausing_fluency      || 0,
          loud_control:         data['scores'].loudness_control     || 0,
          pitch_variation:      data['scores'].pitch_variation      || 0,
          articulation_clarity: data['scores'].articulation_clarity || 0,
          expressive_emph:      data['scores'].expressive_emphasis  || 0,
          filler_words_score:   data['scores'].filler_words         || 0,
          overall:              data['scores'].overall              || 0,

          // Per-dimension feedback
          pace_feedback:        fd.pace_feedback     || '',
          volume_feedback:      fd.volume_feedback   || '',
          pitch_feedback:       fd.pitch_feedback    || '',
          clarity_feedback:     fd.clarity_feedback  || '',
          pausing_feedback:     fd.pausing_feedback  || '',
          filler_feedback:      fd.filler_feedback   || '',
          tone_feedback:        fd.tone_feedback     || '',

          // Coach report
          overall_assessment:   fd.overall_assessment || '',
          strengths:            Array.isArray(fd.strengths)    ? fd.strengths    : [],
          improvements:         Array.isArray(fd.improvements) ? fd.improvements : [],
          closing_message:      fd.closing_message   || '',

          // Optional detail arrays
          filler_word_details:  fd.filler_word_details || null,
          pause_details:        fd.pause_details       || null,
        };
      }

      return entry as SpeechHistoryEntry;
    });
  }

  async getSpeechHistorySummary(uid: string): Promise<SpeechHistorySummary> {
    const historyRef = collection(this.firestore, `users/${uid}/speechHistory`);
    const q = query(historyRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        totalSessions: 0,
        averageClarity: 0,
        averagePace: 0,
        averageTone: 0,
        totalWords: 0,
        totalDuration: 0,
        improvementTrend: 'stable'
      };
    }

    const entries = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const entry: any = {
        createdAt: data['createdAt'].toDate(),
        duration: data['duration'],
        wordCount: data['wordCount'],
      };

      // Map scores to feedback structure
      if (data['scores']) {
        entry.feedback = {
          speech_pace: data['scores'].speech_pace || 0,
          pitch_variation: data['scores'].pitch_variation || 0,
          articulation_clarity: data['scores'].articulation_clarity || 0,
        };
      }

      return entry as SpeechHistoryEntry;
    });

    const totalSessions = entries.length;
    const totalWords = entries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
    const totalDuration = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const lastSession = entries[0]?.createdAt;

    // Calculate average ratings (convert text to numbers) with null checks
    const clarityScores = entries
      .filter(entry => entry.feedback && typeof entry.feedback.articulation_clarity === 'number')
      .map(entry => entry.feedback.articulation_clarity);
    const paceScores = entries
      .filter(entry => entry.feedback && typeof entry.feedback.speech_pace === 'number')
      .map(entry => entry.feedback.speech_pace);
    const toneScores = entries
      .filter(entry => entry.feedback && typeof entry.feedback.pitch_variation === 'number')
      .map(entry => entry.feedback.pitch_variation);

    const averageClarity = clarityScores.length > 0 ? clarityScores.reduce((sum, score) => sum + score, 0) / clarityScores.length : 0;
    const averagePace = paceScores.length > 0 ? paceScores.reduce((sum, score) => sum + score, 0) / paceScores.length : 0;
    const averageTone = toneScores.length > 0 ? toneScores.reduce((sum, score) => sum + score, 0) / toneScores.length : 0;

    // Calculate improvement trend (compare recent vs older sessions)
    const improvementTrend = this.calculateImprovementTrend(entries);

    return {
      totalSessions,
      averageClarity,
      averagePace,
      averageTone,
      totalWords,
      totalDuration,
      lastSession,
      improvementTrend
    };
  }

  private ratingToNumber(rating: string): number {
    switch (rating.toLowerCase()) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'fair': return 2;
      case 'poor': return 1;
      default: return 0;
    }
  }

  private calculateImprovementTrend(entries: SpeechHistoryEntry[]): 'improving' | 'stable' | 'declining' {
    if (entries.length < 3) return 'stable';

    const recent = entries.slice(0, Math.ceil(entries.length / 3));
    const older = entries.slice(-Math.ceil(entries.length / 3));

    const recentAvg = recent.reduce((sum, entry) => {
      const clarity = entry.feedback?.articulation_clarity || 0;
      const pace = entry.feedback?.speech_pace || 0;
      const tone = entry.feedback?.pitch_variation || 0;
      return sum + clarity + pace + tone;
    }, 0) / (recent.length * 3);

    const olderAvg = older.reduce((sum, entry) => {
      const clarity = entry.feedback?.articulation_clarity || 0;
      const pace = entry.feedback?.speech_pace || 0;
      const tone = entry.feedback?.pitch_variation || 0;
      return sum + clarity + pace + tone;
    }, 0) / (older.length * 3);

    const difference = recentAvg - olderAvg;

    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }

  // Gamification Methods
  async getUserGamification(uid: string): Promise<UserGamification | null> {
    if (!uid) return null;
    const docRef = doc(this.firestore, `userGamification/${uid}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;

      // Convert Firebase Timestamps to JavaScript Dates
      return {
        userId: data.userId,
        level: data.level || 1,
        currentXP: data.currentXP || 0,
        totalXP: data.totalXP || 0,
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        lastActivityDate: data.lastActivityDate instanceof Timestamp
          ? data.lastActivityDate.toDate()
          : data.lastActivityDate,
        dailyChallenge: {
          challenge: data.dailyChallenge?.challenge || DAILY_CHALLENGES[0],
          xpReward: data.dailyChallenge?.xpReward || XP_REWARDS.DAILY_CHALLENGE,
          date: data.dailyChallenge?.date instanceof Timestamp
            ? data.dailyChallenge.date.toDate()
            : data.dailyChallenge?.date || new Date(),
          completed: data.dailyChallenge?.completed || false
        },
        lastUpdated: data.lastUpdated instanceof Timestamp
          ? data.lastUpdated.toDate()
          : data.lastUpdated
      };
    }

    return null;
  }

  async saveUserGamification(uid: string, gamification: UserGamification): Promise<void> {
    const gamificationRef = doc(this.firestore, `userGamification/${uid}`);
    await setDoc(gamificationRef, {
      userId: gamification.userId,
      level: gamification.level,
      currentXP: gamification.currentXP,
      totalXP: gamification.totalXP,
      currentStreak: gamification.currentStreak,
      longestStreak: gamification.longestStreak,
      lastActivityDate: Timestamp.fromDate(gamification.lastActivityDate),
      dailyChallenge: {
        challenge: gamification.dailyChallenge.challenge,
        xpReward: gamification.dailyChallenge.xpReward,
        date: Timestamp.fromDate(gamification.dailyChallenge.date),
        completed: gamification.dailyChallenge.completed
      },
      lastUpdated: Timestamp.now()
    });
  }

  async initializeUserGamification(uid: string): Promise<UserGamification> {
    const today = new Date();
    const randomChallengeIndex = Math.floor(Math.random() * DAILY_CHALLENGES.length);

    const gamification: UserGamification = {
      userId: uid,
      level: 1,
      currentXP: 0,
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: today,
      dailyChallenge: {
        challenge: DAILY_CHALLENGES[randomChallengeIndex],
        xpReward: XP_REWARDS.DAILY_CHALLENGE,
        date: today,
        completed: false
      },
      lastUpdated: today
    };

    await this.saveUserGamification(uid, gamification);
    return gamification;
  }

  async updateStreak(uid: string): Promise<{ currentStreak: number; isNewDay: boolean }> {
    const gamification = await this.getUserGamification(uid);

    if (!gamification) {
      const initialized = await this.initializeUserGamification(uid);
      return { currentStreak: 0, isNewDay: true };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = new Date(gamification.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    let currentStreak = gamification.currentStreak;
    let isNewDay = false;

    if (daysDiff === 0) {
      // Same day, no streak change
      isNewDay = false;
    } else if (daysDiff === 1) {
      // Consecutive day
      currentStreak += 1;
      isNewDay = true;
    } else {
      // Streak broken
      currentStreak = 1;
      isNewDay = true;
    }

    const longestStreak = Math.max(gamification.longestStreak, currentStreak);

    gamification.currentStreak = currentStreak;
    gamification.longestStreak = longestStreak;
    gamification.lastActivityDate = new Date();

    await this.saveUserGamification(uid, gamification);

    return { currentStreak, isNewDay };
  }

  async refreshDailyChallenge(uid: string): Promise<DailyChallenge> {
    const gamification = await this.getUserGamification(uid);

    if (!gamification) {
      const initialized = await this.initializeUserGamification(uid);
      return initialized.dailyChallenge;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const challengeDate = new Date(gamification.dailyChallenge.date);
    challengeDate.setHours(0, 0, 0, 0);

    // Check if it's a new day
    if (today.getTime() > challengeDate.getTime()) {
      const randomIndex = Math.floor(Math.random() * DAILY_CHALLENGES.length);
      const newChallenge: DailyChallenge = {
        challenge: DAILY_CHALLENGES[randomIndex],
        xpReward: XP_REWARDS.DAILY_CHALLENGE,
        date: today,
        completed: false
      };

      gamification.dailyChallenge = newChallenge;
      await this.saveUserGamification(uid, gamification);

      return newChallenge;
    }

    return gamification.dailyChallenge;
  }
}
