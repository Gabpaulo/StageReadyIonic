import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { BadgesPage } from './badges.page';
import { BadgeDisplayModule } from '../../components/badge-display/badge-display.module';

const routes: Routes = [
  {
    path: '',
    component: BadgesPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    BadgeDisplayModule
  ],
  declarations: [BadgesPage]
})
export class BadgesPageModule {}
