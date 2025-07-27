// firebase.service.ts
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore,doc, getDoc } from 'firebase/firestore';
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

//check if user profile documents exists
   async userProfileExists(uid: string): Promise<boolean> {
  if (!uid) return false; // prevent null/undefined checks
  const docRef = doc(this.firestore, `users/${uid}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}


}


