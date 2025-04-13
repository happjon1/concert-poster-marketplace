import { Injectable, inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate: CanActivateFn = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) => {
    // First check locally
    if (!this.authService.isLoggedIn()) {
      // Navigate to login
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    // If locally valid, verify with server
    try {
      const isValid = await this.authService.verifyToken();
      if (isValid) {
        return true;
      }

      // If not valid on server, redirect to login
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    } catch {
      // On error, redirect to login
      this.router.navigate(['/login']);
      return false;
    }
  };
}

// Factory function for the guard
export const isAuthenticated: CanActivateFn = (route, state) => {
  return inject(AuthGuard).canActivate(route, state);
};
