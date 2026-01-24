import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { BadgeService } from '../../services/badge.service';
import { User } from 'firebase/auth';
import { SpeechHistoryEntry, SpeechHistorySummary } from '../../models/speech-history.model';

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
  public summary: SpeechHistorySummary | null = null;
  public recentSpeeches: SpeechHistoryEntry[] = [];
  public currentUserEmail: string | null = null;
  public currentUserPhotoURL: string | null = null;
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
      // Wait for auth state to be ready
      const user = await new Promise<any>((resolve) => {
        const unsubscribe = this.firebaseService.auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (user) {
        this.userProfile = await this.firebaseService.getUserProfile(user.uid);
        if (this.userProfile) {
          this.currentUserEmail = user.email || null;
          this.currentUserPhotoURL = (user.photoURL as string) || null;
          this.formData = {
            firstName: this.userProfile.firstName || '',
            lastName: this.userProfile.lastName || '',
            age: this.userProfile.age || '',
            phone: this.userProfile.phone || this.userProfile.phoneNumber || '',
            gender: this.userProfile.gender || '',
            interests: Array.isArray(this.userProfile.interests) ? [...this.userProfile.interests] : [],
            bio: this.userProfile.bio || '',
            defaultSpeechType: this.userProfile.defaultSpeechType || 'informative'
          };

          // Load user speech stats and recent sessions
          const [summary, history] = await Promise.all([
            this.firebaseService.getSpeechHistorySummary(user.uid),
            this.firebaseService.getSpeechHistory(user.uid, 3)
          ]);
          this.summary = summary;
          this.recentSpeeches = history;
        } else {
          // If user profile doesn't exist, initialize with default values
          this.userProfile = {};
          this.currentUserEmail = user.email || null;
          this.currentUserPhotoURL = (user.photoURL as string) || null;
          this.formData = {
            firstName: '', lastName: '', age: '', phone: '', gender: '',
            interests: [], bio: '', defaultSpeechType: 'informative'
          };
          this.summary = null;
          this.recentSpeeches = [];
        }
      } else {
        this.error = 'No user is currently logged in.';
      }
    } catch (err) {
      console.error('Error loading profile:', err);
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
      bio: this.userProfile.bio || '',
      defaultSpeechType: this.userProfile.defaultSpeechType || 'informative'
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
          bio: this.formData.bio,
          defaultSpeechType: this.formData.defaultSpeechType || 'informative'
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
      // Navigate to ionic login and replace history
      this.router.navigateByUrl('/ionic-login', { replaceUrl: true });
    } catch (error) {
      console.error('Error during logout:', error);
      this.error = 'Failed to logout. Please try again.';
    }
  }

  formatDuration(seconds: number | undefined | null): string {
    const totalSeconds = Math.floor(seconds || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getBadgeIconPath(badge: any): string {
    if (!badge || !badge.icon) {
      return '/assets/badges/first-step.svg';
    }
    // Ensure path starts with / for absolute path from root
    if (badge.icon.startsWith('/')) {
      return badge.icon;
    }
    return '/' + badge.icon;
  }

  onBadgeImageError(event: any, badge: any): void {
    console.error('Badge icon failed to load:', badge.icon);
    // Fallback to a default icon
    event.target.src = '/assets/badges/first-step.svg';
  }
}
