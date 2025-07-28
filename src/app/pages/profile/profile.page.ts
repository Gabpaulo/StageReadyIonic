import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone:false
})
export class ProfilePage implements OnInit {
  public userProfile: any = null;
  public loading: boolean = true;
  public error: string | null = null;
  public editModalOpen: boolean = false;
  public formData: any = {};
  public saving: boolean = false;
  public interestOptions: string[] = [
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

  constructor(private firebaseService: FirebaseService) { }

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    this.loading = true;
    this.error = null;
    try {
      const user = this.firebaseService.auth.currentUser;
      if (user) {
        this.userProfile = await this.firebaseService.getUserProfile(user.uid);
        this.formData = {
          firstName: this.userProfile.firstName || '',
          lastName: this.userProfile.lastName || '',
          age: this.userProfile.age || '',
          phone: this.userProfile.phone || this.userProfile.phoneNumber || '',
          gender: this.userProfile.gender || '',
          interests: Array.isArray(this.userProfile.interests) ? [...this.userProfile.interests] : [],
          bio: this.userProfile.bio || ''
        };
      } else {
        this.error = 'No user is currently logged in.';
      }
    } catch (err) {
      this.error = 'Failed to load user profile.';
    } finally {
      this.loading = false;
    }
  }

  openEditModal() {
    this.formData = {
      firstName: this.userProfile.firstName || '',
      lastName: this.userProfile.lastName || '',
      age: this.userProfile.age || '',
      phone: this.userProfile.phone || this.userProfile.phoneNumber || '',
      gender: this.userProfile.gender || '',
      interests: Array.isArray(this.userProfile.interests) ? [...this.userProfile.interests] : [],
      bio: this.userProfile.bio || ''
    };
    this.editModalOpen = true;
  }

  closeEditModal() {
    this.editModalOpen = false;
  }

  async saveProfile() {
    this.saving = true;
    this.error = null;
    try {
      const user = this.firebaseService.auth.currentUser;
      if (user) {
        await this.firebaseService.updateUserProfile(user.uid, {
          firstName: this.formData.firstName,
          lastName: this.formData.lastName,
          age: this.formData.age,
          phone: this.formData.phone,
          phoneNumber: this.formData.phone,
          gender: this.formData.gender,
          interests: this.formData.interests,
          bio: this.formData.bio
        });
        await this.loadProfile();
        this.editModalOpen = false;
      } else {
        this.error = 'No user is currently logged in.';
      }
    } catch (err) {
      this.error = 'Failed to update profile.';
    } finally {
      this.saving = false;
    }
  }
}
