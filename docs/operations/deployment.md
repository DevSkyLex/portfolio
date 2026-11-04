# Deployment and operations

Production: an OVH VPS, Docker Compose (`docker/compose.prod.yml`), the existing shared Traefik edge, a private Nginx origin and Postgres 17. The public site is a set of static pages published per release; the three services (identity, content, contact) are images published to GHCR. Ansible prepares and deploys the portfolio on an existing shared VPS; the GitHub workflows call it. Host provisioning, SSH access and Docker are managed separately. Traefik is managed separately, using the same network and deployment conventions as Dentalstock and Fireguard.

| Item                    | Where                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose, Nginx, scripts | `/srv/apps/portfolio/production` (copied by Ansible from `docker/`)                                                                                              |
| Compose variables       | `/srv/apps/portfolio/production/.env` (Ansible; `TAG` written by `scripts/deploy.sh`)                                                                            |
| Secrets                 | `/srv/apps/portfolio/production/secrets` (rendered from Ansible Vault, `0700` directory)                                                                         |
| Static site             | `/srv/apps/portfolio/production/site/releases/<release>`, links `/srv/apps/portfolio/production/site/current` and `/srv/apps/portfolio/production/site/previous` |
| Uploaded media (D40)    | `/srv/apps/portfolio/production/media` (`MEDIA_ROOT`; owner UID 1000, `0755`), served at `/media/`                                                               |
| Backups                 | `/srv/apps/portfolio/production/backups` (`0750`; dump and media archive, daily at 03:30 and before deploys, 14 d)                                               |
| Certificates            | Existing shared Traefik, resolver `letsencrypt`; none mounted into the portfolio                                                                                 |
| Timers                  | `portfolio-backup.timer` (daily), `portfolio-restore-check.timer` (weekly, Sunday 04:00)                                                                         |

## Containers

- **Hardening**: every container runs with a read-only root file system (`tmpfs` for `/tmp` and runtime directories), `cap_drop: ALL` (Postgres and Nginx get back only what their entrypoint needs to drop to their own user), `no-new-privileges`, memory/CPU/PID limits and rotated logs (`local` driver, 5 × 10 MB). The services run as UID 1000 on a plain Alpine image with the Node binary only (no npm, npx, corepack or yarn). Services are limited to 384 MB, except content-service at 512 MB: sharp decodes an uploaded image in memory (a 48-megapixel JPEG or PNG added about 70 MB at peak in a local measurement with `sharp.cache(false)` and one image at a time).
- **Media (D40)**: the host directory `MEDIA_ROOT` (created by Ansible, owner `service_uid`, `0755`) is content-service's only writable mount, at `/srv/media` (`CONTENT_MEDIA_DIR`); Nginx mounts it read-only at the same path. The service writes `<uuid>.webp` and `<uuid>-960.webp` (files `0644`, written as `.tmp` then renamed) and purges images unlinked for more than 7 days. Ansible creates the directory before the first `docker compose up`, otherwise Docker would create it owned by root.
- **Images**: pinned by version and digest (`docker/service.Dockerfile`, compose files); update version and digest together.
- **Networks**: external `traefik_proxy` connects Traefik to Nginx only. Private `proxy` connects Nginx to services and provides outbound access for GitHub and SMTP; `database` is internal, without egress. Services and Postgres never join the shared edge network. Nginx cannot reach Postgres; migrations and one-off jobs only join `database`. Production publishes no host ports.
- **Postgres roles** (D23): `docker/postgres/init/01-roles.sh` is idempotent. The image runs it on the first start; `scripts/deploy.sh` runs it again before and after the migrations, so a password changed in the vault, new grants or new tables are applied on the next deployment. The application roles have data access only (not on `__migrations`), connection limits, and `PUBLIC` has no access to the database.
- **Traefik**: routers use entrypoints `web` and `websecure`, HTTP redirects to HTTPS, and TLS uses the existing `letsencrypt` resolver. The secure router accepts `APP_HOST` and `www.APP_HOST`; Nginx redirects `www` to the canonical host. Optional `TRAEFIK_SECURE_MIDDLEWARES` attaches an existing shared middleware chain.
- **Nginx**: the official entrypoint renders `nginx/templates/portfolio.conf.template` into `/tmp/portfolio.conf` on tmpfs. `APP_PORT` is the internal HTTP listening port, not a published host port. Only the reviewed Traefik peer from `TRUSTED_PROXIES` may reach the origin or supply the client address; this restored address drives rate limits and logs. HTTPS is preserved when forwarding to services. Upstreams resolve through Docker DNS at runtime, so recreated services need no Nginx reload. JSON access logs carry `request_id`, also returned in `X-Request-Id` and passed to services. Pages are revalidated (`no-cache`); hashed assets are cached for a year and other static files for an hour, except `/admin.css`, the unhashed administration stylesheet loaded by the admin area only (D31), which is revalidated like the pages. Missing hashed assets fall back to the previous release. `/media/` serves only names matching `<uuid>.webp` or `<uuid>-960.webp` (immutable, one year, with the server's security headers including `nosniff`); any other path under `/media/` answers 404. Request bodies are 64 kB by default; `/api/content/admin/projects/` and `/api/content/admin/legal/` accept 1100 kB (the service's JSON limit is 1 MB) and `POST /api/content/admin/media` 11 MB (the service caps the file at 10 MiB); larger bodies get a problem+json 413 (`http.413`, `content.media-too-large`). Uploaded images come from the same origin (`img-src 'self' data:`); the CSP only adds the Google tag origin to `script-src` and the GA4 collection hosts to `img-src` and `connect-src`, for the audience measurement loaded after consent (D48).

