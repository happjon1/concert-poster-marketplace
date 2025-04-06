import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app-routes';
import { authInterceptor } from './services/auth.interceptor';
import { TrpcService } from './services/trpc.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: TrpcService, useClass: TrpcService },
    provideAnimations(),
  ],
};
