import {
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

export function initializeAuth() {
  return (injector: EnvironmentInjector) => {
    return runInInjectionContext(injector, () => {
      const authService = inject(AuthService);
      console.log('Auth initializer running');
      return authService.initializeAuthState();
    });
  };
}
