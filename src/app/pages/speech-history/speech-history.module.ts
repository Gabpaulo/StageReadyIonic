import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { SpeechHistoryPage } from './speech-history.page';

const routes: Routes = [
  {
    path: '',
    component: SpeechHistoryPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [SpeechHistoryPage]
})
export class SpeechHistoryPageModule {}
