import { ApplicationConfig, isDevMode, importProvidersFrom } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { provideServiceWorker } from '@angular/service-worker';
export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideAnimations(),
        provideToastr({ timeOut: 900, preventDuplicates: true }),
        provideServiceWorker('ngsw-worker.js', {
                enabled: !isDevMode(),
                registrationStrategy: 'registerWhenStable:30000'
        }),
        importProvidersFrom(NgSelectModule)
    ]
};
