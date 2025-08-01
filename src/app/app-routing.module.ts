import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'onboarding',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then( m => m.DashboardPageModule)
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
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'speech-analysis',
    loadChildren: () => import('./pages/speech-analysis/speech-analysis.module').then( m => m.SpeechAnalysisPageModule)
  },
  {
    path: 'speech-feedback',
    loadChildren: () => import('./pages/speech-feedback/speech-feedback.module').then( m => m.SpeechFeedbackPageModule)
  },

 


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
