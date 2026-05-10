import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';

/**
 * Tracks whether the current user has completed onboarding.
 *
 * Source of truth: Firestore `users/{uid}.onboardingComplete === true`.
 * Falls back to `firstName` being set (handles users who had profiles before
 * this field was introduced).
 *
 * Result is cached in memory for the session so every route guard
 * navigation does not trigger an extra Firestore read.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {

  private _cachedStatus: boolean | null = null;

  constructor(private firebase: FirebaseService) {}

  async isComplete(uid: string): Promise<boolean> {
    if (this._cachedStatus !== null) return this._cachedStatus;

    const profile = await this.firebase.getUserProfile(uid);
    // A profile with onboardingComplete: true is fully onboarded.
    // A profile that already has a firstName was set up before this field
    // existed — treat it as onboarded so existing users aren't forced through
    // the flow again.
    this._cachedStatus = !!(profile?.onboardingComplete || profile?.firstName);
    return this._cachedStatus;
  }

  /** Call after the user successfully finishes the onboarding form. */
  markComplete(): void {
    this._cachedStatus = true;
  }

  /** Call on logout so the next sign-in re-reads from Firestore. */
  clearCache(): void {
    this._cachedStatus = null;
  }
}
