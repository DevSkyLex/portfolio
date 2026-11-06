# Deployment and operations

Production: an OVH VPS, Docker Compose (`docker/compose.prod.yml`), the existing shared Traefik edge, a private Nginx origin and Postgres 17. The public site is rendered per request by an Angular SSR image; it and the three API services (identity, content, contact) are published to GHCR. Ansible prepares and deploys the portfolio on an existing shared VPS; the GitHub workflows call it. Host provisioning, SSH access and Docker are managed separately. Traefik is managed separately, using the same network and deployment conventions as Dentalstock and Fireguard.

| Item                    | Where                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose, Nginx, scripts | `/srv/apps/portfolio/production` (copied by Ansible from `docker/`)                                                                                              |
| Compose variables       | `/srv/apps/portfolio/production/.env` (Ansible; `TAG` written by `scripts/deploy.sh`)                                                                            |
| Secrets                 | `/srv/apps/portfolio/production/secrets` (written by Ansible from GitHub environment secrets, `0700` directory)                                                  |
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
- **Postgres roles** (D23): `docker/postgres/init/01-roles.sh` is idempotent. The image runs it on the first start; `scripts/deploy.sh` runs it again before and after the migrations, so a changed GitHub secret, new grants or new tables are applied on the next deployment. The application roles have data access only (not on `__migrations`), connection limits, and `PUBLIC` has no access to the database.
- **Traefik**: routers use entrypoints `web` and `websecure`, HTTP redirects to HTTPS, and TLS uses the existing `letsencrypt` resolver. The secure router accepts `APP_HOST` and `www.APP_HOST`; Nginx redirects `www` to the canonical host. Optional `TRAEFIK_SECURE_MIDDLEWARES` attaches an existing shared middleware chain.
- **Localized URLs**: public pages and administration live under `/fr/` and `/en/`. Legacy French
  addresses redirect to `/fr/` while keeping their query; APIs and media remain at their existing paths.
  The French redirect activates only once a release with the `/fr/` build is present, so either
  workflow can finish first during the transition.
- **Nginx**: the official entrypoint renders `nginx/templates/portfolio.conf.template` into `/tmp/portfolio.conf` on tmpfs. `APP_PORT` is the internal HTTP listening port, not a published host port. Only the reviewed Traefik peer from `TRUSTED_PROXIES` may reach the origin or supply the client address; this restored address drives rate limits and logs. HTTPS is preserved when forwarding to services. Upstreams resolve through Docker DNS at runtime, so recreated services need no Nginx reload. JSON access logs carry `request_id`, also returned in `X-Request-Id` and passed to services. Public HTML and SEO documents are never cached by Nginx; hashed assets are cached for a year. `/admin.css`, the unhashed administration stylesheet loaded by the admin area only (D31), is revalidated. The private SSR service owns the assets of its deployed code version. `/media/` serves only names matching `<uuid>.webp` or `<uuid>-960.webp` (immutable, one year, with the server's security headers including `nosniff`); any other path under `/media/` answers 404. Request bodies are 64 kB by default; `/api/content/admin/projects/` and `/api/content/admin/legal/` accept 1100 kB (the service's JSON limit is 1 MB) and `POST /api/content/admin/media` 11 MB (the service caps the file at 10 MiB); larger bodies get a problem+json 413 (`http.413`, `content.media-too-large`). The CSP `script-src` carries a per-request nonce (`'nonce-$request_id'`), passed to the SSR service in `X-CSP-Nonce` and written on Angular's inline event replay scripts (D20 revision, D53). Uploaded images come from the same origin (`img-src 'self' data:`); the CSP only adds the Google tag origin to `script-src` and the GA4 collection hosts to `img-src` and `connect-src`, for the audience measurement loaded after consent (D48).

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

