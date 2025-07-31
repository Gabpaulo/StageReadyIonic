import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SpeechFeedbackPage } from './speech-feedback.page';

const routes: Routes = [
  {
    path: '',
    component: SpeechFeedbackPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SpeechFeedbackPageRoutingModule {}
