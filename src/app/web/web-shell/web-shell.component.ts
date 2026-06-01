import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-web-shell',
  templateUrl: './web-shell.component.html',
  styleUrls: ['./web-shell.component.scss'],
  standalone: false
})
export class WebShellComponent implements OnInit {
  sidebarOpen = true;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // No specific logic needed here for routing, AuthGuard handles it.
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
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
