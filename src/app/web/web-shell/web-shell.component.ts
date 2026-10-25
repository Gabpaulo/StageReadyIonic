import { Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IonContent, Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-web-shell',
  templateUrl: './web-shell.component.html',
  styleUrls: ['./web-shell.component.scss'],
  standalone: false
})
export class WebShellComponent {
  @ViewChild('appContent') private appContent?: IonContent;

  /** Website on wide screens gets the sidebar; the native app always uses the mobile layout. */
  readonly sidebarQuery: string | boolean;
  sidebarVisible = false;

  readonly navItems = [
    { path: '/web/dashboard',      icon: 'home-outline',          label: 'Dashboard' },
    { path: '/web/badges',         icon: 'trophy-outline',        label: 'Badges' },
    { path: '/web/history',        icon: 'stats-chart-outline',   label: 'Speech History' },
    { path: '/web/practice-mode',  icon: 'musical-notes-outline', label: 'Practice Mode', highlight: true },
    { path: '/web/analysis',       icon: 'mic-outline',           label: 'Speech Analysis' },
    { path: '/web/feedback',       icon: 'chatbubbles-outline',   label: 'Speech Feedback' },
    { path: '/web/knowledge-base', icon: 'library-outline',       label: 'Knowledge Base' },
    { path: '/web/profile',        icon: 'person-outline',        label: 'Profile' },
  ];

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar,
    platform: Platform
  ) {
    this.sidebarQuery = platform.is('capacitor') ? false : '(min-width: 992px)';

    // One scroller is shared by every page — start each page at the top.
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.appContent?.scrollToTop(0));
  }

  onSplitPaneVisible(event: Event) {
    this.sidebarVisible = (event as CustomEvent<{ visible: boolean }>).detail.visible;
  }

  logout() {
    this.firebaseService.auth.signOut().then(() => {
      this.snackBar.open('Logged out successfully', 'Close', { duration: 2000 });
      this.router.navigate(['/web/login']);
    }).catch(error => {
      this.snackBar.open('Logout failed', 'Close', { duration: 2000 });
      console.error('Logout error:', error);
    });
  }

}
