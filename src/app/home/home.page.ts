import { Component } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../app.module';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone:false
})
export class HomePage {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  showRegister: boolean = false;

  constructor(
    private toastController: ToastController,
    private router: Router
  ) {}

  toggleRegister() {
    this.showRegister = !this.showRegister;
    // clear fields when switching
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
  }

  async signIn() {
    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        this.email,
        this.password
      );
      const user = userCred.user;
      const toast = await this.toastController.create({
        message: `Login successful! Welcome, ${user.email}`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();
      this.router.navigate(['/dashboard']);
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
    // extra check just in case
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
        auth,
        this.email,
        this.password
      );
      const user = userCred.user;
      const toast = await this.toastController.create({
        message: `Registration successful! You can now log in as ${user.email}`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();
      this.toggleRegister(); // switch back to login
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
