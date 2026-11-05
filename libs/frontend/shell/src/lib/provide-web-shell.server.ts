import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import {
  provideRuntimeContentSnapshot,
  provideContentSnapshotValidation,
} from '@vfortin/content-web-data-access/server';
import { SERVER_ROUTES } from '@internal/web-shell/lib/app.routes.server';

/**
 * Function provideWebShellServer
 *
 * @description
 * Registers Angular server rendering with the shell's route render modes and validates the content
 * snapshot during request rendering.
 *
 * @returns {EnvironmentProviders} Providers for the server-rendered shell.
 */
export function provideWebShellServer(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideServerRendering(withRoutes(SERVER_ROUTES)),
    provideContentSnapshotValidation(),
    provideRuntimeContentSnapshot(),
  ]);
}
