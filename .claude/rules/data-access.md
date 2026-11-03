---
paths:
  - 'libs/frontend/*/data-access/**'
  - 'libs/frontend/http/**'
---

# Frontend data access

- Services are `@Injectable({ providedIn: 'root' })` over `HttpClient`; URLs start with `API_PREFIX` from
  `@vfortin/web-http`; they return `Observable<T>` and never subscribe or swallow errors.
- Request and response shapes are **type-only** imports from `@vfortin/<ctx>-contracts`: the browser
  bundle carries no Zod (D10). The content snapshot is validated at prerender through the `server`
  secondary entry point only.
- Pure adapters (`adapters/<concept>.adapter.ts`, `to<Model>` functions) map DTOs to the view models of
  `@vfortin/<ctx>-web-model`; no `inject()`, no side effect.
- Stores normalize failures with `toStoreError` / `toServerFieldErrors`
  (`libs/frontend/http/src/lib/errors/store-error/store-error.ts`); services let errors through untouched.
- Cross-cutting headers belong to the registered interceptors (`requestIdInterceptor`, the identity
  `authInterceptor` for admin calls); never set them by hand.
- Public site content comes from the prerendered snapshot (D7), never from a live call on a public page.
- `data-access` reads `model`, `contracts` and `platform` only.

Details: the `data-access-recipes` skill.
