import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BadgeNotificationComponent } from './badge-notification.component';

@NgModule({
  declarations: [BadgeNotificationComponent],
  imports: [CommonModule, IonicModule],
  exports: [BadgeNotificationComponent]
})
export class BadgeNotificationModule { }
