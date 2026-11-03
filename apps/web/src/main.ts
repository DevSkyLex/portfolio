import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from '@internal/web/app/app.config';
import { App } from '@internal/web/app/app';

bootstrapApplication(App, appConfig).catch((err: unknown): void => console.error(err));
