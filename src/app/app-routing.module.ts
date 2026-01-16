import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { PlatformRedirectGuard } from './guards/platform-redirect.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [PlatformRedirectGuard],
    children: []
  },
  {
    path: 'web',
    loadChildren: () => import('./web/web.module').then(m => m.WebModule)
  },
  {
    path: 'ionic',
    loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'ionic-login',
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
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
