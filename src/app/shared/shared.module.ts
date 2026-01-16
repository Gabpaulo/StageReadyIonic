import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PracticeCalendarComponent } from '../components/practice-calendar/practice-calendar.component';

@NgModule({
  declarations: [
    PracticeCalendarComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    PracticeCalendarComponent
  ]
})
export class SharedModule { }
