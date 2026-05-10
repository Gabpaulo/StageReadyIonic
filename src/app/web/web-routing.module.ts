import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WebShellComponent } from './web-shell/web-shell.component';
import { WebDashboardComponent } from './web-dashboard/web-dashboard.component';
import { WebBadgesComponent } from './web-badges/web-badges.component';
import { WebHistoryComponent } from './web-history/web-history.component';
import { WebAnalysisComponent } from './web-analysis/web-analysis.component';
import { WebFeedbackComponent } from './web-feedback/web-feedback.component';
import { WebProfileComponent } from './web-profile/web-profile.component';
import { WebLoginComponent } from './web-login/web-login.component';
import { WebKnowledgeBaseComponent } from './web-knowledge-base/web-knowledge-base.component';
import { WebOnboardingComponent } from './web-onboarding/web-onboarding.component';
import { AuthGuard } from '../../app/guards/auth.guard';
import { OnboardingGuard } from '../../app/guards/onboarding.guard';

const routes: Routes = [
  {
    path: 'login',
    component: WebLoginComponent
  },
  {
    // Onboarding: requires auth but NOT OnboardingGuard (would cause a loop)
    path: 'onboarding',
    component: WebOnboardingComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '',
    component: WebShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: WebDashboardComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'badges',
        component: WebBadgesComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'history',
        component: WebHistoryComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'analysis',
        component: WebAnalysisComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'feedback',
        component: WebFeedbackComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'profile',
        component: WebProfileComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'knowledge-base',
        component: WebKnowledgeBaseComponent,
        canActivate: [AuthGuard, OnboardingGuard]
      },
      {
        path: 'practice-mode',
        loadChildren: () =>
          import('../pages/practice-mode/practice-mode.module').then(m => m.PracticeModePageModule),
        canActivate: [AuthGuard, OnboardingGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WebRoutingModule {}
