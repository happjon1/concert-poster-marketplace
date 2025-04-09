import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  // Your component logic here

  router = inject(Router);
  authService = inject(AuthService);

  isLoggedIn = computed(() => {
    return this.authService.currentUser() !== null;
  });

  isHomePage(): boolean {
    const url = this.router.url;
    return url === '/' || url === '/home' || url === '';
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