[`docker/.env.example`](../../docker/.env.example) lists public runtime settings. Ansible writes the server's `.env`; Ansible writes Docker secret files from the production GitHub environment secrets. Configure the following GitHub `production` environment variables, or supply the corresponding environment variables when running Ansible manually:

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
| `SSR_MEMORY_LIMIT` / `SSR_CPU_LIMIT`      | Angular SSR runtime resource limits                  | `512M` / `1.0`                    |
| `LOG_MAX_SIZE` / `LOG_MAX_FILES`          | Container log rotation                               | `10m` / `5`                       |
| `LOG_LEVEL`                               | Service log level                                    | `info`                            |
| `CONTACT_MAIL_FROM` / `CONTACT_NOTIFY_TO` | Sender and notification recipient                    | Addresses derived from `APP_HOST` |
| `SEO_SEARCH_CONSOLE_PROPERTY`             | SEO dashboard: Search Console property (D47)         | Empty: section not configured     |
| `SEO_GA4_PROPERTY_ID`                     | SEO dashboard: numeric GA4 property id (D47)         | Empty: section not configured     |
| `SEO_WEB_VITALS_URLS`                     | SEO dashboard: comma-separated key URLs (D47)        | Home FR/EN and the first project  |
| `VPS_PORT`                                | SSH port                                             | `22`                              |

Obtain `TRUSTED_PROXIES` from the existing Traefik configuration. Use a stable, reviewed proxy address; do not trust the whole shared Docker network, all private ranges or an unrestricted CIDR. A changed Traefik address requires updating this setting and recreating the origin. Ansible validates the address and requires the external `traefik_proxy` network to exist; it does not create the shared proxy or its network.

The portfolio has four distinct API and SSR images, so it retains `REGISTRY` and a common commit `TAG` instead of a single `IMAGE_REF`. `IDENTITY_SIGNING_KID` defaults to `k1` and can be set as a GitHub variable; `MEDIA_ROOT` comes from the role default `portfolio_media_root` (`<app_root>/media`, so `/srv/apps/portfolio/production/media`), also written to `backup.env` as `BACKUP_MEDIA_DIR`. Image tags identify the deployed commit; base images remain pinned by digest.

The site, media and backup paths follow `VPS_APP_DIR`: `<app_root>/site`, `<app_root>/media` and `<app_root>/backups`. The paths above use its default. Nginx still sees the site at `/srv/site` inside its container.

For an existing installation using the former `/srv/portfolio`, `/srv/site` or `/srv/backups` paths, plan and verify a separate migration of the site releases, media, backups and configuration before switching paths. Changing the defaults does not migrate existing data.

## GitHub application secrets

Configure these secrets in the GitHub `production` environment. They are passed only to the deployment step; the validator prints only missing or invalid names. Ansible checks them again without logging values before touching application files. Manual Ansible runs need the same names in the controller environment, supplied through the operator's secret manager; never put their values in shell history or repository files.

An old local `ansible/inventory/group_vars/all/vault.yml`, if present, is still automatically loaded by Ansible even though it is no longer used by the project. Before a manual run, move any retained encrypted vault outside the inventory directory; preserve it securely if it contains credentials you still need.

