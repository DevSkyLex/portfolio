import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type {
  AuthorizationConsent,
  AuthorizationRedirect,
  AuthorizationReviewRequest,
  AuthorizationReviewResponse,
} from '@vfortin/identity-contracts';
import {
  type CallState,
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import { OAuthApiService } from '@internal/identity-web-data-access/lib/services/oauth-api/oauth-api.service';
import { toOAuthError } from '@internal/identity-web-data-access/lib/utils/oauth-error/oauth-error.utils';

/**
 * Interface OAuthConsentState
 * @interface OAuthConsentState
 *
 * @description
 * Page-scoped state of the consent screen.
 */
export interface OAuthConsentState {
  // #region Properties
  /** Validated request to decide, `null` before the review answers or when it redirects. */
  readonly consent: AuthorizationConsent | null;
  /** Review of the forwarded authorization query. */
  readonly loadCallState: CallState;
  /** « Autoriser » or « Refuser ». */
  readonly decideCallState: CallState;
  // #endregion
}

/** No request yet and idle calls. */
const INITIAL_STATE: OAuthConsentState = {
  consent: null,
  loadCallState: idleCallState(),
  decideCallState: idleCallState(),
};

/**
 * Constant OAuthConsentStore
 *
 * @description
 * State of the consent page (D45): reviews the authorization query once, then decides it once. Both
 * methods resolve the URL the page must send the browser to (the client's redirect URI with the code
 * or the error), or `null` when there is nothing to follow; failures are normalized by
 * `toOAuthError`. Provided by the page.
 */
export const OAuthConsentStore = signalStore(
  withState<OAuthConsentState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>(() => store.loadCallState().status === 'pending'),
    deciding: computed<boolean>(() => store.decideCallState().status === 'pending'),
  })),
  withMethods((store, api: OAuthApiService = inject<OAuthApiService>(OAuthApiService)) => ({
    /**
     * Forwards the query; a consent is kept for the screen, an error redirect is returned.
     */
    async review(request: AuthorizationReviewRequest): Promise<string | null> {
      if (store.loading()) return null;
      patchState(store, { consent: null, loadCallState: pendingCallState() });
      try {
        const answer: AuthorizationReviewResponse = await firstValueFrom(api.review(request));
        patchState(store, {
          consent: answer.status === 'consent' ? answer : null,
          loadCallState: successCallState(),
        });
        return answer.status === 'redirect' ? answer.redirectTo : null;
      } catch (error: unknown) {
        patchState(store, { loadCallState: errorCallState(toOAuthError(error)) });
        return null;
      }
    },

    /**
     * Approves or refuses the reviewed request and returns the redirect; `null` on a failure (in
     * `decideCallState`), without a request, or while a decision runs.
     */
    async decide(decision: 'approve' | 'deny'): Promise<string | null> {
      const consent: AuthorizationConsent | null = store.consent();
      if (consent === null || store.deciding()) return null;
      patchState(store, { decideCallState: pendingCallState() });
      try {
        const answer: AuthorizationRedirect = await firstValueFrom(
          decision === 'approve' ? api.approve(consent.requestId) : api.deny(consent.requestId),
        );
        patchState(store, { decideCallState: successCallState() });
        return answer.redirectTo;
      } catch (error: unknown) {
        patchState(store, { decideCallState: errorCallState(toOAuthError(error)) });
        return null;
      }
    },
  })),
);

/**
 * Type OAuthConsentStoreType
 * @type OAuthConsentStoreType
 *
 * @description
 * Instance type of the page-provided consent store.
 */
export type OAuthConsentStoreType = InstanceType<typeof OAuthConsentStore>;