## Building service images

Run each service's Nx `prune` target before building. The Docker context is that service's
`dist/apps/<service>` directory, with `docker/service.Dockerfile` selected from the repository root:

```bash
npx nx run-many -t prune -p identity-service content-service contact-service --parallel=2
docker build -f docker/service.Dockerfile --build-arg SERVICE=content-service \
  -t portfolio-content-service dist/apps/content-service
```

The Dockerfile-specific allowlist sends only manifests, the HTTP/CLI bundles and migrations. It excludes
maps, workspace modules and other services' artifacts. Dependency installation precedes bundle copies;
the service label follows the shared runtime setup so it does not invalidate that setup's cache.

Local Compose builds only the three long-running services. Migration, key, seed and bootstrap jobs
reuse those exact project-scoped image tags, with local-only pull policy and no HTTP health probe.
Build the stack before invoking a job independently. Production keeps its three registry images and
commit tags.

The image workflow prepares all three pruned contexts once and transfers a SHA-named artifact to the
image matrix. Each image has its own Buildx/GitHub Actions v2 cache scope; cache export failure does not
fail an otherwise successful image publication. The public site workflow still obtains a fresh content
snapshot independently of these service artifacts.

## Shared environment contract

[`docker/.env.example`](../../docker/.env.example) lists public runtime settings. Ansible writes the server's `.env`; credentials remain in Vault-rendered Docker secret files. Configure the following GitHub `production` environment variables, or supply the corresponding environment variables when running Ansible manually:

| GitHub variable                           | Runtime setting / use                                | Default                           |
| ----------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| `DOCKER_PROJECT_NAME`                     | `COMPOSE_PROJECT_NAME`, Compose resources            | `portfolio`                       |
| `DOCKER_CONTAINER_NAME`                   | `CONTAINER_NAME`, Nginx container                    | Project name                      |
| `APP_HOST`                                | Public host, auth issuer and snapshot source         | `valentin-fortin.pro`             |
| `VPS_APP_PORT`                            | `APP_PORT`, Nginx container HTTP port                | `80`                              |
| `VPS_APP_DIR`                             | Ansible `app_root`, deployment directory             | `/srv/apps/portfolio/production`  |
| `TRAEFIK_ROUTER_NAME`                     | Unique router, service and redirect middleware names | Project name                      |
| `TRAEFIK_SECURE_MIDDLEWARES`              | Existing secure middleware chain                     | Empty                             |
| `TRUSTED_PROXIES`                         | One reviewed Traefik IP address or narrow CIDR       | Required; no default              |
| `WEB_MEMORY_LIMIT` / `WEB_CPU_LIMIT`      | Nginx resource limits                                | `128M` / `1.0`                    |
| `LOG_MAX_SIZE` / `LOG_MAX_FILES`          | Container log rotation                               | `10m` / `5`                       |
| `LOG_LEVEL`                               | Service log level                                    | `info`                            |
| `CONTACT_MAIL_FROM` / `CONTACT_NOTIFY_TO` | Sender and notification recipient                    | Addresses derived from `APP_HOST` |
| `SEO_SEARCH_CONSOLE_PROPERTY`             | SEO dashboard: Search Console property (D47)         | Empty: section not configured     |
| `SEO_GA4_PROPERTY_ID`                     | SEO dashboard: numeric GA4 property id (D47)         | Empty: section not configured     |
| `SEO_WEB_VITALS_URLS`                     | SEO dashboard: comma-separated key URLs (D47)        | Home FR/EN and the first project  |
| `VPS_PORT`                                | SSH port                                             | `22`                              |

