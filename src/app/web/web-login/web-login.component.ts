import { Component, OnInit } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { OnboardingService } from '../../services/onboarding.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-web-login',
  templateUrl: './web-login.component.html',
  styleUrls: ['./web-login.component.scss'],
  standalone: false
})
export class WebLoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  showRegister: boolean = false;
  returnUrl: string = '/web/dashboard';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private firebaseService: FirebaseService,
    private onboardingService: OnboardingService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl'] && params['returnUrl'].startsWith('/web')) {
        this.returnUrl = params['returnUrl'];
      }
    });

    // If the user is already signed in, send them to the right place
    this.firebaseService.auth.onAuthStateChanged(async user => {
      if (user) {
        await this.redirect(user.uid);
      }
    });
  }

  toggleRegister() {
    this.showRegister = !this.showRegister;
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
  }

  async signIn() {
    try {
      const userCred = await signInWithEmailAndPassword(
        this.firebaseService.auth,
        this.email,
        this.password
      );
      this.presentToast(`Welcome back, ${userCred.user.email}`);
      await this.redirect(userCred.user.uid);
    } catch (error: any) {
      this.presentToast(`Login failed: ${error.message}`, 'danger');
    }
  }

  async register() {
    if (this.password !== this.confirmPassword) {
      this.presentToast('Passwords do not match.', 'warning');
      return;
    }
    try {
      const userCred = await createUserWithEmailAndPassword(
        this.firebaseService.auth,
        this.email,
        this.password
      );
      this.presentToast('Registration successful! Let\'s set up your profile.');
      await this.redirect(userCred.user.uid);
    } catch (error: any) {
      this.presentToast(`Registration failed: ${error.message}`, 'danger');
    }
  }

  async signInWithGoogle() {
    try {
      const userCred = await this.firebaseService.signInWithGoogle();
      this.presentToast(`Welcome, ${userCred.user.displayName || userCred.user.email}`);
      await this.redirect(userCred.user.uid);
    } catch (error: any) {
      this.presentToast(`Google login failed: ${error.message}`, 'danger');
    }
  }

  /**
   * Single post-login routing decision:
   * - New user (no profile or onboardingComplete not set) → /web/onboarding
   * - Returning user → returnUrl (defaults to /web/dashboard)
   */
  private async redirect(uid: string) {
    // Clear cache so we always read fresh state from Firestore after login
    this.onboardingService.clearCache();
    const complete = await this.onboardingService.isComplete(uid);

    if (!complete) {
      this.router.navigate(['/web/onboarding'], { replaceUrl: true });
    } else {
      this.router.navigate([this.returnUrl], { replaceUrl: true });
    }
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}
