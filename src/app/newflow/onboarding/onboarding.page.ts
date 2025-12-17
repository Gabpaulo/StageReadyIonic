import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false
})
export class OnboardingPage implements OnInit {
  @ViewChild('swiperEl', { static: false }) swiperElRef!: ElementRef;

  onboardingSlides = [
    {
      image: 'assets/onboarding/onboarding1.svg',
      title: 'Welcome to Stage Ready',
      description: 'Your companion for confident, polished performances.',
    },
    {
      image: 'assets/onboarding/trackprogress.svg',
      title: 'Track Your Progress',
      description: 'Monitor your growth and fine-tune your routine.',
    },
    {
      image: 'assets/onboarding/shineonstage.svg',
      title: 'Practice Makes Perfect',
      description: 'Record and analyze your speeches to improve.',
    },
    {
      image: 'assets/onboarding/shineonstage.svg',
      title: 'Shine On Stage',
      description: 'Be at your best when it matters most.',
    },
  ];

  isLastSlide = false;

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private onboardingService: OnboardingService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {}

  onSlideChange(event: Event) {
    const swiper = (event.target as any).swiper;
    this.ngZone.run(() => {
      this.isLastSlide = swiper.activeIndex === this.onboardingSlides.length - 1;
    });
  }

  nextSlide() {
    const swiperEl = this.swiperElRef.nativeElement;
    swiperEl.swiper.slideNext();
  }

  async completeOnboarding() {
    // Mark onboarding as completed
    this.onboardingService.setOnboardingCompleted();

    // Check if user needs to set up profile
    const user = this.firebaseService.auth.currentUser;
    if (user && !(await this.firebaseService.userProfileExists(user.uid))) {
      this.router.navigate(['/setup-profile']);
    } else {
      this.router.navigate(['/ionic/dashboard']);
    }
  }
}
