/**
 * Export call-state helpers
 *
 * @description
 * Standard lifecycle values and type for independent store calls.
 */
export {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
  type CallStatus,
} from '@internal/web-http/lib/call-state/call-state';

/**
 * Export store error helpers
 *
 * @description
 * Error normalization helpers and types shared by frontend stores.
 */
export {
  toServerFieldErrors,
  toStoreError,
  type ServerFieldError,
  type StoreError,
} from '@internal/web-http/lib/errors/store-error/store-error';

/**
 * Export API HTTP helpers
 *
 * @description
 * Same-origin API prefix, request-id interceptor, and configured HTTP providers.
 */
export {
  API_PREFIX,
  provideApiHttp,
  requestIdInterceptor,
} from '@internal/web-http/lib/provide-api-http';
