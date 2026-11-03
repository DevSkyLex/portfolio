---
paths:
  - 'libs/frontend/**/state/**'
  - 'libs/frontend/**/*.store.ts'
---

# NgRx SignalStore

- `signalStore(withState(INITIAL_STATE), withComputed(...), withMethods((store, api = inject(Service)) => ...))`;
  export the store and `XStoreType = InstanceType<typeof XStore>`.
- One named `<verb>CallState` per independent call (`idleCallState`, `pendingCallState`,
  `successCallState`, `errorCallState` from `@vfortin/web-http`); no ad-hoc loading booleans.
- Async methods await `firstValueFrom(...)` in `try/catch`; always `toStoreError(error)` before
  `errorCallState`. `patchState` is the only mutation.
- Return server field errors to the form; expose a `conflict` computed for 412 on optimistic writes.
- Provide the store on the page or section that shows it; root scope only for app-wide state loaded
  lazily (the identity session store, D18). No NgRx in `ui` libraries or eagerly on public pages.

Details: the `signalstore-recipes` skill.