Obtain `TRUSTED_PROXIES` from the existing Traefik configuration. Use a stable, reviewed proxy address; do not trust the whole shared Docker network, all private ranges or an unrestricted CIDR. A changed Traefik address requires updating this setting and recreating the origin. Ansible validates the address and requires the external `traefik_proxy` network to exist; it does not create the shared proxy or its network.

The portfolio has three distinct service images, so it retains `REGISTRY` and a common commit `TAG` instead of a single `IMAGE_REF`. `IDENTITY_SIGNING_KID`, `SITE_BUILD_REPOSITORY` and `SITE_ROOT` are supplied by the existing Ansible inventory; `MEDIA_ROOT` comes from the role default `portfolio_media_root` (`<app_root>/media`, so `/srv/apps/portfolio/production/media`), also written to `backup.env` as `BACKUP_MEDIA_DIR`. Image tags identify the deployed commit; base images remain pinned by digest.

The site, media and backup paths follow `VPS_APP_DIR`: `<app_root>/site`, `<app_root>/media` and `<app_root>/backups`. The paths above use its default. Nginx still sees the site at `/srv/site` inside its container.

For an existing installation using the former `/srv/portfolio`, `/srv/site` or `/srv/backups` paths, plan and verify a separate migration of the site releases, media, backups and configuration before switching paths. Changing the defaults does not migrate existing data.

## First installation

1. **Shared edge and DNS**: the existing Traefik must expose `web` / `websecure`, have the `letsencrypt` resolver and join external `traefik_proxy`. Point `APP_HOST` and `www.APP_HOST` to that edge. Record its reviewed address in `TRUSTED_PROXIES`.
2. **Existing access**: configure `VPS_HOST`, optional `VPS_USER` and `VPS_PORT`, and authorize the deployment public key on the VPS through its existing administration process. The SSH account defaults to `deploy`; it must already exist, have passwordless sudo and Docker access, and have a primary group with the same name. The repository does not manage `authorized_keys`, SSH, the firewall or Docker on the host.
3. **Secrets**: copy `vault.example.yml` to `vault.yml`, fill it in, then encrypt it. The roles check that nothing is left at `CHANGE_ME` and that the Postgres passwords are alphanumeric (they go into URLs). The two SEO dashboard secrets (`vault_seo_google_credentials`, `vault_seo_pagespeed_api_key`) are optional: left empty, Ansible writes empty secret files and the sections answer `not-configured` (see « SEO dashboard and audience measurement » below).

   ```bash
   openssl rand -hex 24                                   # each Postgres password
   openssl genpkey -algorithm ed25519 -out k1.pem         # token signing key (paste it into the vault)
   ansible-vault encrypt ansible/inventory/group_vars/all/vault.yml
   ```

4. **Prepare the portfolio** using the existing deployment account:

   ```bash
   cd ansible && ansible-galaxy collection install -r requirements.yml -p .collections
   ansible-playbook playbooks/provision.yml --ask-vault-pass
   ```

   The playbook prepares portfolio files, secrets and backup timers. It does not install Docker, provision users, modify SSH keys or change shared host security settings. The existing shared Traefik handles TLS.

5. **First deployment** (images already published by the `deploy` workflow):

   ```bash
   ansible-playbook playbooks/deploy.yml -e tag=<sha> --ask-vault-pass
   ```

   On a blank server the backup step reports "Database never migrated" and continues.

