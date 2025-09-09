import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { BadgeCollectionComponent } from './badge-collection.component';
import { BadgeDisplayModule } from '../badge-display/badge-display.module';

@NgModule({
  declarations: [BadgeCollectionComponent],
  imports: [CommonModule, IonicModule, FormsModule, BadgeDisplayModule],
  exports: [BadgeCollectionComponent]
})
export class BadgeCollectionModule { }
