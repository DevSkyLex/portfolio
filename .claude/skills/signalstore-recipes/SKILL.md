---
name: signalstore-recipes
description: NgRx SignalStore templates for the portfolio — named CallState fields from @vfortin/web-http, async methods with firstValueFrom and toStoreError, field errors returned to Signal Forms, optimistic-lock conflicts, provider scope and the lazy session store. Use when creating or changing a store.
---

# SignalStore recipes

Codex counterpart: `.codex/references/signalstore.md`; change one, change both. Rule: `state.md`.
Exemplars: `libs/frontend/contact/data-access/src/lib/state/contact-form/contact-form.store.ts`,
`libs/frontend/content/data-access/src/lib/admin/state/admin-projects/admin-projects.store.ts`,
`libs/frontend/contact/data-access/src/lib/state/admin-inbox/admin-inbox.store.ts`.

## Request-state helpers (`@vfortin/web-http`)

```ts
import {
  type CallState,
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type ServerFieldError,
} from '@vfortin/web-http';
```

`CallState` is `{ status: 'idle' | 'pending' | 'success' | 'error', error: StoreError | null }`;
`StoreError` carries `message` (already translated), `code`, `status`, `fieldErrors`, `retryable`.

## Template — one call

```ts
interface ExampleState {
  readonly sendCallState: CallState;
}

const INITIAL_STATE: ExampleState = { sendCallState: idleCallState() };

/** What the store holds and who provides it. */
export const ExampleStore = signalStore(
  withState<ExampleState>(INITIAL_STATE),
  withComputed((store) => ({
    sending: computed(() => store.sendCallState().status === 'pending'),
    error: computed(() => store.sendCallState().error),
  })),
  withMethods((store, api = inject<ExampleApiService>(ExampleApiService)) => ({
    async send(request: ExampleRequest): Promise<readonly ServerFieldError[]> {
      if (store.sending()) return [];
      patchState(store, { sendCallState: pendingCallState() });
      try {
        await firstValueFrom(api.send(request));
        patchState(store, { sendCallState: successCallState() });
        return [];
      } catch (error) {
        const failure = toStoreError(error);
        patchState(store, { sendCallState: errorCallState(failure) });
        return failure.fieldErrors;
      }
    },
  })),
);

export type ExampleStoreType = InstanceType<typeof ExampleStore>;
```

## Several calls and optimistic locking

One named call state per independent call (`loadCallState`, `writeCallState`); a shared private
`write(call)` helper replaces the item and sets `writeCallState`. A 412 from an `If-Match` write is
`conflict: computed(() => store.writeCallState().error?.status === 412)`; the page offers a reload.

## Scope

- Provided by the page or section: `providers: [ContactFormStore]` in the component decorator; it
  resets with the view.
- App-wide state only when genuinely global, and loaded lazily when the public site must not ship it:
  the identity session store is reached through the admin interceptor entry
  `@vfortin/identity-web-data-access/http` (D18).
- Stores live in `data-access`; `ui` libraries ban `@ngrx/*`.

## Testing

Mock the service with `of()` / `throwError()` (`HttpErrorResponse` with a problem+json body for the
field-error path), assert the call-state transitions and the returned field errors; never assert HTTP in a
store spec. Run `npx nx test <ctx>-web-data-access`.
