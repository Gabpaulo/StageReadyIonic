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
    // Get returnUrl from query parameters
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl'] && params['returnUrl'].startsWith('/web')) {
        this.returnUrl = params['returnUrl'];
      }
    });

    // Redirect authenticated users to dashboard or returnUrl
    this.firebaseService.auth.onAuthStateChanged(user => {
      if (user) {
        const currentUrl = this.router.url;
        if (currentUrl.includes('web-login')) {
          this.router.navigate([this.returnUrl]);
        }
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
      const user = userCred.user;
      this.presentToast(`Login successful! Welcome, ${user.email}`);

      // Check if user needs onboarding
      if (!this.onboardingService.hasCompletedOnboarding()) {
        this.router.navigate(['/onboarding'], { queryParams: { returnTo: 'web' } });
      } else if (!(await this.firebaseService.userProfileExists(user.uid))) {
        this.router.navigate(['/setup-profile'], {
          queryParams: { returnUrl: this.returnUrl }
        });
      } else {
        this.router.navigate([this.returnUrl]);
      }

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
      const user = userCred.user;
      this.presentToast('Registration successful');
      this.toggleRegister();
    } catch (error: any) {
      this.presentToast(`Registration failed: ${error.message}`, 'danger');
    }
  }

  async signInWithGoogle() {
    try {
      const userCred = await this.firebaseService.signInWithGoogle();
      const user = userCred.user;

      this.presentToast(`Login successful! Welcome, ${user.displayName || user.email}`);

      // Check if user needs onboarding
      if (!this.onboardingService.hasCompletedOnboarding()) {
        this.router.navigate(['/onboarding'], { queryParams: { returnTo: 'web' } });
      } else {
        // Check if user profile exists in Firestore
        const profileExists = await this.firebaseService.userProfileExists(user.uid);

        if (!profileExists) {
          // New user - create minimal profile and redirect to setup
          await this.firebaseService.createUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName || '',
          });
          this.router.navigate(['/setup-profile'], {
            queryParams: { returnUrl: this.returnUrl }
          });
        } else {
          // Existing user - go to dashboard
          this.router.navigate([this.returnUrl]);
        }
      }

    } catch (error: any) {
      this.presentToast(`Google login failed: ${error.message}`, 'danger');
    }
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}