6. **Content and admin account**, once, on the VPS (the password is read without echo, never in the shell history):

   ```bash
   cd /srv/apps/portfolio/production
   docker compose -f compose.prod.yml --profile ops run --rm content-seed
   read -rs IDENTITY_BOOTSTRAP_PASSWORD && export IDENTITY_BOOTSTRAP_PASSWORD
   docker compose -f compose.prod.yml --profile ops run --rm -e IDENTITY_BOOTSTRAP_PASSWORD \
     identity-bootstrap contact@valentin-fortin.pro
   unset IDENTITY_BOOTSTRAP_PASSWORD
   ```

   The command creates a password-only account and prints only its normalized address; no secret is
   printed. Sign in at `/admin/`, then enable the one-time code (TOTP) from the "Sécurité" page: it asks
   for the password again, shows the QR code and manual key once, and activates the code after a first
   code from the authenticator app (D17). Until then the login asks for the password alone.

   Existing installation: the release adds migration `0003_optional_totp` (nullable `totp_secret`, new
   `pending_totp_secret`), applied by the usual migration step; an account created before keeps its
   secret and its code stays enabled.

   Existing installation: identity migration `0004_oauth_authorization_server` (D45) adds the tables of
   the OAuth authorization server for MCP clients (clients, grants, pending requests, codes, token
   families and refresh tokens), applied by the usual migration step; nothing else changes for the
   administrator.

7. **Site**: run the `Site build` workflow (or publish a change from the admin).

   Existing installation: content migrations `0008_site_texts_admin` and `0009_site_texts_data` (D44)
   move the public links into the profile and create the legal notice and privacy policy from the former
   static pages, then queue one site rebuild, which content-service dispatches once it runs. The new site
   requires `legal` in the snapshot: a `Site build` that fetches it from the previous content-service
   fails at prerender and keeps the current release, the queued rebuild publishing after the deployment.

## GitHub

Secrets of the `production` environment: `VPS_HOST`, `VPS_SSH_KEY` (private key of the deployment account), `VPS_SSH_KNOWN_HOSTS` (verified SSH server fingerprint), `ANSIBLE_VAULT_PASSWORD`. Optional `VPS_USER` overrides the SSH account; it defaults to `deploy`. Rename the former `VPS_KNOWN_HOSTS` secret to `VPS_SSH_KNOWN_HOSTS`. For a nonstandard SSH port, obtain the fingerprint for that port.

- `CI`: format, lint, typecheck, tests, build, architecture test; operations checks (`docker/scripts/check-ops.sh`); e2e (Playwright, four browsers) on `main`.
- `Deploy services` (after CI on `main`): GHCR images, then `playbooks/deploy.yml -e tag=<sha>` → `scripts/deploy.sh`.
- `Site build` (after CI, or triggered by content-service on each publication): snapshot of the published content, prerendered build with `sitemap.xml` and `robots.txt` generated from the same snapshot (`npx nx run web:seo-files`, which runs `web:build` first; origin `SITE_ORIGIN`, default `https://valentin-fortin.pro`, D42), then `playbooks/publish-site.yml -e release=<name>` (release copy, pre-compression and atomic switch). A new rebuild replaces a pending one.

## Migrating an existing standalone installation

Keep `DOCKER_PROJECT_NAME=portfolio` and the existing data-volume identity when adapting an already populated installation. Changing the Compose project name selects different project-scoped volumes; never use `docker compose down -v` for this migration.

Arrange a maintenance window and a current backup. The old portfolio Nginx must release host ports 80/443 before the shared Traefik edge takes them. Recreate the portfolio origin with the new Compose configuration, verify routing and restored client addresses through Traefik, then verify API health and static release serving. Database roles, secret files and static release paths remain compatible. Review any old portfolio-specific Certbot renewal hook manually; shared host certificate tooling may serve other applications and must not be disabled indiscriminately.

## Deployment (`scripts/deploy.sh`)

