import type { Provider } from '@angular/core';
import { AdminSessionPort } from '@internal/identity-web-data-access/lib/ports/admin-session/admin-session.port';
import { SessionStore } from '@internal/identity-web-data-access/lib/state/session/session.store';

/**
 * Function provideAdminSession
 *
 * @description
 * Binds the shell capability to the owner's root session instance.
 *
 * @returns {Provider} Identity-owned binding.
 */
export function provideAdminSession(): Provider {
  return { provide: AdminSessionPort, useExisting: SessionStore };
}
