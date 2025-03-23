import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  console.log('Auth guard executed');

  // If auth service is still initializing, wait for it
  if (!authService.initialized()) {
    console.log('Auth not initialized yet, waiting...');

    // Return a promise that resolves when initialization completes
    return new Promise<boolean>(resolve => {
      // Poll until initialized
      const checkInterval = setInterval(() => {
        if (authService.initialized()) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);

          // Now we can check if user is authenticated
          const isLoggedIn = authService.isLoggedIn();
          console.log(`Auth initialized, user logged in: ${isLoggedIn}`);

          if (isLoggedIn) {
            resolve(true);
          } else {
            router.navigate(['/login']);
            resolve(false);
          }
        }
      }, 100);

      // Set a timeout to prevent infinite waiting
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('Auth initialization timed out');
        router.navigate(['/login']);
        resolve(false);
      }, 5000);
    });
  }

  // Auth is already initialized, check if logged in
  if (authService.isLoggedIn()) {
    console.log('User is authenticated, proceeding');
    return true;
  } else {
    console.log('User is not authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }
};
