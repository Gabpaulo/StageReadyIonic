import { Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
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

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar
  ) {
    // One scroller is shared by every tab — start each page at the top.
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.appContent?.scrollToTop(0));
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
