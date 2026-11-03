import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { AdminInboxSummaryPort } from '@internal/contact-web-data-access/lib/ports/admin-inbox-summary/admin-inbox-summary.port';
import { AdminInboxSummaryService } from '@internal/contact-web-data-access/lib/services/admin-inbox-summary/admin-inbox-summary.service';

/**
 * Function provideAdminInboxSummary
 *
 * @description
 * Binds the shell summary contract to the contact owner's shared projection.
 * @returns {EnvironmentProviders} Owner capability binding.
 */
export function provideAdminInboxSummary(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AdminInboxSummaryPort, useExisting: AdminInboxSummaryService },
  ]);
}
