import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BadgeDisplayComponent } from './badge-display.component';

@NgModule({
  declarations: [BadgeDisplayComponent],
  imports: [CommonModule, IonicModule],
  exports: [BadgeDisplayComponent]
})
export class BadgeDisplayModule { }
