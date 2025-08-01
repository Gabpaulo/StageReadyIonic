import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-setup-profile',
  templateUrl: './setup-profile.page.html',
  styleUrls: ['./setup-profile.page.scss'],
  standalone: false,
})
export class SetupProfilePage {
  firstName = '';
  lastName = '';
  age!: number;
  phoneNumber = '';
  gender = '';
  interestsString = '';
  interests: string[] = []; // Could be chosen from chips/tags UI
  interestOptions: string[] = [
  'Public Speaking',
  'Debate',
  'Storytelling',
  'Improv',
  'Motivational Speaking',
  'Interview Practice',
  'Hosting',
  'Pitching Ideas',
  'Confidence Building'
];



  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  async saveProfile() {
    const user = this.firebaseService.auth.currentUser;
    if (!user) return;

    const profileData = {
      firstName: this.firstName,
      lastName: this.lastName,
      age: this.age,
      phoneNumber: this.phoneNumber,
      gender: this.gender,
      interests: this.interests,
      email: user.email || ''
    };
    await this.firebaseService.createUserProfile(user.uid, profileData);
    this.router.navigate(['/tabs/dashboard']);
  }

  onInterestsChange() {
  this.interests = this.interestsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  }
  
}
