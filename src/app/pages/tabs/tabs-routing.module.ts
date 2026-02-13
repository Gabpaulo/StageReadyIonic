import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: 'speech-analysis',
        loadChildren: () => import('../speech-analysis/speech-analysis.module').then(m => m.SpeechAnalysisPageModule)
      },
      {
        path: 'badges',
        loadChildren: () => import('../badges/badges.module').then(m => m.BadgesPageModule)
      },
      {
        path: 'badge-collection',
        loadChildren: () => import('../badge-collection/badge-collection.module').then(m => m.BadgeCollectionPageModule)
      },
      {
        path: 'speech-history',
        loadChildren: () => import('../speech-history/speech-history.module').then(m => m.SpeechHistoryPageModule)
      },
      {
        path: 'speech-feedback',
        loadChildren: () => import('../speech-feedback/speech-feedback.module').then(m => m.SpeechFeedbackPageModule)
      },
      {
        path: 'knowledge-base',
        loadChildren: () => import('../knowledge-base/knowledge-base.module').then(m => m.KnowledgeBasePageModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule {} 