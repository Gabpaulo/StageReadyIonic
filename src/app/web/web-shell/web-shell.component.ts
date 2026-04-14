import { Component, ViewChild, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-web-shell',
  templateUrl: './web-shell.component.html',
  styleUrls: ['./web-shell.component.scss'],
  standalone: false
})
export class WebShellComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  sidebarOpen = true;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar
  ) {}

  isAdmin = false;

  ngOnInit() {
    this.firebaseService.auth.onAuthStateChanged(async user => {
      if (user) {
        const profile = await this.firebaseService.getUserProfile(user.uid);
        this.isAdmin = !!profile?.isAdmin;
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidenav) {
      if (this.sidebarOpen) {
        this.sidenav.open();
      } else {
        this.sidenav.close();
      }
    }
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
