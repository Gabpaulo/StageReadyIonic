import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';

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
      title: 'Track Your Progress',
      description: 'Monitor your growth and fine-tune your routine.',
    },
    {
      image: 'assets/onboarding/shineonstage.svg',
      title: 'Shine On Stage',
      description: 'Be at your best when it matters most.',
    },
  ];

  isLastSlide = false;

  constructor(private ngZone: NgZone) {}

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
}
