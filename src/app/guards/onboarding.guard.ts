import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Blocks protected routes for users who have not completed onboarding.
 * Applied only to routes that require a complete profile (dashboard, badges, etc.).
 * The /web/onboarding route does NOT use this guard.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingGuard implements CanActivate {

  constructor(
    private firebase: FirebaseService,
    private onboardingService: OnboardingService,
    private router: Router
  ) {}

  async canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    const user = this.firebase.auth.currentUser;

    // AuthGuard already handles the unauthenticated case upstream; if
    // somehow we reach here without a user, let AuthGuard redirect.
    if (!user) return true;

    const complete = await this.onboardingService.isComplete(user.uid);
    if (!complete) {
      return this.router.createUrlTree(['/web/onboarding']);
    }
    return true;
  }
}
