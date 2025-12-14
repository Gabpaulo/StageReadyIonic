import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private firebaseService: FirebaseService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    console.log('AuthGuard: Checking access for', state.url);
    
    // Check if auth is initialized and user exists
    const currentUser = this.firebaseService.auth.currentUser;
    if (currentUser) {
      console.log('AuthGuard: User authenticated, allowing access');
      return true;
    }

    // Wait for auth state to be determined
    return new Promise((resolve) => {
      console.log('AuthGuard: No current user, waiting for auth state...');
      
      // Set a timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        console.log('AuthGuard: Timeout waiting for auth state, redirecting to login');
        this.redirectToLogin(state.url);
        resolve(false);
      }, 2000); // 2 second timeout

      // Listen for auth state changes
      const unsubscribe = this.firebaseService.auth.onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe(); // Unsubscribe after first emission
        
        if (user) {
          console.log('AuthGuard: User authenticated via onAuthStateChanged, allowing access');
          resolve(true);
        } else {
          console.log('AuthGuard: No user found, redirecting to login');
          this.redirectToLogin(state.url);
          resolve(false);
        }
      });
    });
  }

  private redirectToLogin(originalUrl: string): void {
    // Determine which login page to use based on the original URL
    if (originalUrl.startsWith('/web')) {
      console.log('AuthGuard: Redirecting to /web/login with returnUrl:', originalUrl);
      this.router.navigate(['/web/login'], { 
        queryParams: { returnUrl: originalUrl },
        replaceUrl: true // Replace current history entry to prevent back button issues
      });
    } else if (originalUrl.startsWith('/ionic')) {
      console.log('AuthGuard: Redirecting to /ionic-login with returnUrl:', originalUrl);
      this.router.navigate(['/ionic-login'], { 
        queryParams: { returnUrl: originalUrl },
        replaceUrl: true
      });
    } else {
      // Default to web login
      console.log('AuthGuard: Redirecting to /web/login (default)');
      this.router.navigate(['/web/login'], { 
        queryParams: { returnUrl: originalUrl },
        replaceUrl: true
      });
    }
  }
}
