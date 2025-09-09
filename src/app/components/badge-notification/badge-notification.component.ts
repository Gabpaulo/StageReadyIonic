import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Badge } from '../../models/badge.model';
import { BadgeRarity } from '../../models/badge.model';

@Component({
  selector: 'app-badge-notification',
  templateUrl: './badge-notification.component.html',
  styleUrls: ['./badge-notification.component.scss'],
  standalone: false
})
export class BadgeNotificationComponent implements OnInit, OnDestroy {
  @Input() badge!: Badge;
  @Input() show: boolean = false;
  
  private hideTimeout: any;

  constructor() { }

  ngOnInit() {
    if (this.show) {
      this.startHideTimer();
    }
  }

  ngOnDestroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  startHideTimer() {
    this.hideTimeout = setTimeout(() => {
      this.show = false;
    }, 5000); // Hide after 5 seconds
  }

  getRarityAnimation(): string {
    switch (this.badge.rarity) {
      case BadgeRarity.COMMON:
        return 'bounce-in';
      case BadgeRarity.RARE:
        return 'slide-in-left';
      case BadgeRarity.EPIC:
        return 'zoom-in';
      case BadgeRarity.LEGENDARY:
        return 'pulse';
      default:
        return 'bounce-in';
    }
  }

  getRarityGlow(): string {
    switch (this.badge.rarity) {
      case BadgeRarity.COMMON:
        return 'glow-gray';
      case BadgeRarity.RARE:
        return 'glow-blue';
      case BadgeRarity.EPIC:
        return 'glow-purple';
      case BadgeRarity.LEGENDARY:
        return 'glow-orange';
      default:
        return 'glow-gray';
    }
  }

  closeNotification() {
    this.show = false;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}
