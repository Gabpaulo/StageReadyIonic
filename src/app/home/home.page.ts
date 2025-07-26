import { Component } from '@angular/core';
import { signInWithEmailAndPassword } from "firebase/auth";
import {auth} from '../app.module'; // Import auth from app module
import { ToastController } from '@ionic/angular';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  email:string=''; 
  password:string=''; 

 constructor(private toastController: ToastController) {}

 signInWithEmailAndPassword(){
    signInWithEmailAndPassword(auth, this.email, this.password)
      .then(async (userCredential) => {
        // Signed in 
        const user = userCredential.user;
        console.log('User signed in:', user);
        const toast = await this.toastController.create({
        message: 'Login successful! , welcome ' + user,
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error signing in:', errorCode, errorMessage);
      });
  }

}
