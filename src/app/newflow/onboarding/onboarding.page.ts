import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  private returnTo: string = 'ionic';

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private route: ActivatedRoute,
    private onboardingService: OnboardingService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.returnTo = params['returnTo'] ?? 'ionic';
    });
  }

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
    this.onboardingService.setOnboardingCompleted();

    const user = this.firebaseService.auth.currentUser;
    const dashboard = this.returnTo === 'web' ? '/web/dashboard' : '/ionic/dashboard';

    if (user && !(await this.firebaseService.userProfileExists(user.uid))) {
      this.router.navigate(['/setup-profile'], {
        queryParams: { returnUrl: dashboard }
      });
    } else {
      this.router.navigate([dashboard]);
    }
  }
}
