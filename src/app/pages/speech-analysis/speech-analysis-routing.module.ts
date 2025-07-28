import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SpeechAnalysisPage } from './speech-analysis.page';

const routes: Routes = [
  {
    path: '',
    component: SpeechAnalysisPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SpeechAnalysisPageRoutingModule {}