| Secret                                                | Purpose                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`                                   | Postgres administrator password.                                               |
| `CONTENT_MIGRATOR_PASSWORD`, `CONTENT_APP_PASSWORD`   | Content migration and application database passwords.                          |
| `CONTACT_MIGRATOR_PASSWORD`, `CONTACT_APP_PASSWORD`   | Contact migration and application database passwords.                          |
| `IDENTITY_MIGRATOR_PASSWORD`, `IDENTITY_APP_PASSWORD` | Identity migration and application database passwords.                         |
| `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`                  | Brevo SMTP login and SMTP key; the SMTP key is not an API key.                 |
| `CONTACT_CLIENT_KEY_SECRET`                           | Contact fingerprint HMAC key, at least 32 characters.                          |
| `IDENTITY_SIGNING_KEY_K1`                             | Unencrypted Ed25519 PKCS#8 private key, including PEM delimiters and newlines. |
| `GHCR_TOKEN`                                          | Optional classic token with read:packages and access to the service images.    |
| `IDENTITY_SIGNING_KEY_K2`                             | Optional second Ed25519 key for rotation.                                      |
| `SEO_GOOGLE_CREDENTIALS`, `SEO_PAGESPEED_API_KEY`     | Optional SEO dashboard credentials.                                            |

All seven Postgres passwords must be distinct, alphanumeric and at least 24 characters; generate each independently, for example with `openssl rand -hex 24`. Generate the HMAC key with `openssl rand -hex 32`. Generate the signing key in a trusted environment and provide its entire PKCS#8 PEM as the GitHub secret; do not commit it. The active slot is selected by `IDENTITY_SIGNING_KID` (`k1` by default); the active key must be present. The workflow defaults `GHCR_TOKEN` to the job's temporary GitHub token and `GHCR_USERNAME` to the GitHub actor, as in Fireguard. An optional `GHCR_TOKEN` secret and `GHCR_USERNAME` variable can select a dedicated account with access to the service images; manual Ansible runs must supply both. The SSH secrets are listed in [GitHub](#github). Do not put secret values in tickets or chat.

## Brevo email delivery

The contact service sends notifications through Brevo over SMTPS (`smtp-relay.brevo.com:465`). Ansible builds the existing SMTP secret file from `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY` GitHub environment secrets, encoding both credentials. The credentials are not written to the Compose environment. Local development continues to use Mailpit.

1. In Brevo, add and authenticate `valentin-fortin.pro` (or the chosen sender subdomain) under Settings → Senders, Domains and IPs → Domains. Add the exact DNS records Brevo provides without replacing existing mail or authentication records. Authentication can take up to 48 hours. See [Brevo's domain guide](https://help.brevo.com/hc/fr/articles/12163873383186-Authentifier-votre-domaine-dans-Brevo-code-Brevo-enregistrement-DKIM-enregistrement-DMARC).
2. Activate transactional email if Brevo requires it. In Settings → SMTP & API → SMTP, copy the displayed SMTP login and generate a dedicated SMTP key; enter them as GitHub `production` secrets `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY`. The SMTP key is different from a Brevo API key. Check the account's IP authorization if enabled.
3. Set `CONTACT_MAIL_FROM` to an address on the authenticated sender domain and `CONTACT_NOTIFY_TO` to an existing mailbox. For `send.valentin-fortin.pro`, use `Portfolio <noreply@send.valentin-fortin.pro>` as the sender. Brevo's sending service does not itself create the receiving inbox. Notifications keep the visitor's address as Reply-To.
4. Check the VPS can reach `smtp-relay.brevo.com` on port 465. After deployment, submit a contact message and check the mailbox and Brevo's transactional email logs; SMTP acceptance alone does not prove delivery.
5. Review and publish the French and English privacy policy before enabling Brevo. The contact notification includes the visitor's details and message. The initial legal seed describes Brevo; an existing policy must be updated through the admin « Légal » page and republished. Do not rerun the content seed on an existing site: it replaces all content.

Brevo states that an SMTP key can be deactivated after 90 days without a successful send, even when it has no fixed expiration date. Monitor the key's status and the provider's warning emails; check the [SMTP key policy](https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys).

The worker retries failed deliveries; its Message-ID is stable, but delivery remains at least once and duplicate messages are possible. See [Brevo's SMTP guide](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

## First installation

1. **Shared edge and DNS**: the existing Traefik must expose `web` / `websecure`, have the `letsencrypt` resolver and join external `traefik_proxy`. Point `APP_HOST` and `www.APP_HOST` to that edge. Record its reviewed address in `TRUSTED_PROXIES`.
2. **Existing access**: configure `VPS_HOST`, optional `VPS_USER` and `VPS_PORT`, and authorize the deployment public key on the VPS through its existing administration process. The SSH account defaults to `deploy`; it must already exist, have passwordless sudo and Docker access, and have a primary group with the same name. The repository does not manage `authorized_keys`, SSH, the firewall or Docker on the host.
3. **Secrets**: add the application secrets listed in [GitHub application secrets](#github-application-secrets) to the `production` environment. A failed validation stops before Ansible changes the server. Optional SEO secrets can be left empty.

4. **Prepare the portfolio** using the existing deployment account:

   ```bash
   cd ansible && ansible-galaxy collection install -r requirements.yml -p .collections
   ansible-playbook playbooks/provision.yml
   ```

   The playbook prepares portfolio files, secrets and backup timers. It does not install Docker, provision users, modify SSH keys or change shared host security settings. The existing shared Traefik handles TLS.

5. **First deployment** (images already published by the `deploy` workflow):

   ```bash
   ansible-playbook playbooks/deploy.yml -e tag=<sha>
   ```

   On a blank server the backup step reports "Database never migrated" and continues.

6. **Content and admin account**: the content migration creates a minimal bilingual profile for a
   fresh database, with no example projects, skills or timeline entries. Complete the profile and
   review the legal documents in the administration. Create the administrator once on the VPS (the
   password is read without echo, never in the shell history):

   ```bash
   cd /srv/apps/portfolio/production
   read -rs IDENTITY_BOOTSTRAP_PASSWORD && export IDENTITY_BOOTSTRAP_PASSWORD
   docker compose -f compose.prod.yml --profile ops run --rm -e IDENTITY_BOOTSTRAP_PASSWORD \
     identity-bootstrap contact@valentin-fortin.pro
   unset IDENTITY_BOOTSTRAP_PASSWORD
   ```

   The command creates a password-only account and prints only its normalized address; no secret is
   printed. Sign in at `/fr/admin/`, then enable the one-time code (TOTP) from the "Sécurité" page: it asks
   for the password again, shows the QR code and manual key once, and activates the code after a first
   code from the authenticator app (D17). Until then the login asks for the password alone.

   The optional `content-seed` job replaces all content with the mockup examples; do not run it on an
   existing site or when starting with an empty portfolio.

   Existing installation: the release adds migration `0003_optional_totp` (nullable `totp_secret`, new
   `pending_totp_secret`), applied by the usual migration step; an account created before keeps its
   secret and its code stays enabled.

   Existing installation: identity migration `0004_oauth_authorization_server` (D45) adds the tables of
   the OAuth authorization server for MCP clients (clients, grants, pending requests, codes, token
   families and refresh tokens), applied by the usual migration step; nothing else changes for the
   administrator.

7. **Site**: the same deployment starts the `web` SSR image after content-service is healthy.
   Public content is fetched from the fixed internal content-service URL for each render. Content
   changes require no workflow, image build or container restart. Historical frozen publication
   batches are recovered by content-service at startup.

## GitHub

Connection secrets of the `production` environment: `VPS_HOST`, `VPS_SSH_KEY` (private key of the deployment account) and `VPS_SSH_KNOWN_HOSTS` (complete verified OpenSSH known_hosts entries). Optional `VPS_USER` overrides the SSH account; it defaults to `deploy`. Rename the former `VPS_KNOWN_HOSTS` secret to `VPS_SSH_KNOWN_HOSTS`. For a nonstandard SSH port, obtain the fingerprint for that port.

Deployment uses the configured SSH port and verifies the server against `known_hosts`.

- `CI` runs on pull requests targeting `main`: format, lint, typecheck, tests, build, architecture and
  operations checks (`docker/scripts/check-ops.sh`), plus built-site and full-stack e2e tests.
  Coverage runs in three parallel platform partitions; acceptance jobs start independently of quality.
  See the [CI execution budget](../workspace/testing.md#ci-execution-budget) for selection and limits.
- `Deploy services` runs when a GitHub release is published, including a published prerelease. It builds the three API contexts and the Angular SSR code,
  publishes four immutable images to GHCR, then runs `playbooks/deploy.yml -e tag=<sha>` through the
  existing deployment script. All four images use the release tag's commit SHA. There is no separate
  site-build workflow and no content publication credential.
  Release preparation pins npm from `packageManager` and installs dependencies without restoring a
  dependency cache. All jobs use Ubuntu 24.04; only image publication has package-write permission.

Publish a release only for a reviewed commit: the release workflow does not run CI or check that its
tag points to `main`. A merge alone does not deploy. The `production` environment's deployment rules
must allow the release tags. For rollback, use the procedure under Routine operations.

The `web` container runs as UID 1000 with a read-only filesystem and bounded temporary storage.
Its memory and CPU limits use separate `SSR_MEMORY_LIMIT` / `SSR_CPU_LIMIT` variables, preserving the
existing Nginx limits during migration. It listens only on the private proxy network at port 4000, reads content from
`http://content-service:3101`, and receives the fixed public `SITE_ORIGIN`. Nginx retains the public
security headers, API budgets and uploaded-media routing and proxies page requests to this runtime.
Administration remains client-rendered, `noindex` and `no-store`. Public API or SSR failure returns
an error status instead of a successful response containing stale fixture content.