One deployment at a time (`flock`). Order: images pulled → Postgres up and healthy → backup (skipped only on a never-migrated database) → roles and passwords synced → migrations with the migration roles → roles synced again (grants) → services recreated, `docker compose up --wait` until every container is healthy → Nginx template rendered, configuration tested and reloaded → `TAG` saved in `.env` → images unused for 10 days pruned. Ansible does not reload the previous container while copying the new configuration. A failure stops the script and leaves the previous `TAG` in `.env`.

Downtime: each service is recreated in place (one replica), so its API answers `503` (problem+json) for a few seconds; the static site is not affected. Migrations run while the previous version still serves: they must stay backward compatible (expand now, contract in a later release). Exception: the D40 release converts the stored articles in place (sections to one document per language); between that migration and the recreation of content-service, the previous version may answer errors on project reads. Deploy it outside a publication.

## MCP access (OAuth authorization server, D45)

identity-service is the OAuth 2.1 authorization server of the future MCP endpoint
`https://<APP_HOST>/api/content/mcp`. It needs no new secret or variable:

- **Issuer and keys**: the issuer is `IDENTITY_ISSUER` (`https://<APP_HOST>/api/auth`), and the MCP
  access tokens are signed with the same Ed25519 key as the administrator's and published in the same
  JWKS, so the signing key rotation above covers them (they also live five minutes).
- **Resource**: `IDENTITY_MCP_RESOURCE` is optional and defaults to the issuer's origin followed by
  `/api/content/mcp`; set it only if the MCP endpoint moves. content-service will verify the tokens with
  `McpAuthModule` from `AUTH_ISSUER`, `AUTH_JWKS_URL` and the same resource.
- **Edge**: Nginx serves the discovery documents at `/.well-known/oauth-authorization-server/api/auth`
  (identity) and `/.well-known/oauth-protected-resource/api/content/mcp` (content-service, 404 until the
  MCP endpoint exists), and rate-limits `/api/auth/oauth/token` and `/revoke` (`oauth` zone, 30 requests
  per minute per address) and `/api/auth/oauth/register` (login budget). The consent page
  `/admin/oauth/authorize` is an ordinary admin page (`no-store`, `noindex`, never framed).
- **Outbound HTTPS**: identity-service fetches the clients' metadata documents and logos (port 443,
  public addresses only, 5 kB / 64 kB, 5 seconds). It reaches the Internet through the `proxy` network;
  a host firewall restricting egress must allow outbound HTTPS from that container, otherwise clients
  using Client ID Metadata Documents (Claude, ChatGPT) are refused with `invalid_client` while dynamic
  registration still works.
