import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { PlatformRoutingService } from './services/platform-routing.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  canInstall = false;
  private deferredPrompt: any = null;

  constructor(
    private toastController: ToastController,
    private swUpdate: SwUpdate,
    private platformRoutingService: PlatformRoutingService,
    private router: Router
  ) {
    this.setupInstallPromptListener();
    this.setupNetworkStatusToasts();
    this.setupServiceWorkerUpdateNotifications();
    this.setupPlatformRouting();
  }

  private setupPlatformRouting() {
    // Initialize platform routing on first load
    this.platformRoutingService.initializePlatformRouting();

    // Monitor navigation to ensure correct platform routes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // You can add additional logic here if needed
    });
  }

  installApp = async () => {
    if (!this.deferredPrompt) {
      return;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.presentToast('Installing…', 'primary');
    }
    this.deferredPrompt = null;
    this.canInstall = false;
  };

  private setupInstallPromptListener() {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as any;
      this.canInstall = true;
    });

    window.addEventListener('appinstalled', () => {
      this.presentToast('App installed', 'success');
      this.deferredPrompt = null;
      this.canInstall = false;
    });
  }

  private setupNetworkStatusToasts() {
    window.addEventListener('online', () => this.presentToast('Back online', 'success'));
    window.addEventListener('offline', () => this.presentToast('You are offline', 'warning'));
  }

  private setupServiceWorkerUpdateNotifications() {
    if (!this.swUpdate.isEnabled) {
      return;
    }
    this.swUpdate.versionUpdates.subscribe(async (event) => {
      const versionReady = (event as VersionReadyEvent);
      if ((versionReady as any).type === 'VERSION_READY') {
        const toast = await this.toastController.create({
          message: 'A new version is available',
          color: 'tertiary',
          duration: 10000,
          buttons: [
            {
              text: 'Reload',
              role: 'reload',
              handler: () => {
                document.location.reload();
              }
            }
          ]
        });
        await toast.present();
      }
    });
  }

  private async presentToast(message: string, color: 'primary' | 'success' | 'warning' | 'tertiary') {
    const toast = await this.toastController.create({ message, color, duration: 2500 });
    await toast.present();
  }
}
