import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SpeechFeedbackPageRoutingModule } from './speech-feedback-routing.module';

import { SpeechFeedbackPage } from './speech-feedback.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SpeechFeedbackPageRoutingModule
  ],
  declarations: [SpeechFeedbackPage]
})
export class SpeechFeedbackPageModule {}