## Migrating an existing standalone installation

Keep `DOCKER_PROJECT_NAME=portfolio` and the existing data-volume identity when adapting an already populated installation. Changing the Compose project name selects different project-scoped volumes; never use `docker compose down -v` for this migration.

Arrange a maintenance window and a current backup. The old portfolio Nginx must release host ports 80/443 before the shared Traefik edge takes them. Recreate the portfolio origin with the new Compose configuration, verify routing and restored client addresses through Traefik, then verify API health and SSR page serving. Database roles, application secret files and media storage remain compatible. The former site release directory is no longer mounted or used by Nginx. Review any old portfolio-specific Certbot renewal hook manually; shared host certificate tooling may serve other applications and must not be disabled indiscriminately.

## Deployment (`scripts/deploy.sh`)

One deployment at a time (`flock`). Order: images pulled → Postgres up and healthy → backup (skipped only on a never-migrated database) → roles and passwords synced → migrations with the migration roles → roles synced again (grants) → services recreated, `docker compose up --wait` until every container is healthy → Nginx template rendered, configuration tested and reloaded → `TAG` saved in `.env`. The deployment does not prune Docker images on the shared VPS. Ansible does not reload the previous container while copying the new configuration. A failure stops the script and leaves the previous `TAG` in `.env`.

