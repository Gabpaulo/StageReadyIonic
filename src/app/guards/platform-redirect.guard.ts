import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PlatformRedirectGuard implements CanActivate {

  constructor(
    private platform: Platform,
    private router: Router
  ) {}

  canActivate(): boolean {
    // Determine if running on mobile (Capacitor/Cordova) or web
    const isMobile = this.platform.is('capacitor') ||
                     this.platform.is('cordova') ||
                     this.platform.is('hybrid');

    // Redirect to appropriate login based on platform
    if (isMobile) {
      this.router.navigate(['/ionic-login']);
    } else {
      this.router.navigate(['/web/login']);
    }

    return false; // Prevent navigation to empty route
  }
}
