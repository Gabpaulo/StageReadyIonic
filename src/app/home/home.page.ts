import { Component } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { OnboardingService } from '../services/onboarding.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  showRegister: boolean = false;
  returnUrl: string = '/ionic/dashboard';

  constructor(
    private toastController: ToastController,
    private router: Router,
    private route: ActivatedRoute,
    private firebaseService: FirebaseService,
    private onboardingService: OnboardingService
  ) {
    // Get returnUrl from query parameters
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl'] && params['returnUrl'].startsWith('/ionic')) {
        this.returnUrl = params['returnUrl'];
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
      const toast = await this.toastController.create({
        message: `Login successful! Welcome, ${user.email} ${user.uid}`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      // Check if user needs onboarding
      if (!this.onboardingService.hasCompletedOnboarding()) {
        this.router.navigate(['/onboarding']);
      } else if (!(await this.firebaseService.userProfileExists(user.uid))) {
        this.router.navigate(['/setup-profile']);
      } else {
        // Redirect to returnUrl or default dashboard
        this.router.navigate([this.returnUrl]);
      }

    } catch (error: any) {
      const toast = await this.toastController.create({
        message: `Login failed: ${error.message}`,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  async register() {
    if (this.password !== this.confirmPassword) {
      const toast = await this.toastController.create({
        message: `Passwords do not match.`,
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        this.firebaseService.auth, 
        this.email,
        this.password
      );
      const user = userCred.user;
      const toast = await this.toastController.create({
        message: `Registration successful`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      this.toggleRegister();
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: `Registration failed: ${error.message}`,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  async signInWithGoogle() {
    try {
      const userCred = await this.firebaseService.signInWithGoogle();
      const user = userCred.user;
  
      // 1. Determine if this is the very first sign-in:
      //    Firebase Auth keeps metadata.creationTime and metadata.lastSignInTime.
      //    If they’re identical, it means this is the first time they’ve signed in.
      const isNewGoogleUser =
        user.metadata.creationTime === user.metadata.lastSignInTime;
  
      // 2. Show the same welcome toast you already have
      const toast = await this.toastController.create({
        message: `Login successful! Welcome, ${user.displayName || user.email}`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      // Check if user needs onboarding
      if (!this.onboardingService.hasCompletedOnboarding()) {
        this.router.navigate(['/onboarding']);
      } else if (isNewGoogleUser) {
        await this.firebaseService.createUserProfile(user.uid, {
          email: user.email,
          displayName: user.displayName || '',
        });
        this.router.navigate(['/setup-profile']);
      } else {
        // Redirect to returnUrl or default dashboard
        this.router.navigate([this.returnUrl]);
      }
  
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: `Google login failed: ${error.message}`,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }
}
