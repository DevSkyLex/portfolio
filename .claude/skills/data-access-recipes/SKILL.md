---
name: data-access-recipes
description: How the portfolio web client talks to its services — HttpClient services with API_PREFIX, type-only contract imports (no Zod in the browser), pure adapters to view models, problem+json errors normalized by toStoreError, interceptors, secondary entry points and the prerender content snapshot. Use when writing or reviewing a data-access service, adapter or contract consumer.
---

# Data-access recipes

Codex counterpart: `.codex/references/data-access.md`; change one, change both. Rule: `data-access.md`.

## Service

```ts
@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly http = inject<HttpClient>(HttpClient);

  public send(request: ContactRequest): Observable<void> {
    return this.http
      .post<ContactMessageAccepted>(
        `${API_PREFIX}/contact/messages`,
        toContactMessageRequest(request),
      )
      .pipe(map(() => undefined));
  }
}
```

- `API_PREFIX` (`/api`) from `@vfortin/web-http`; the dev server proxies `/api/content` → 3101,
  `/api/contact` → 3102, `/api/auth` → 3103 (`apps/web/proxy.conf.json`); Nginx does the same in
  production (D2).
- Contract imports are `import type { … } from '@vfortin/<ctx>-contracts'` in browser code (D10).
- The service never subscribes and never catches.

## Adapters

Pure functions next to the service or in `adapters/`: request mappers (`toContactMessageRequest`: empty
company → `null`) and DTO → view-model mappers (`libs/frontend/content/data-access/src/lib/adapters/content/content.adapter.ts`
to `@vfortin/content-web-model`). Tested with plain imports.

## Errors

The API answers problem+json (`libs/backend/platform/http/src/lib/filters/problem-details/problem-details.filter.ts`): `status`,
stable `code`, `title`, optional `errors` per field. `toStoreError` turns any failure into a `StoreError`
(`retryable` for network, 5xx and 429); `toServerFieldErrors` extracts field errors for Signal Forms.

## Interceptors and entry points

- `provideApiHttp()` and `requestIdInterceptor` (`libs/frontend/http/src/lib/provide-api-http.ts`) are
  registered by the shell; `x-request-id` links browser, Nginx and services.
- Admin calls get the access token from `authInterceptor`
  (`libs/frontend/identity/data-access/src/lib/http/interceptors/auth/auth.interceptor.ts`), exported through the
  light entry `@vfortin/identity-web-data-access/http`, which loads the session store on the first admin
  call (D18). Refresh happens through the `HttpOnly` cookie on `/api/auth`.
- Light consumers use secondary entries: `@vfortin/content-web-data-access/server` (snapshot
  validation, server only). The public links and legal documents are content (D44): the shell passes
  them to the contact and legal features, which read no content library.

## Public content

The production site never fetches content live. `npx nx run web:content-snapshot`
(`apps/web/scripts/fetch-content-snapshot.mjs`, content service running) writes
`apps/web/content-snapshot/{fr,en}.json`; the build prerenders from it (D7) and validates it with the
contract at prerender (D10). `SiteContentService`
(`libs/frontend/content/data-access/src/lib/services/site-content/site-content.service.ts`) exposes it.
Only `nx serve web` reads the content API: the `development` configuration replaces
`apps/web/src/environments/content-snapshot.ts` with `content-snapshot.development.ts` (`fileReplacements`),
which falls back on the committed snapshot when the service is down. Docker stack:
`node apps/web/scripts/local-refresh.mjs` (`docs/operations/deployment.md`).

## Tests

`provideHttpClient()` + `provideHttpClientTesting()`, `HttpTestingController.expectOne` on the URL and
body, `verify()` after each; adapters without `TestBed`. Run `npx nx test <ctx>-web-data-access`.
