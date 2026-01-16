import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PlatformRoutingService {

  constructor(
    private platform: Platform,
    private router: Router
  ) {}

  /**
   * Check if the app is running on a mobile platform (native app)
   */
  isMobilePlatform(): boolean {
    return this.platform.is('capacitor') ||
           this.platform.is('cordova') ||
           this.platform.is('hybrid');
  }

  /**
   * Check if the app is running on web
   */
  isWebPlatform(): boolean {
    return !this.isMobilePlatform();
  }

  /**
   * Get the appropriate route prefix based on platform
   */
  getRoutePrefix(): string {
    return this.isMobilePlatform() ? '/ionic' : '/web';
  }

  /**
   * Navigate to the appropriate platform route
   */
  navigateToPlatformRoute(route: string, queryParams?: any): void {
    const prefix = this.getRoutePrefix();
    const fullRoute = `${prefix}/${route}`;
    this.router.navigate([fullRoute], { queryParams });
  }

  /**
   * Get the appropriate login route based on platform
   */
  getLoginRoute(): string {
    return this.isMobilePlatform() ? '/ionic-login' : '/web/login';
  }

  /**
   * Get the appropriate dashboard route based on platform
   */
  getDashboardRoute(): string {
    return this.isMobilePlatform() ? '/ionic/dashboard' : '/web/dashboard';
  }

  /**
   * Navigate to the appropriate login page
   */
  navigateToLogin(returnUrl?: string): void {
    const loginRoute = this.getLoginRoute();
    if (returnUrl) {
      this.router.navigate([loginRoute], { queryParams: { returnUrl } });
    } else {
      this.router.navigate([loginRoute]);
    }
  }

  /**
   * Navigate to the appropriate dashboard
   */
  navigateToDashboard(): void {
    const dashboardRoute = this.getDashboardRoute();
    this.router.navigate([dashboardRoute]);
  }

  /**
   * Redirect to the appropriate platform on app initialization
   */
  initializePlatformRouting(): void {
    const currentUrl = this.router.url;

    // If at root, redirect to appropriate login
    if (currentUrl === '/' || currentUrl === '') {
      this.navigateToLogin();
      return;
    }

    // If on web routes but on mobile platform, redirect to ionic equivalent
    if (this.isMobilePlatform() && currentUrl.startsWith('/web')) {
      const path = currentUrl.replace('/web', '/ionic');
      this.router.navigateByUrl(path);
    }

    // If on ionic routes but on web platform, redirect to web equivalent
    if (this.isWebPlatform() && currentUrl.startsWith('/ionic')) {
      const path = currentUrl.replace('/ionic', '/web');
      this.router.navigateByUrl(path);
    }
  }
}
