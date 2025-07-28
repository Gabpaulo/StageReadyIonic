import { Component } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

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

  constructor(
    private toastController: ToastController,
    private router: Router,
    private firebaseService: FirebaseService 
  ) {}

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
      if (!(await this.firebaseService.userProfileExists(user.uid))) {
        this.router.navigate(['/setup-profile']);
      } else {
        this.router.navigate(['/tabs/dashboard']);
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
}