- **Operations**: the owner revokes a client from « Sécurité › Applications connectées »; revocation
  stops its refreshes at once, and an access token already issued expires within five minutes. To cut
  every client at once, revoke them there one by one, or rotate the signing key (which also ends the
  administrator's access tokens).

## SEO dashboard and audience measurement (D47, D48)

The admin SEO dashboard reads Google Search Console, Google Analytics 4 and PageSpeed Insights from
content-service, cached once a day (05:30 server time) and on request; the public site measures its
audience with GA4 after the visitor's consent. Every source is optional; a missing setting shows as
`not-configured` with the variables to set, a Google error as `error` with its reason.

| Setting                                | Where                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Service account key (JSON)             | Vault `vault_seo_google_credentials` → secret `seo_google_credentials` |
| PageSpeed Insights API key             | Vault `vault_seo_pagespeed_api_key` → secret `seo_pagespeed_api_key`   |
| Search Console property                | GitHub variable `SEO_SEARCH_CONSOLE_PROPERTY` → `.env`                 |
| GA4 property id (numeric)              | GitHub variable `SEO_GA4_PROPERTY_ID` → `.env`                         |
| Key URLs for the Web Vitals (optional) | GitHub variable `SEO_WEB_VITALS_URLS` → `.env`                         |
| GA4 measurement id (`G-…`, public)     | `apps/web/src/environments/audience-measurement.ts`, committed         |

Compose mounts the key at `/run/secrets/seo_google_credentials` (`SEO_GOOGLE_CREDENTIALS_PATH`); the
service reads it on the first refresh only, never at startup. `SEO_SITE_ORIGIN` is `https://<APP_HOST>`.
Owner setup, once:

1. **Google Cloud project**: in the Google Cloud console, create a project (e.g. `portfolio-seo`), then
   under « APIs & Services › Library » enable the **Google Search Console API**, the **Google Analytics
   Data API** and the **PageSpeed Insights API**.
2. **Service account**: « IAM & Admin › Service accounts › Create service account » (e.g.
   `seo-dashboard`), no project role. In its « Keys » tab, « Add key › Create new key › JSON »: paste the
   downloaded file in the vault as a block (`vault_seo_google_credentials: |`), then delete the local
   copy. If the organization policy `iam.disableServiceAccountKeyCreation` blocks keys, allow it for this
   project.
3. **Search Console**: in the property (prefer the domain property `sc-domain:valentin-fortin.pro`),
   « Settings › Users and permissions › Add user »: the service account's address
   (`…@….iam.gserviceaccount.com`), permission « Restricted » (read only). Set
   `SEO_SEARCH_CONSOLE_PROPERTY` to `sc-domain:valentin-fortin.pro` (or the URL prefix property,
   `https://valentin-fortin.pro/`).
4. **GA4**: create the property and a web data stream for `https://valentin-fortin.pro`. In « Admin ›
   Property access management », add the service account address with the « Viewer » role. Set
   `SEO_GA4_PROPERTY_ID` to the numeric property id (« Admin › Property details »).
5. **GA4 settings**: « Admin › Data collection and modification › Data retention »: event data retention
   **14 months**, then save (the default is 2 months; the privacy policy states 14). In the web stream,
   « Enhanced measurement › Page views › Show advanced settings »: turn off « Page changes based on
   browser history events » (the site sends its own page views, D48). Leave Google signals off
   (« Data collection »); the site also disables them and ad personalization in its tag configuration.
6. **Measurement id**: copy the stream's measurement id (`G-…`) into
   `apps/web/src/environments/audience-measurement.ts`, commit it and let the site build publish it: the
   consent banner, « Gérer les cookies » and GA4 appear with it, and not before.
7. **PageSpeed Insights key**: « APIs & Services › Credentials › Create credentials › API key », then
   « Edit API key › API restrictions › Restrict key › PageSpeed Insights API » (optionally an « IP
   addresses » application restriction to the VPS egress address). Put it in
   `vault_seo_pagespeed_api_key`.
8. **Privacy policy**: on the admin « Légal » page, replace the policy's « Cookies » section with the
   « Cookies et mesure d'audience » text (French and English, see the seed
   `libs/backend/content/adapters-out/src/lib/seed/legal-documents.seed.ts`) and adjust the first
   paragraph of « Données collectées »; saving rebuilds the site.
9. **Deploy**: run the `Deploy services` workflow (or `playbooks/deploy.yml`) so Ansible writes the two
   secret files and the variables, then refresh the dashboard (`POST /api/content/admin/seo/dashboard/refresh`, once per 10 minutes) or wait for the daily job.

Existing installation: content migration `0013_seo_dashboard` (D47) adds `content.seo_reports` and
`content.seo_refresh`, applied by the usual migration step; Ansible writes the two secret files, empty
while the vault lacks them, before `docker compose up`. content-service reaches
`searchconsole.googleapis.com`, `analyticsdata.googleapis.com`, `oauth2.googleapis.com` and
`www.googleapis.com` over HTTPS through the `proxy` network: a host firewall restricting egress must
allow them. Rotation: create a new key (service account or API key), update the vault and deploy, then
delete the old key in the console.

## Routine operations

