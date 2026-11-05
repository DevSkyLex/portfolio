# Browser acceptance

This application tests built artifacts through their public browser and HTTP boundaries. It does not
import feature implementation code. Public tests use the built-site simulator; authenticated tests
use a disposable Compose project with actual Postgres, identity/content/contact services and Mailpit.

## Commands

```bash
npx nx e2e web-e2e
npx nx run web-e2e:e2e-stack
npx nx run web-e2e:test-tooling
```

`npx nx e2e web-e2e` depends on `web:e2e-site`, which builds `web:build:e2e` into
`dist/apps/web-e2e-site` and writes its `sitemap.xml` and `robots.txt`: the production configuration with
the placeholder GA4 measurement id of `apps/web/src/environments/audience-measurement.e2e.ts` (D48), so
the consent banner and the Google tag loader are exercised. `consent.spec.ts` answers every Google host
itself (nothing leaves the machine) and checks the banner, refusal, acceptance with Consent Mode v2,
« Personnaliser », withdrawal and axe; every other spec starts with a stored refusal
(`storageState` in `playwright.config.mts`) so the banner covers nothing.

Set `E2E_PORT` to an available dedicated localhost port when 4200 is occupied. It must be an integer
between 1 and 65535; the same value configures the browser URL, readiness probe and preview server.
With `BASE_URL` set, tests use that existing endpoint and do not start a preview server.

The preview server and disposable-stack runner live in this project's `support/` folder. Their Node
tests belong to `test-tooling`, which both browser targets require. Changes to these helpers therefore
participate in Nx affected selection along with the browser specs.

The stack target requires Docker Compose supporting `!override` and the Chromium Playwright browser.
CI installs Chromium before the target. The runner builds and prunes the three services, builds web,
starts the isolated stack, seeds content and creates a password-only administrator. Its generated
password is passed to the browser process in memory; the journeys enroll the one-time code through the
admin API before testing the code login (D17). No service `.env`, private development
secret file or existing administrator is read or reset.

## Isolation and ownership

The runner chooses a fresh `portfolio-e2e-<16 hex characters>` project and refuses an existing labelled
container or volume. The overlay uses the committed, public development placeholders directly and
publishes only `127.0.0.1:18080` (site) and `127.0.0.1:18025` (Mailpit). It does not use or stop the
developer's `portfolio-dev` stack on ports 8080/8025. Its finally block removes only its own project and
volumes and its three image tags, including after a startup, bootstrap or browser failure. Migrations,
keys, seed and bootstrap reuse the three service images instead of creating separate build targets.
Existing image tags are refused before building; ambient Compose env files, project names and profiles
cannot redirect the runner's generated namespace. BuildKit caches are retained.

On Compose startup failure, the runner prints at most the last 80 lines from each of the three
migration jobs before teardown. It never requests bootstrap or key-generation logs, environment dumps
or rendered configuration. A diagnostic logging failure preserves the original startup error and
still proceeds with owned cleanup.

`@stack` journeys cover the password-only login, one-time code enrollment, the two-step login once it
is enabled, cookie refresh, project navigation and dirty
draft decisions, real form saves, visible optimistic revision conflicts and reload, UI publication,
public form submission and notification delivery, UI inbox transitions with immediate sidebar counts,
and failed logout followed by retry. Axe checks include login, project list/editor and inbox, rejecting
serious or critical WCAG A/AA violations without excluding controls. Trace recording is disabled for these tests
so authentication bodies are not retained in trace artifacts. Normal public runs skip stack tests.

The startup tests block the active locale snapshot chunk and prove that public hydration consumes
its prerendered state without fetching that chunk, while administration starts independently. They
also block the application bundle and assert actual readable prerendered text, including descendant
opacity, rather than treating a removed marker alone as proof of progressive enhancement.

Changes to owner workflows must update their acceptance contracts here, while detailed behavior and
failure combinations continue to belong to owner component/store/HTTP tests. Tests never weaken
production authentication or rely on the user's account.