Downtime: containers are recreated in place (one replica). API and SSR requests can answer `503` briefly during deployment; content-service downtime also affects public page rendering. Migrations run while the previous version still serves: they must stay backward compatible (expand now, contract in a later release). Exception: the D40 release converts the stored articles in place (sections to one document per language); between that migration and the recreation of content-service, the previous version may answer errors on project reads. Deploy it outside a publication.

## MCP access (OAuth authorization server, D45)

identity-service is the OAuth 2.1 authorization server of the MCP endpoint
`https://<APP_HOST>/api/content/mcp`. It needs no new secret or variable:

- **Issuer and keys**: the issuer is `IDENTITY_ISSUER` (`https://<APP_HOST>/api/auth`), and the MCP
  access tokens are signed with the same Ed25519 key as the administrator's and published in the same
  JWKS, so the signing key rotation above covers them (they also live five minutes).
- **Resource**: `IDENTITY_MCP_RESOURCE` is optional and defaults to the issuer's origin followed by
  `/api/content/mcp`; the content-service app uses that default resource, so keep both services
  aligned. It verifies tokens with `McpAuthModule` from `AUTH_ISSUER`, `AUTH_JWKS_URL` and the same
  resource.
- **Edge**: Nginx serves the discovery documents at `/.well-known/oauth-authorization-server/api/auth`
  (identity) and `/.well-known/oauth-protected-resource/api/content/mcp` (content-service), and
  rate-limits per address `/api/auth/oauth/token` and `/revoke` (`oauth` zone, 60 requests per minute,
  30 at once), `/api/auth/oauth/register` (`oauth_register` zone, 10 per minute, 10 at once, apart from
  the login budget; the service also caps registrations at 60 per hour for all addresses), and the MCP
  endpoint with its discovery documents (`mcp` zone, 30 per second, 300 at once, 64 requests in flight,
  apart from the admin API's budget). Config: `docker/nginx/conf.d/00-http.conf`,
  `docker/nginx/snippets/site.conf`. The consent page
  `/admin/oauth/authorize` is an ordinary admin page (`no-store`, `noindex`, never framed).
- **Outbound HTTPS**: identity-service fetches the clients' metadata documents and logos (port 443,
  public addresses only, 5 kB / 64 kB, 5 seconds). It reaches the Internet through the `proxy` network;
  a host firewall restricting egress must allow outbound HTTPS from that container, otherwise clients
  using Client ID Metadata Documents (Claude, ChatGPT) are refused with `invalid_client` while dynamic
  registration still works. content-service also downloads the image URLs given to the MCP
  `upload_media` tool (port 443, public addresses only, 10 MiB, 15 seconds, D54): the same egress rule
  applies to its container.
