import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private readonly ONBOARDING_KEY = 'hasCompletedOnboarding';

  constructor() { }

  hasCompletedOnboarding(): boolean {
    return localStorage.getItem(this.ONBOARDING_KEY) === 'true';
  }

  setOnboardingCompleted(): void {
    localStorage.setItem(this.ONBOARDING_KEY, 'true');
  }

  resetOnboarding(): void {
    localStorage.removeItem(this.ONBOARDING_KEY);
  }
}
