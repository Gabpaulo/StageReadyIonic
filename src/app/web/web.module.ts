import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { WebRoutingModule } from './web-routing.module';
import { WebShellComponent } from './web-shell/web-shell.component';
import { WebDashboardComponent } from './web-dashboard/web-dashboard.component';
import { WebBadgesComponent } from './web-badges/web-badges.component';
import { WebHistoryComponent, SessionDetailsDialogComponent } from './web-history/web-history.component';
import { WebAnalysisComponent } from './web-analysis/web-analysis.component';
import { WebFeedbackComponent } from './web-feedback/web-feedback.component';
import { WebProfileComponent } from './web-profile/web-profile.component';
import { WebLoginComponent } from './web-login/web-login.component';
import { SpeechTypeDialogComponent } from './web-analysis/speech-type-dialog/speech-type-dialog.component';
import { SharedModule } from '../shared/shared.module';

import { IonicModule } from '@ionic/angular';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@NgModule({
  declarations: [
    WebShellComponent,
    WebDashboardComponent,
    WebBadgesComponent,
    WebHistoryComponent,
    SessionDetailsDialogComponent,
    WebAnalysisComponent,
    WebFeedbackComponent,
    WebProfileComponent,
    WebLoginComponent,
    SpeechTypeDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    WebRoutingModule,
    IonicModule,
    SharedModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatSlideToggleModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WebModule {}
