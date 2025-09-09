import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./newflow/onboarding/onboarding.module').then( m => m.OnboardingPageModule)
  },
  {
    path: 'setup-profile',
    loadChildren: () => import('./newflow/setup-profile/setup-profile.module').then( m => m.SetupProfilePageModule)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'speech-feedback',
    loadChildren: () => import('./pages/speech-feedback/speech-feedback.module').then( m => m.SpeechFeedbackPageModule)
  },
  {
    path: 'badges',
    loadChildren: () => import('./pages/badges/badges.module').then( m => m.BadgesPageModule)
  },
  {
    path: 'badge-collection',
    loadChildren: () => import('./pages/badge-collection/badge-collection.module').then( m => m.BadgeCollectionPageModule)
  },
  {
    path: 'speech-history',
    loadChildren: () => import('./pages/speech-history/speech-history.module').then( m => m.SpeechHistoryPageModule)
  },
  {
    path: '',
    redirectTo: 'onboarding',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
