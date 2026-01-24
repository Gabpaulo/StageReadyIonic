import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Badge } from '../models/badge.model';

@Injectable({
  providedIn: 'root'
})
export class BadgeNotificationService {
  private badgeQueueSubject = new BehaviorSubject<Badge[]>([]);
  public badgeQueue$ = this.badgeQueueSubject.asObservable();

  private currentBadgeSubject = new BehaviorSubject<Badge | null>(null);
  public currentBadge$ = this.currentBadgeSubject.asObservable();

  private isShowingSubject = new BehaviorSubject<boolean>(false);
  public isShowing$ = this.isShowingSubject.asObservable();

  constructor() {}

  showBadgeUnlock(badges: Badge | Badge[]): void {
    const badgeArray = Array.isArray(badges) ? badges : [badges];
    if (badgeArray.length === 0) return;

    const currentQueue = this.badgeQueueSubject.value;
    this.badgeQueueSubject.next([...currentQueue, ...badgeArray]);

    // If not currently showing, start showing
    if (!this.isShowingSubject.value) {
      this.showNextBadge();
    }
  }

  private showNextBadge(): void {
    const queue = this.badgeQueueSubject.value;
    if (queue.length === 0) {
      this.isShowingSubject.next(false);
      this.currentBadgeSubject.next(null);
      return;
    }

    const [nextBadge, ...remainingBadges] = queue;
    this.badgeQueueSubject.next(remainingBadges);
    this.currentBadgeSubject.next(nextBadge);
    this.isShowingSubject.next(true);
  }

  dismissCurrentBadge(): void {
    this.currentBadgeSubject.next(null);
    // Small delay before showing next badge
    setTimeout(() => {
      this.showNextBadge();
    }, 300);
  }

  clearAllBadges(): void {
    this.badgeQueueSubject.next([]);
    this.currentBadgeSubject.next(null);
    this.isShowingSubject.next(false);
  }
}
