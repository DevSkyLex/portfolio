/**
 * Export AuthApiService
 *
 * @description
 * Identity API client for administrator authentication.
 */
export { AuthApiService } from '@internal/identity-web-data-access/lib/services/auth-api/auth-api.service';
export {
  LoginFlowStore,
  type LoginFlowStoreType,
} from '@internal/identity-web-data-access/lib/state/login-flow/login-flow.store';

/**
 * Export Credentials
 *
 * @description
 * Credential input shape of the first login step.
 */
export type { Credentials } from '@internal/identity-web-data-access/lib/models/credentials/credentials.interface';

/**
 * Export LoginStep
 *
 * @description
 * Outcome of the first login step returned by the session store.
 */
export type { LoginStep } from '@internal/identity-web-data-access/lib/models/login-step/login-step.type';

/**
 * Export SessionStore
 *
 * @description
 * In-memory admin session store and its inferred instance type.
 */
export {
  SessionStore,
  type SessionStoreType,
} from '@internal/identity-web-data-access/lib/state/session/session.store';
