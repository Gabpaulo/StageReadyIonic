import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private deferredPrompt: any = null;

  constructor(
    private toastController: ToastController,
    private swUpdate: SwUpdate
  ) {
    this.setupInstallPromptListener();
    this.setupNetworkStatusToasts();
    this.setupServiceWorkerUpdateNotifications();
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
  };

  private setupInstallPromptListener() {
    // Offer install as a toast — a header here would sit on top of the
    // shell's app bar and hide the menu/logout buttons.
    window.addEventListener('beforeinstallprompt', async (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as any;
      const toast = await this.toastController.create({
        message: 'Install StageReady on this device?',
        position: 'top',
        duration: 8000,
        buttons: [
          { text: 'Install', handler: () => { this.installApp(); } },
          { text: 'Not now', role: 'cancel' }
        ]
      });
      await toast.present();
    });

    window.addEventListener('appinstalled', () => {
      this.presentToast('App installed', 'success');
      this.deferredPrompt = null;
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
