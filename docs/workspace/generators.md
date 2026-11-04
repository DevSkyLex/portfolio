# Generators

Always generate through Nx, with the tags of the three dimensions (`docs/architecture/boundaries.md`).

```bash
# Angular library (feature, data-access, ui, model, shell)
npx nx g @nx/angular:library --directory=libs/frontend/<ctx>/<layer> --name=<ctx>-web-<layer> \
  --importPath=@vfortin/<ctx>-web-<layer> --standalone --changeDetection=OnPush \
  --unitTestRunner=vitest-analog --style=none --skipModule \
  --tags="scope:<ctx>,platform:web,layer:<layer>"

# Neutral TypeScript library (domain, application, contracts)
npx nx g @nx/js:library --directory=libs/backend/<ctx>/<layer> --name=<ctx>-<layer> \
  --importPath=@vfortin/<ctx>-<layer> --bundler=none --unitTestRunner=vitest --linter=eslint \
  --tags="scope:<ctx>,platform:neutral,layer:<layer>"

# NestJS library (adapters-in, composition, platform)
npx nx g @nx/nest:library --directory=libs/backend/<ctx>/<layer> --name=<ctx>-<layer> \
  --importPath=@vfortin/<ctx>-<layer> --unitTestRunner=none \
  --tags="scope:<ctx>,platform:server,layer:<layer>"

# Service
npx nx g @nx/nest:application --directory=apps/<ctx>-service --name=<ctx>-service \
  --unitTestRunner=none --tags="scope:app,platform:server,layer:app"
```

Workspace projects outside `libs/` take `layer:e2e` (Playwright, `apps/<app>-e2e`) or `layer:tooling` (`tools/<name>`), with `scope:app` or `scope:platform` and `platform:neutral`. `npx nx run architecture:test` rejects a project whose tags are missing, duplicated or do not match its folder. A new library spec goes in a `testing/` folder and its `vite.config.mts` gets the coverage block of [testing](testing.md#coverage).

The libraries are neither buildable nor publishable: there is no need for publication or independent builds. The Angular tests of the libraries therefore use `vitest-analog` (`vitest-angular` requires a buildable library).

## Service targets

```bash
# Migrations, then initial content (local PGlite database by default, see apps/content-service/.env)
npx nx run content-service:db-migrate
npx nx run content-service:db-seed

# Content snapshot for prerendering (service running), then FR/EN static build
npx nx run web:content-snapshot
npx nx build web
```

The targets are named `db-migrate` and `db-seed`: `nx migrate` is a command of Nx itself.

## Local development

The services read `apps/<service>/.env` (PGlite, `json:` SMTP that logs without sending). It is not versioned: copy `apps/<service>/.env.example` the first time.

```bash
npx nx run contact-service:db-migrate
npx nx serve contact-service
npx nx serve content-service
npx nx run identity-service:generate-key   # first time: development signing key
npx nx serve identity-service

# Site, with proxy /api/content → 3101 and /api/contact → 3102 (apps/web/proxy.conf.json), French only
npx nx serve web
```

Full stack in Docker (production Postgres roles, Mailpit, Nginx): `docker/compose.dev.yml`; deployment: `docs/operations/deployment.md`.

The Angular development server serves a single locale (`localize: ["fr"]` in the `development` configuration); the production build produces FR and EN.

The development server reads the build options of `apps/web/project.json` once, at start: restart `npx nx serve web` after a change there, in particular of the `styles` entries. The administration stylesheet `admin.css` is such an entry (non-injected, D31); a server started before it existed answers `/admin.css` with the SPA `index.html`, and the admin renders unstyled while the console reports `Administration stylesheet admin.css loaded without any CSS rule`.

## Backend tests against Postgres

```bash
# Throwaway Postgres (the specs drop and recreate the content, contact and identity schemas)
docker run -d --rm --name portfolio-backend-test -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:17.11-alpine3.23
TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres \
  npx nx run-many -t test -p content-adapters-out contact-adapters-out identity-adapters-out --skip-nx-cache
docker stop portfolio-backend-test
```

`--skip-nx-cache`: the variable is not an input of the test target, a cached PGlite-only run would be replayed.