- **Operations**: the owner revokes a client from « Sécurité › Applications connectées »; revocation
  stops its refreshes at once, and an access token already issued expires within five minutes. To cut
  every client at once, revoke them there one by one, or rotate the signing key (which also ends the
  administrator's access tokens).

### Connect a Codex client (D49)

After the service version containing the MCP endpoint is available, configure the remote server and
start the browser consent flow from a terminal with the Codex CLI installed:

```powershell
codex mcp add portfolio --url https://valentin-fortin.pro/api/content/mcp
codex mcp login portfolio --scopes content:read
codex mcp list
```

Sign in to the portfolio administration and review the requested permissions. Read access lists drafts
and published projects, timeline entries, profile and legal documents. To authorize a broader task,
repeat login with only the scopes it needs, for example:

```powershell
codex mcp login portfolio --scopes content:read,content:write
```

`content:write` permits draft project revisions. Revising a published project also requires
`content:publish`, because the revision preserves its publication state and queues a rebuild.
`content:publish` permits project publication and unpublication. Timeline, profile and legal edits
require both `content:write` and `content:publish` because they immediately change public content.
Timeline deletion requires `content:delete` and
`content:publish`. No scope exposes contact messages. Revisions, publish/unpublish, deletion and
reordering require the `expectedVersion` returned by the corresponding read (the list version for
reordering); reread and reconcile after a version conflict. Media uploads remain in the admin UI.

The endpoint uses stateless Streamable HTTP with JSON responses and freshly verified bearer tokens
on each request. The RFC 9728 document remains public; a missing token yields a 401 discovery
challenge and a missing tool permission yields 403 `insufficient_scope`. Nginx accepts up to 1100 kB
at `/api/content/mcp`, while the service caps parsed JSON at 1 MB. See D49 for the complete tool list.
Revoke the client under Security / Connected applications when access is no longer needed.

## SEO dashboard and audience measurement (D47, D48)

The admin SEO dashboard reads Google Search Console, Google Analytics 4 and PageSpeed Insights from
content-service, cached once a day (05:30 server time) and on request; the public site measures its
audience with GA4 after the visitor's consent. Every source is optional; a missing setting shows as
`not-configured` with the variables to set, a Google error as `error` with its reason.

Locally, `SEO_DEMO_DATA=true` (set in `docker/compose.dev.yml` and `apps/content-service/.env.example`)
replaces each unconfigured source by demonstration figures (D52): the dashboard fills on the first
« Actualiser », without any notice on screen. It changes nothing for a configured source; never set
it in production.

| Setting                                | Where                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Service account key (JSON)             | GitHub secret `SEO_GOOGLE_CREDENTIALS` → Docker secret `seo_google_credentials` |
| PageSpeed Insights API key             | GitHub secret `SEO_PAGESPEED_API_KEY` → Docker secret `seo_pagespeed_api_key`   |
| Search Console property                | GitHub variable `SEO_SEARCH_CONSOLE_PROPERTY` → `.env`                          |
| GA4 property id (numeric)              | GitHub variable `SEO_GA4_PROPERTY_ID` → `.env`                                  |
| Key URLs for the Web Vitals (optional) | GitHub variable `SEO_WEB_VITALS_URLS` → `.env`                                  |
| GA4 measurement id (`G-…`, public)     | `apps/web/src/environments/audience-measurement.ts`, committed                  |

Compose mounts the key at `/run/secrets/seo_google_credentials` (`SEO_GOOGLE_CREDENTIALS_PATH`); the
service reads it on the first refresh only, never at startup. `SEO_SITE_ORIGIN` is `https://<APP_HOST>`.
Owner setup, once:

1. **Google Cloud project**: in the Google Cloud console, create a project (e.g. `portfolio-seo`), then
   under « APIs & Services › Library » enable the **Google Search Console API**, the **Google Analytics
   Data API** and the **PageSpeed Insights API**.
2. **Service account**: « IAM & Admin › Service accounts › Create service account » (e.g.
   `seo-dashboard`), no project role. In its « Keys » tab, « Add key › Create new key › JSON »: paste the
   downloaded JSON into the `SEO_GOOGLE_CREDENTIALS` GitHub environment secret, then delete the local
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
   the `SEO_PAGESPEED_API_KEY` GitHub environment secret.
8. **Privacy policy**: on the admin « Légal » page, replace the policy's « Cookies » section with the
   « Cookies et mesure d'audience » text (French and English, see the seed
   `libs/backend/content/adapters-out/src/lib/seed/legal-documents.seed.ts`) and adjust the first
   paragraph of « Données collectées »; saving rebuilds the site.
9. **Deploy**: publish a GitHub release (or run `playbooks/deploy.yml`) so Ansible writes the two
   secret files and the variables, then refresh the dashboard (`POST /api/content/admin/seo/dashboard/refresh`, once per 10 minutes) or wait for the daily job.

