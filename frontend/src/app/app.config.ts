import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { initializeAuth } from './initializers/auth.initializer';
import { routes } from './app-routes';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    // Modern way to provide initializers
    {
      provide: 'APP_INIT',
      useFactory: initializeAuth(),
      multi: true,
    },
  ],
};
