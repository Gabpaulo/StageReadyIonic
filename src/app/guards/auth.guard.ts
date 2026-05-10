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

    const currentUser = this.firebaseService.auth.currentUser;
    if (currentUser) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.router.navigate(['/web/login'], { queryParams: { returnUrl: state.url }, replaceUrl: true });
        resolve(false);
      }, 2000);

      const unsubscribe = this.firebaseService.auth.onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe();

        if (user) {
          resolve(true);
        } else {
          this.router.navigate(['/web/login'], { queryParams: { returnUrl: state.url }, replaceUrl: true });
          resolve(false);
        }
      });
    });
  }
}
