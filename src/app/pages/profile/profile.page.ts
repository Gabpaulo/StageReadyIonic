import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { BadgeService } from '../../services/badge.service';
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

  constructor(
    private firebaseService: FirebaseService,
    public badgeService: BadgeService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.loadProfile();
  }

  ionViewWillEnter() {
    // Refresh profile each time view becomes active
    this.loadProfile();
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
        const updatedProfile = {
          firstName: this.formData.firstName,
          lastName: this.formData.lastName,
          age: this.formData.age,
          phone: this.formData.phone,
          phoneNumber: this.formData.phone,
          gender: this.formData.gender,
          interests: this.formData.interests,
          bio: this.formData.bio
        };
        
        await this.firebaseService.updateUserProfile(user.uid, updatedProfile);
        await this.loadProfile();
        this.editModalOpen = false;
        
        // Check for badge achievements related to profile completion
        await this.badgeService.onProfileUpdated(updatedProfile);
      } else {
        this.error = 'No user is currently logged in.';
      }
    } catch (err) {
      this.error = 'Failed to update profile.';
    } finally {
      this.saving = false;
    }
  }

  async logout() {
    try {
      await this.firebaseService.logout();
      // Clear local state so old user data isn't shown
      this.userProfile = null;
      this.formData = {};
      this.error = null;
      // Navigate to onboarding/login and replace history
      this.router.navigateByUrl('/onboarding', { replaceUrl: true });
    } catch (error) {
      console.error('Error during logout:', error);
      this.error = 'Failed to logout. Please try again.';
    }
  }
}
