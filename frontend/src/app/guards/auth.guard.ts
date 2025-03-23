import { effect, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If still loading, return a promise that resolves when loading is complete
  if (authService.loading()) {
    console.log('Auth still loading, waiting before navigation...');
    return new Promise<boolean>(resolve => {
      // Create a one-time effect to wait for loading to complete
      const cleanup = effect(() => {
        if (!authService.loading()) {
          cleanup.destroy(); // Remove the effect

          // Now check if user is logged in
          if (authService.isLoggedIn()) {
            console.log('User authenticated, allowing navigation');
            resolve(true);
          } else {
            console.log('User not authenticated, redirecting to login');
            router.navigate(['/login']);
            resolve(false);
          }
        }
      });

      // Failsafe timeout to prevent getting stuck
      setTimeout(() => {
        cleanup.destroy();
        console.warn('Auth loading timed out, redirecting to login');
        router.navigate(['/login']);
        resolve(false);
      }, 5000);
    });
  }

  // Not loading, check logged in state immediately
  if (authService.isLoggedIn()) {
    return true;
  }

  // Not logged in, redirect to login
  router.navigate(['/login']);
  return false;
};
