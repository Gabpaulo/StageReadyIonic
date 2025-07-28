import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';


import { IonicModule } from '@ionic/angular';

import { SpeechAnalysisPageRoutingModule } from './speech-analysis-routing.module';

import { SpeechAnalysisPage } from './speech-analysis.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SpeechAnalysisPageRoutingModule,
    HttpClientModule
  ],
  declarations: [SpeechAnalysisPage]
})
export class SpeechAnalysisPageModule {}