Existing installation: content migration `0013_seo_dashboard` (D47) adds `content.seo_reports` and
`content.seo_refresh`, applied by the usual migration step; Ansible writes the two secret files, empty
when the GitHub secrets are absent, before `docker compose up`. content-service reaches
`searchconsole.googleapis.com`, `analyticsdata.googleapis.com`, `oauth2.googleapis.com` and
`www.googleapis.com` over HTTPS through the `proxy` network: a host firewall restricting egress must
allow them. Rotation: create a new key (service account or API key), update the GitHub secret and deploy, then
delete the old key in the console.

## Routine operations

- **Service rollback**: rerun `playbooks/deploy.yml -e tag=<previous sha>` (the script prints the previous tag), or on the VPS `TAG=<sha> bash scripts/deploy.sh`. A migration is not reverted: in case of an incompatible migration, restore the backup taken just before.
- **Site rollback**: use the same previous code tag as the service rollback; the SSR image is versioned with the APIs. Content rollback remains a content edit or database restoration.
- **Backups**: `bash scripts/backup.sh` (also run by the timer: `systemctl list-timers portfolio-*`, `journalctl -u portfolio-backup`). Each run writes `portfolio-<stamp>.dump`, checked with `pg_restore --list`, then `portfolio-<stamp>.media.tar.gz`, a tar of the media directory (`BACKUP_MEDIA_DIR`, temporary `.tmp` files left out) checked with `tar --list`; the archive is taken after the dump, so it holds every image the dump references. Old dumps and archives are removed after the same retention, only after a successful backup. Optional encryption: set `portfolio_backup_age_recipient` (an `age1…` public key) — both files are then stored as `.dump.age` and `.media.tar.gz.age` and only the holder of the private key can restore them. Off-site copy: not set up yet (see open items).
- **Restore test**: `bash scripts/restore-check.sh [file]` restores the latest backup into a throwaway Postgres container without network and checks every schema's migration history, then checks the media archive of the same stamp: readable, only `<uuid>.webp` / `<uuid>-960.webp` entries, and every image recorded in the restored `content.media` table present. A backup without media archive fails while a media directory exists. Weekly by `portfolio-restore-check.timer` (`journalctl -u portfolio-restore-check`). Encrypted backups need `BACKUP_AGE_IDENTITY=<key file>`, so run it where the key is.
- **Database restore**:

  ```bash
  cd /srv/apps/portfolio/production
  docker compose -f compose.prod.yml stop web identity-service content-service contact-service
  docker compose -f compose.prod.yml exec -T -u postgres postgres \
    pg_restore --dbname portfolio --clean --if-exists --exit-on-error < /srv/apps/portfolio/production/backups/portfolio-<date>.dump
  docker compose -f compose.prod.yml exec -T -u postgres postgres sh /docker-entrypoint-initdb.d/01-roles.sh
  # Media of the same stamp (as root: files keep UID 1000); decrypt first with age for a .age archive.
  sudo tar --extract --gzip --same-owner --file /srv/apps/portfolio/production/backups/portfolio-<date>.media.tar.gz \
    --directory /srv/apps/portfolio/production/media
  docker compose -f compose.prod.yml start identity-service content-service contact-service web
  ```

  Extracting does not remove images uploaded after the backup: they have no row in the restored database and stay unused on disk (the purge only selects recorded images).

- **Nginx configuration**: `bash scripts/reload-nginx.sh` renders bind-mounted templates with the container's restricted environment filter, tests the resulting configuration and reloads it. Environment changes require recreating the container first so it receives the new values.
- **Maintenance**: stop the private `web` service to return a truthful 503 for public page requests; API and media routes remain independent. Restart it to reopen.
- **Signing key rotation**: set `IDENTITY_SIGNING_KEY_K2` and deploy (published in the JWKS, not used yet); wait at least ten minutes (JWKS cache), set the GitHub variable `IDENTITY_SIGNING_KID` to `k2` and deploy, then remove `IDENTITY_SIGNING_KEY_K1` at least ten minutes later and deploy again. The role removes unconfigured key files. Reverse the slots for the next rotation.
- **Password rotation (Postgres roles)**: update the relevant GitHub secret and deploy: the secrets are rewritten and the roles script applies the new password before the services restart.
- **Logs**: `docker compose -f compose.prod.yml logs -f <service>` (JSON; `request_id` / `x-request-id` links Nginx, the browser and the services). Host jobs: `journalctl -u portfolio-backup -u portfolio-restore-check`.

