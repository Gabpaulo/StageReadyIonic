import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { BadgeCollectionComponent } from '../../components/badge-collection/badge-collection.component';
import { BadgeCollectionModule } from '../../components/badge-collection/badge-collection.module';

const routes: Routes = [
  {
    path: '',
    component: BadgeCollectionComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    BadgeCollectionModule
  ],
  declarations: []
})
export class BadgeCollectionPageModule {}
