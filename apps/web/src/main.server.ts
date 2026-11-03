import type { ApplicationRef } from '@angular/core';
import { type BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from '@internal/web/app/app';
import { config } from '@internal/web/app/app.config.server';

/**
 * Function bootstrap
 *
 * @description
 * Creates the Angular application for one server-rendering request using the server-specific provider configuration.
 *
 * @param {BootstrapContext} context - Angular rendering context for the current request.
 * @returns {Promise<ApplicationRef>} Application bootstrap result consumed by Angular SSR.
 */
const bootstrap = (context: BootstrapContext): Promise<ApplicationRef> =>
  bootstrapApplication(App, config, context);

export default bootstrap;