- **Service rollback**: rerun `playbooks/deploy.yml -e tag=<previous sha>` (the script prints the previous tag), or on the VPS `TAG=<sha> bash scripts/deploy.sh`. A migration is not reverted: in case of an incompatible migration, restore the backup taken just before.
- **Site rollback**: `bash /srv/apps/portfolio/production/scripts/publish-site.sh "$(basename "$(readlink /srv/apps/portfolio/production/site/previous)")"`, or any of the last 5 releases in `/srv/apps/portfolio/production/site/releases`.
- **Backups**: `bash scripts/backup.sh` (also run by the timer: `systemctl list-timers portfolio-*`, `journalctl -u portfolio-backup`). Each run writes `portfolio-<stamp>.dump`, checked with `pg_restore --list`, then `portfolio-<stamp>.media.tar.gz`, a tar of the media directory (`BACKUP_MEDIA_DIR`, temporary `.tmp` files left out) checked with `tar --list`; the archive is taken after the dump, so it holds every image the dump references. Old dumps and archives are removed after the same retention, only after a successful backup. Optional encryption: set `portfolio_backup_age_recipient` (an `age1…` public key) — both files are then stored as `.dump.age` and `.media.tar.gz.age` and only the holder of the private key can restore them. Off-site copy: not set up yet (see open items).
- **Restore test**: `bash scripts/restore-check.sh [file]` restores the latest backup into a throwaway Postgres container without network and checks every schema's migration history, then checks the media archive of the same stamp: readable, only `<uuid>.webp` / `<uuid>-960.webp` entries, and every image recorded in the restored `content.media` table present. A backup without media archive fails while a media directory exists. Weekly by `portfolio-restore-check.timer` (`journalctl -u portfolio-restore-check`). Encrypted backups need `BACKUP_AGE_IDENTITY=<key file>`, so run it where the key is.
- **Database restore**:

  ```bash
  cd /srv/apps/portfolio/production
  docker compose -f compose.prod.yml stop identity-service content-service contact-service
  docker compose -f compose.prod.yml exec -T -u postgres postgres \
    pg_restore --dbname portfolio --clean --if-exists --exit-on-error < /srv/apps/portfolio/production/backups/portfolio-<date>.dump
  docker compose -f compose.prod.yml exec -T -u postgres postgres sh /docker-entrypoint-initdb.d/01-roles.sh
  # Media of the same stamp (as root: files keep UID 1000); decrypt first with age for a .age archive.
  sudo tar --extract --gzip --same-owner --file /srv/apps/portfolio/production/backups/portfolio-<date>.media.tar.gz \
    --directory /srv/apps/portfolio/production/media
  docker compose -f compose.prod.yml start identity-service content-service contact-service
  ```

  Extracting does not remove images uploaded after the backup: they have no row in the restored database and stay unused on disk (the purge only selects recorded images).

- **Nginx configuration**: `bash scripts/reload-nginx.sh` renders bind-mounted templates with the container's restricted environment filter, tests the resulting configuration and reloads it. Environment changes require recreating the container first so it receives the new values.
- **Maintenance**: `touch /srv/apps/portfolio/production/site/maintenance` (Nginx answers 503 with the prerendered page), `rm` to reopen.
- **Signing key rotation**: add `k2` to the vault and deploy (published in the JWKS, not used yet); wait at least ten minutes (JWKS cache in the services), then set `identity_signing_kid: k2` and deploy; remove `k1` from the vault at least ten minutes later (lifetime of an access token) and deploy: the role deletes key files no longer in the vault.
- **Password rotation (Postgres roles)**: change it in the vault and deploy: the secrets are rewritten and the roles script applies the new password before the services restart.
- **Logs**: `docker compose -f compose.prod.yml logs -f <service>` (JSON; `request_id` / `x-request-id` links Nginx, the browser and the services). Host jobs: `journalctl -u portfolio-backup -u portfolio-restore-check`.

## Checks (`docker/scripts/check-ops.sh`)

Static checks of the operations code, in pinned containers (Docker; Linux or Git Bash):

```bash
bash docker/scripts/check-ops.sh                 # all
bash docker/scripts/check-ops.sh nginx compose   # some: shellcheck hadolint compose nginx csp ansible
```

- `shellcheck` on `docker/scripts/*.sh` and the Postgres init script; `hadolint` on `docker/service.Dockerfile`;
- `docker compose config` on production and the combined development/acceptance files with public fixture configuration and committed development-secret examples; no temporary Compose file is generated;
- `nginx -t` on the rendered production template and the development configuration; no certificate is required because Traefik terminates TLS;
- `csp`: production and development send the same Content-Security-Policy;
- `ansible`: collections installed from `requirements.yml`, `ansible-playbook --syntax-check` on every playbook, `ansible-lint` with the `production` profile (`ansible/.ansible-lint`).

No Molecule scenario: the portfolio role manages systemd timers and host files, which a container scenario cannot exercise faithfully; a disposable VM (same Ubuntu release as the VPS) is the right target if role tests become worth it. The full stack is exercised locally with `docker/compose.dev.yml`, which uses the same hardening, roles script and Nginx configuration as production.

