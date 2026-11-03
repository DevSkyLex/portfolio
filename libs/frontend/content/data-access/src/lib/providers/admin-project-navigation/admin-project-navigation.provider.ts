import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { AdminProjectNavigationPort } from '@internal/content-web-data-access/lib/ports/admin-project-navigation/admin-project-navigation.port';
import { AdminProjectNavigationService } from '@internal/content-web-data-access/lib/services/admin-project-navigation/admin-project-navigation.service';

/**
 * Function provideAdminProjectNavigation
 *
 * @description
 * Binds the public navigation contract to its content-owned adapter.
 * @returns {EnvironmentProviders} Owner capability binding.
 */
export function provideAdminProjectNavigation(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AdminProjectNavigationPort, useExisting: AdminProjectNavigationService },
  ]);
}
