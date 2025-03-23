import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { EnvironmentInjector } from '@angular/core';
import { environment } from './environment.prod';
import { enableProdMode } from '@angular/core';

if (environment.production) {
  enableProdMode();
}

// Bootstrap with initialization
const bootstrap = async () => {
  try {
    const appRef = await bootstrapApplication(AppComponent, appConfig);
    const injector = appRef.injector.get(EnvironmentInjector);
    const initializers = injector.get('APP_INIT', []) as ((
      injector: EnvironmentInjector
    ) => Promise<unknown>)[];

    // Run all initializers
    await Promise.all(initializers.map(init => init(injector)));
    console.log('Application initialization complete');
  } catch (err) {
    console.error('Error during application bootstrap:', err);
  }
};

bootstrap();
