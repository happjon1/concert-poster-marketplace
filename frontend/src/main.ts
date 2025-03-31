import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment.prod';
import { enableProdMode } from '@angular/core';
import { AuthService } from './app/services/auth.service';

if (environment.production) {
  enableProdMode();
}

// Add a guard to prevent multiple bootstrap calls
let bootstrapInitiated = false;

const bootstrap = async () => {
  // Skip if already initiated
  if (bootstrapInitiated) {
    console.warn('Bootstrap already initiated - ignoring duplicate call');
    return;
  }

  bootstrapInitiated = true;
  console.log('Starting application bootstrap');

  try {
    const appRef = await bootstrapApplication(AppComponent, appConfig);
    console.log('Application bootstrapped successfully');

    const authService = appRef.injector.get(AuthService);
    authService.setAppInitialized();
    console.log('Auth service initialized');

    // We don't need the custom APP_INIT logic if you're using authService.setAppInitialized()
    // Remove this code if it's causing issues:
    /*
    const injector = appRef.injector.get(EnvironmentInjector);
    const initializers = injector.get('APP_INIT', []) as ((
      injector: EnvironmentInjector
    ) => Promise<unknown>)[];

    // Run all initializers
    await Promise.all(initializers.map(init => init(injector)));
    console.log('Application initialization complete');
    */
  } catch (err) {
    bootstrapInitiated = false; // Reset flag in case of error to allow retry
    console.error('Error during application bootstrap:', err);
  }
};

// Call bootstrap just once
bootstrap();
