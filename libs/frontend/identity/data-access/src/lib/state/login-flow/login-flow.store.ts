import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
  withHooks,
} from '@ngrx/signals';
import {
  type CallState,
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  type StoreError,
} from '@vfortin/web-http';
import type { TotpRequest } from '@vfortin/identity-contracts';
import type { Credentials } from '@internal/identity-web-data-access/lib/models/credentials/credentials.interface';
import type { LoginStep } from '@internal/identity-web-data-access/lib/models/login-step/login-step.type';
import {
  SessionStore,
  type SessionStoreType,
} from '@internal/identity-web-data-access/lib/state/session/session.store';

/**
 * Interface LoginFlowState
 *
 * @description
 * Independent named request states belonging to a single login page lifetime.
 */
interface LoginFlowState {
  // #region Properties
  /** Credential submission state. */
  readonly credentialsCallState: CallState;

  /** One-time-code verification state. */
  readonly verificationCallState: CallState;
  // #endregion
}

/** Initial idle states; credentials and challenges remain in the owning page. */
const INITIAL_STATE: LoginFlowState = {
  credentialsCallState: idleCallState(),
  verificationCallState: idleCallState(),
};

/**
 * Constant LoginFlowStore
 *
 * @description
 * Page-scoped request state for the login workflow; root session authority remains in SessionStore.
 */
export const LoginFlowStore = signalStore(
  withState<LoginFlowState>(INITIAL_STATE),
  withComputed((store) => ({
    pending: computed<boolean>(
      () =>
        store.credentialsCallState().status === 'pending' ||
        store.verificationCallState().status === 'pending',
    ),
  })),
  withMethods((store, session: SessionStoreType = inject<SessionStoreType>(SessionStore)) => {
    let intent: number = 0;
    let active: boolean = true;
    /** Invalidates projection while allowing accepted HTTP to finish before ordered revocation. */
    const cancel = (): void => {
      const accepted: boolean = store.pending();
      intent++;
      patchState(store, INITIAL_STATE);
      if (accepted) void session.logout();
    };
    const isCurrentIntent = (ticket: number): boolean => active && ticket === intent;
    return {
      captureIntent: (): number => intent,
      isCurrentIntent,
      cancel,
      endLifetime(): void {
        active = false;
        cancel();
      },
      async login(credentials: Credentials): Promise<LoginStep> {
        const ticket: number = intent;
        patchState(store, { credentialsCallState: pendingCallState() });
        const result: LoginStep = await session.login(credentials);
        if (isCurrentIntent(ticket))
          patchState(store, {
            credentialsCallState:
              result.kind === 'failed' ? errorCallState(result.error) : successCallState(),
          });
        return result;
      },
      async verifyCode(request: TotpRequest): Promise<StoreError | null> {
        const ticket: number = intent;
        patchState(store, { verificationCallState: pendingCallState() });
        const failure: StoreError | null = await session.verifyCode(request);
        if (isCurrentIntent(ticket))
          patchState(store, {
            verificationCallState: failure ? errorCallState(failure) : successCallState(),
          });
        return failure;
      },
    };
  }),
  withHooks((store) => ({
    onDestroy(): void {
      store.endLifetime();
    },
  })),
);

/** Instance type of the page-provided login request store. */
export type LoginFlowStoreType = InstanceType<typeof LoginFlowStore>;
