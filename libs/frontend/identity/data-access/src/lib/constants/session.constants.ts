import type { SessionState } from '@internal/identity-web-data-access/lib/state/session/models/session-state.interface';
import { idleCallState } from '@vfortin/web-http';

/**
 * Constant INITIAL_SESSION_STATE
 *
 * @description
 * Empty session used when the store starts or invalidates the current session.
 *
 * @type {SessionState}
 */
export const INITIAL_SESSION_STATE: SessionState = {
  accessToken: null,
  expiresAt: null,
  logoutCallState: idleCallState(),
};

/**
 * Constant EXPIRY_MARGIN_MS
 *
 * @description
 * Refresh threshold that avoids returning a token with less than thirty seconds of validity.
 *
 * @type {number}
 */
export const EXPIRY_MARGIN_MS: 30000 = 30_000;

/**
 * Constant REFRESH_LOCK
 *
 * @description
 * Origin-wide Web Lock name used to serialize refresh-cookie rotation between tabs.
 *
 * @type {string}
 */
export const REFRESH_LOCK = 'portfolio-admin-refresh' as const;