## Locally

- `docker/compose.dev.yml`: a standalone local stack (Postgres with the production roles, Mailpit, services built from source, Nginx over HTTP on `http://localhost:8080`), with production hardening. It needs no Traefik or external network. This file is for local source builds, unlike the remote-development overlays used in some sibling repositories. Usage is at the top of the file. Development secrets: `bash docker/scripts/dev-secrets.sh` copies `docker/dev/secrets.example/*` to `docker/dev/secrets/` (git-ignored) without overwriting.
- `docker/compose.dev.yml` keeps uploaded images in the named volume `media` (handed to UID 1000 by the one-off `media-init` job), mounted read-write into content-service and read-only into Nginx, which serves `/media/` as in production. The acceptance overlay reuses it; the runner removes it with the project's other volumes.
- **Seeing admin changes locally.** The publication dispatch is disabled outside production, so nothing rebuilds the site by itself:
  - `npx nx serve web` (development configuration) renders the public pages from the content API, not the committed snapshot: `apps/web/src/environments/content-snapshot.ts` is replaced by `content-snapshot.development.ts` through `fileReplacements`. Server rendering calls the `/api/content` target of `apps/web/proxy.conf.json` (`http://localhost:3101`), the browser goes through the dev proxy, and `TransferState` hands the server's copy to hydration. Reload the page after an admin change. When the content service is down, the page falls back on the committed snapshot with a console warning. Production builds and prerendering never contain this loader (D7).
  - Docker stack: `node apps/web/scripts/local-refresh.mjs` (or `npx nx run web:local-refresh`) fetches the published pair from `http://localhost:8080/api/content/snapshot`, checks it like `web:content-snapshot`, builds the production site into `dist/apps/web` and writes `sitemap.xml` and `robots.txt`, like `web:seo-files`. Nginx serves that folder directly, so a reload shows the change; no container restarts. Pass another address as the argument or in `CONTENT_API_URL` (for example `http://localhost:3101` for a content service started with `nx serve`). The committed `apps/web/content-snapshot/*.json` stay untouched: the pair goes to `tmp/local-refresh/` (git-ignored) and the build reads it through a generated tsconfig that only remaps `@internal/web-snapshot/*`. The build always runs (`--skip-nx-cache`), because the Nx cache hashes the committed snapshot. A plain `npx nx run web:seo-files` afterwards puts the committed content back in `dist`. Each step prints its duration.
- `npx nx run-many -t serve -p content-service contact-service identity-service` then `npx nx serve web`: development without Docker (PGlite, `apps/*-service/.env`). `apps/web/proxy.conf.json` also maps the OAuth discovery URL `/.well-known/oauth-authorization-server/api/auth` onto identity-service (D45); a dev server started before that change must be restarted to serve it. Without Nginx, content-service serves `/media/*` itself when `CONTENT_MEDIA_SERVE=true` (images in `CONTENT_MEDIA_DIR`); `apps/web/proxy.conf.json` forwards `/media` to it. The built-site preview (`apps/web-e2e/support/preview/serve-site.mjs`) serves `/media/` from `MEDIA_DIR` when set, with the same name pattern and cache headers as Nginx.

Authenticated acceptance uses `npx nx run web-e2e:e2e-stack`. The runner fixes its generated Compose
project and ignores ambient Compose env files/profiles. It refuses existing resources or image tags,
then removes only its own containers, volumes and three image tags after the run. BuildKit cache and
shared image layers remain reusable. See [Docker optimization verification](docker-optimization-2026-11-03.md).

## Open items

- **Off-site backups**: dumps and media archives stay on the VPS. Ship them to another provider (e.g. restic or rclone to object storage, with the age-encrypted files).
- **Client-address validation**: verify IPv4 and IPv6 visitors at the shared Traefik edge. Nginx can restore only the address Traefik actually receives; a Docker userland proxy or another unconfigured upstream proxy can still obscure it. Keep the shared edge's forwarded-header trust policy explicit.
- **HSTS preload**: the header has no `preload`; add it only together with a submission to hstspreload.org.
