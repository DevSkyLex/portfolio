import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  type StoreError,
  errorCallState,
  idleCallState,
  pendingCallState,
  type ServerFieldError,
  successCallState,
  toStoreError,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import type { ContactRequest } from '@internal/contact-web-data-access/lib/models/contact-request/contact-request.interface';
import { ContactApiService } from '@internal/contact-web-data-access/lib/services/contact-api/contact-api.service';
import type { ContactFormState } from '@internal/contact-web-data-access/lib/state/contact-form/models/contact-form-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Empty form submission state used at section creation and when the form resets.
 *
 * @type {ContactFormState}
 */
const INITIAL_STATE: ContactFormState = { sendCallState: idleCallState(), sentTo: null };

/**
 * Constant ContactFormStore
 *
 * @description
 * Component-scoped submission store. Its send operation returns server field errors for Signal Forms
 * and retains normalized request status for the contact section.
 */
export const ContactFormStore = signalStore(
  withState<ContactFormState>(INITIAL_STATE),
  withComputed((store) => ({
    sending: computed<boolean>(() => store.sendCallState().status === 'pending'),
    sent: computed<boolean>(() => store.sendCallState().status === 'success'),
    error: computed<StoreError | null>(() => store.sendCallState().error),
  })),
  withMethods((store, api: ContactApiService = inject<ContactApiService>(ContactApiService)) => ({
    async send(request: ContactRequest): Promise<readonly ServerFieldError[]> {
      if (store.sending()) {
        return [];
      }
      patchState(store, { sendCallState: pendingCallState() });
      try {
        await firstValueFrom(api.send(request));
        patchState(store, { sendCallState: successCallState(), sentTo: request.email.trim() });
        return [];
      } catch (error: unknown) {
        const failure: StoreError = toStoreError(error);
        patchState(store, { sendCallState: errorCallState(failure) });
        return failure.fieldErrors;
      }
    },
    reset(): void {
      patchState(store, INITIAL_STATE);
    },
  })),
);

/**
 * Type ContactFormStoreType
 * @type ContactFormStoreType
 *
 * @description
 * Instance type inferred from the contact form SignalStore for explicitly typed injection.
 *
 * @type {InstanceType<typeof ContactFormStore>}
 */
export type ContactFormStoreType = InstanceType<typeof ContactFormStore>;
