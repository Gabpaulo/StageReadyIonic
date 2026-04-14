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
import { AuthGuard } from '../../app/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    component: WebLoginComponent
  },
  {
    path: '',
    component: WebShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: WebDashboardComponent, canActivate: [AuthGuard] },
      { path: 'badges', component: WebBadgesComponent, canActivate: [AuthGuard] },
      { path: 'history', component: WebHistoryComponent, canActivate: [AuthGuard] },
      { path: 'analysis', component: WebAnalysisComponent },
      { path: 'feedback', component: WebFeedbackComponent, canActivate: [AuthGuard] },
      { path: 'profile', component: WebProfileComponent, canActivate: [AuthGuard] },
      { path: 'knowledge-base', component: WebKnowledgeBaseComponent, canActivate: [AuthGuard] },
      {
        path: 'practice-mode',
        loadChildren: () => import('../pages/practice-mode/practice-mode.module').then(m => m.PracticeModePageModule),
        canActivate: [AuthGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WebRoutingModule {}
