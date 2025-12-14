import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { UserBadgeProgress } from '../models/badge.model';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../models/speech-history.model';
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
      return docSnap.data();
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
      return docSnap.data() as UserBadgeProgress;
    }
    return null;
  }

  async saveUserBadges(uid: string, badgeProgress: UserBadgeProgress): Promise<void> {
    const userRef = doc(this.firestore, `userBadges/${uid}`);
    await setDoc(userRef, {
      ...badgeProgress,
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

    let consecutiveDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const doc of querySnapshot.docs) {
      const speechData = doc.data();
      const speechDate = speechData['createdAt']?.toDate();
      if (speechDate) {
        speechDate.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today.getTime() - speechDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === consecutiveDays) {
          consecutiveDays++;
          today.setDate(today.getDate() - 1);
        } else {
          break;
        }
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
    
    // Calculate additional metrics
    const wordCount = speechData.feedback.transcript.split(' ').length;
    const duration = speechData.duration || 0; // in seconds
    const averagePace = duration > 0 ? (wordCount / duration) * 60 : 0; // words per minute
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
    
    const baseEntry: any = {
      id: historyRef.id,
      userId: uid,
      transcript: speechData.feedback.transcript,
      speechType: speechData.speechType,
      feedback: {
        speech_pace: speechData.feedback.speech_pace,
        pausing_fluency: speechData.feedback.pausing_fluency,
        loud_control: speechData.feedback.loud_control,
        pitch_variation: speechData.feedback.pitch_variation,
        articulation_clarity: speechData.feedback.articulation_clarity,
        expressive_emph: speechData.feedback.expressive_emph,
        filler_words_score: speechData.feedback.filler_words_score,
        overall: speechData.feedback.overall,
        pace_feedback: speechData.feedback.pace_feedback,
        tone_feedback: speechData.feedback.tone_feedback,
        clarity_feedback: speechData.feedback.clarity_feedback,
        strengths: speechData.feedback.strengths,
        areas_improvement: speechData.feedback.areas_improvement,
        filler_words: speechData.feedback.filler_words
      },
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
      return {
        ...data,
        createdAt: data['createdAt'].toDate(),
      } as SpeechHistoryEntry;
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
      return {
        ...data,
        createdAt: data['createdAt'].toDate(),
      } as SpeechHistoryEntry;
    });

    const totalSessions = entries.length;
    const totalWords = entries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
    const totalDuration = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const lastSession = entries[0]?.createdAt;

    // Calculate average ratings (convert text to numbers)
    const clarityScores = entries.map(entry => this.ratingToNumber(entry.feedback.clarity));
    const paceScores = entries.map(entry => this.ratingToNumber(entry.feedback.pace));
    const toneScores = entries.map(entry => this.ratingToNumber(entry.feedback.tone));

    const averageClarity = clarityScores.reduce((sum, score) => sum + score, 0) / clarityScores.length;
    const averagePace = paceScores.reduce((sum, score) => sum + score, 0) / paceScores.length;
    const averageTone = toneScores.reduce((sum, score) => sum + score, 0) / toneScores.length;

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
      return sum + this.ratingToNumber(entry.feedback.clarity) + 
             this.ratingToNumber(entry.feedback.pace) + 
             this.ratingToNumber(entry.feedback.tone);
    }, 0) / (recent.length * 3);

    const olderAvg = older.reduce((sum, entry) => {
      return sum + this.ratingToNumber(entry.feedback.clarity) + 
             this.ratingToNumber(entry.feedback.pace) + 
             this.ratingToNumber(entry.feedback.tone);
    }, 0) / (older.length * 3);

    const difference = recentAvg - olderAvg;
    
    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }
}
