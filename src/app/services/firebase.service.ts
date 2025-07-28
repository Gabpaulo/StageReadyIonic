import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private firebaseApp: FirebaseApp;
  public auth: Auth;
  public firestore: Firestore;

  constructor() {
    this.firebaseApp = initializeApp(environment.firebaseConfig);
    this.auth = getAuth(this.firebaseApp);
    this.firestore = getFirestore(this.firebaseApp);
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
}
