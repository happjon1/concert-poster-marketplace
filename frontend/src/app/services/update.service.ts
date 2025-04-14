// src/app/services/update.service.ts
import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  constructor(private swUpdate: SwUpdate) {
    // Subscribe to update available events
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(evt => {
        console.log(`Current version: ${evt.currentVersion.hash}`);
        console.log(`New version available: ${evt.latestVersion.hash}`);

        // Prompt the user to refresh
        const promptUser = window.confirm(
          'A new version of the application is available. Would you like to update now?'
        );
        if (promptUser) {
          window.location.reload();
        }
      });

    // Check for updates every 30 minutes
    setInterval(
      () => {
        this.checkForUpdate();
      },
      30 * 60 * 1000
    );
  }

  // Check for updates manually
  checkForUpdate(): Promise<boolean> {
    console.log('Checking for updates...');
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker updates not enabled');
      return Promise.resolve(false);
    }

    return this.swUpdate
      .checkForUpdate()
      .then(hasUpdate => {
        console.log(hasUpdate ? 'Update available' : 'No update available');
        return hasUpdate;
      })
      .catch(err => {
        console.error('Error checking for updates:', err);
        return false;
      });
  }

  // Force update and refresh
  forceUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => window.location.reload());
    }
  }
}
