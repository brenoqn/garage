import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import {
  InAppNotificationService,
  NOTIFICATION_SERVICE,
} from './core/services/notification.service';
import { browserWakeLockFactory, SCREEN_WAKE_LOCK } from './core/services/screen-wake-lock.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: NOTIFICATION_SERVICE,
      useClass: InAppNotificationService,
    },
    { provide: SCREEN_WAKE_LOCK, useFactory: browserWakeLockFactory },
  ],
};
