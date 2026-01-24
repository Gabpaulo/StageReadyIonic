import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BadgeNotificationService } from '../../services/badge-notification.service';
import { Badge, BadgeRarity } from '../../models/badge.model';

@Component({
  selector: 'app-badge-unlock-popup',
  templateUrl: './badge-unlock-popup.component.html',
  styleUrls: ['./badge-unlock-popup.component.scss'],
  standalone: false
})
export class BadgeUnlockPopupComponent implements OnInit, OnDestroy {
  currentBadge: Badge | null = null;
  isShowing = false;
  isAnimatingIn = false;
  isAnimatingOut = false;

  private subscriptions: Subscription[] = [];

  constructor(private badgeNotificationService: BadgeNotificationService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.badgeNotificationService.currentBadge$.subscribe(badge => {
        if (badge) {
          this.currentBadge = badge;
          this.showPopup();
        }
      }),
      this.badgeNotificationService.isShowing$.subscribe(showing => {
        this.isShowing = showing;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private showPopup(): void {
    this.isAnimatingIn = true;
    this.isAnimatingOut = false;

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      this.dismiss();
    }, 4000);
  }

  dismiss(): void {
    this.isAnimatingIn = false;
    this.isAnimatingOut = true;

    setTimeout(() => {
      this.isAnimatingOut = false;
      this.badgeNotificationService.dismissCurrentBadge();
    }, 500);
  }

  getRarityClass(): string {
    if (!this.currentBadge) return '';
    return `rarity-${this.currentBadge.rarity}`;
  }

  getRarityLabel(): string {
    if (!this.currentBadge) return '';
    switch (this.currentBadge.rarity) {
      case BadgeRarity.COMMON: return 'Common';
      case BadgeRarity.RARE: return 'Rare';
      case BadgeRarity.EPIC: return 'Epic';
      case BadgeRarity.LEGENDARY: return 'Legendary';
      default: return '';
    }
  }

  getRarityColor(): string {
    if (!this.currentBadge) return '#9bb2c8';
    switch (this.currentBadge.rarity) {
      case BadgeRarity.COMMON: return '#9bb2c8';
      case BadgeRarity.RARE: return '#22a7f0';
      case BadgeRarity.EPIC: return '#9c27b0';
      case BadgeRarity.LEGENDARY: return '#ffc107';
      default: return '#9bb2c8';
    }
  }
}