## Checks (`docker/scripts/check-ops.sh`)

Static checks of the operations code, in pinned containers (Docker; Linux or Git Bash):

```bash
bash docker/scripts/check-ops.sh                 # all
bash docker/scripts/check-ops.sh nginx compose   # some: shellcheck hadolint compose nginx csp ansible
```

- `shellcheck` on `docker/scripts/*.sh` and the Postgres init script; `hadolint` on `docker/service.Dockerfile` and `docker/web.Dockerfile`;
- `docker compose config` on production and the combined development/acceptance files with public fixture configuration and committed development-secret examples; no temporary Compose file is generated;
- `nginx -t` on the rendered production template and the development configuration; no certificate is required because Traefik terminates TLS;
- `csp`: production and development send the same Content-Security-Policy;
- `ansible`: collections installed from `requirements.yml`, `ansible-playbook --syntax-check` on every playbook, `ansible-lint` with the `production` profile (`ansible/.ansible-lint`).

No Molecule scenario: the portfolio role manages systemd timers and host files, which a container scenario cannot exercise faithfully; a disposable VM (same Ubuntu release as the VPS) is the right target if role tests become worth it. The full stack is exercised locally with `docker/compose.dev.yml`, which uses the same hardening, roles script and Nginx configuration as production.

## Locally

- `docker/compose.dev.yml`: a standalone local stack (Postgres with the production roles, Mailpit, services built from source, Nginx over HTTP on `http://localhost:8080`), with production hardening. It needs no Traefik or external network. This file is for local source builds, unlike the remote-development overlays used in some sibling repositories. Usage is at the top of the file. Development secrets: `bash docker/scripts/dev-secrets.sh` copies `docker/dev/secrets.example/*` to `docker/dev/secrets/` (git-ignored) without overwriting.
- `docker/compose.dev.yml` keeps uploaded images in the named volume `media` (handed to UID 1000 by the one-off `media-init` job), mounted read-write into content-service and read-only into Nginx, which serves `/media/` as in production. The acceptance overlay reuses it; the runner removes it with the project's other volumes.
- **Seeing admin changes locally.** Reload a public page after saving in the administration. Both
  development and the Docker `web` SSR service fetch current published content at request time; no
  local refresh build is required. The Docker runtime reaches `http://content-service:3101` directly.
- `npx nx run-many -t serve -p content-service contact-service identity-service` then `npx nx serve web`: development without Docker (PGlite, `apps/*-service/.env`). `apps/web/proxy.conf.json` also maps the OAuth discovery URL `/.well-known/oauth-authorization-server/api/auth` onto identity-service (D45); a dev server started before that change must be restarted to serve it. Without Nginx, content-service serves `/media/*` itself when `CONTENT_MEDIA_SERVE=true` (images in `CONTENT_MEDIA_DIR`); `apps/web/proxy.conf.json` forwards `/media` to it. The SSR preview (`apps/web-e2e/support/preview/serve-ssr.mjs`) runs the built runtime against a disposable fixture content API; authenticated stack acceptance uses the real internal content service.

Authenticated acceptance uses `npx nx run web-e2e:e2e-stack`. The runner fixes its generated Compose
project and ignores ambient Compose env files/profiles. It refuses existing resources or image tags,
then removes only its own containers, volumes and four image tags after the run. BuildKit cache and
shared image layers remain reusable. See [Docker optimization verification](docker-optimization-2026-11-03.md).

## Open items

- **Off-site backups**: dumps and media archives stay on the VPS. Ship them to another provider (e.g. restic or rclone to object storage, with the age-encrypted files).
- **Client-address validation**: verify IPv4 and IPv6 visitors at the shared Traefik edge. Nginx can restore only the address Traefik actually receives; a Docker userland proxy or another unconfigured upstream proxy can still obscure it. Keep the shared edge's forwarded-header trust policy explicit.
- **HSTS preload**: the header has no `preload`; add it only together with a submission to hstspreload.org.
