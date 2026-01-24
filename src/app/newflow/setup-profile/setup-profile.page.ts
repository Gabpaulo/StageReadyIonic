import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-setup-profile',
  templateUrl: './setup-profile.page.html',
  styleUrls: ['./setup-profile.page.scss'],
  standalone: false,
})
export class SetupProfilePage implements OnInit {
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

  returnUrl: string = '/ionic/dashboard'; // Default to ionic

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get returnUrl from query parameters to determine which dashboard to navigate to
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      } else {
        // Detect based on current URL
        const currentUrl = this.router.url;
        if (currentUrl.includes('/web')) {
          this.returnUrl = '/web/dashboard';
        }
      }
    });
  }

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

    // Navigate to the correct dashboard based on returnUrl
    this.router.navigate([this.returnUrl]);
  }

  onInterestsChange() {
  this.interests = this.interestsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  }

}
