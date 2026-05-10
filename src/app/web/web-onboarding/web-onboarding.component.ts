import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { OnboardingService } from '../../services/onboarding.service';

interface OnboardingData {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  interests: string[];
  defaultSpeechType: string;
}

@Component({
  selector: 'app-web-onboarding',
  templateUrl: './web-onboarding.component.html',
  styleUrls: ['./web-onboarding.component.scss'],
  standalone: false
})
export class WebOnboardingComponent implements OnInit {
  currentStep = 0;
  isSaving = false;

  readonly TOTAL_STEPS = 4;

  readonly INTEREST_OPTIONS = [
    'Public Speaking', 'Debate', 'Storytelling', 'Improv',
    'Motivational Speaking', 'Interview Practice', 'Hosting',
    'Pitching Ideas', 'Confidence Building'
  ];

  readonly SPEECH_TYPES = [
    {
      value: 'informative',
      label: 'Informative',
      icon: 'school',
      desc: 'Share knowledge and facts clearly'
    },
    {
      value: 'persuasive',
      label: 'Persuasive',
      icon: 'record_voice_over',
      desc: 'Change minds and inspire action'
    },
    {
      value: 'motivational',
      label: 'Motivational',
      icon: 'emoji_events',
      desc: 'Energize and uplift your audience'
    }
  ];

  formData: OnboardingData = {
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    interests: [],
    defaultSpeechType: 'informative'
  };

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private onboardingService: OnboardingService
  ) {}

  async ngOnInit() {
    const user = this.firebaseService.auth.currentUser;
    if (!user) {
      this.router.navigate(['/web/login']);
      return;
    }

    // Already onboarded — skip to dashboard
    const complete = await this.onboardingService.isComplete(user.uid);
    if (complete) {
      this.router.navigate(['/web/dashboard']);
      return;
    }

    // Pre-fill from Google display name
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      this.formData.firstName = parts[0] || '';
      this.formData.lastName  = parts.slice(1).join(' ') || '';
    }
  }

  nextStep() {
    if (this.currentStep < this.TOTAL_STEPS - 1) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  toggleInterest(interest: string) {
    const idx = this.formData.interests.indexOf(interest);
    if (idx > -1) {
      this.formData.interests.splice(idx, 1);
    } else {
      this.formData.interests.push(interest);
    }
  }

  isInterestSelected(interest: string): boolean {
    return this.formData.interests.includes(interest);
  }

  canProceedStep1(): boolean {
    return this.formData.firstName.trim().length > 0 &&
           this.formData.lastName.trim().length > 0;
  }

  get progressPercent(): number {
    return ((this.currentStep) / (this.TOTAL_STEPS - 1)) * 100;
  }

  async completeOnboarding() {
    const user = this.firebaseService.auth.currentUser;
    if (!user || this.isSaving) return;

    this.isSaving = true;
    try {
      await this.firebaseService.updateUserProfile(user.uid, {
        email:             user.email,
        displayName:       `${this.formData.firstName} ${this.formData.lastName}`.trim(),
        firstName:         this.formData.firstName.trim(),
        lastName:          this.formData.lastName.trim(),
        age:               this.formData.age || null,
        gender:            this.formData.gender || null,
        interests:         this.formData.interests,
        defaultSpeechType: this.formData.defaultSpeechType,
        onboardingComplete: true,
      });
      this.onboardingService.markComplete();
      this.router.navigate(['/web/dashboard']);
    } catch (err) {
      console.error('[Onboarding] Save failed:', err);
      this.isSaving = false;
    }
  }
}
