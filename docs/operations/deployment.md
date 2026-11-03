# Deployment and operations

Production: an OVH VPS, Docker Compose (`docker/compose.prod.yml`), the existing shared Traefik edge, a private Nginx origin and Postgres 17. The public site is a set of static pages published per release; the three services (identity, content, contact) are images published to GHCR. Ansible provisions the server and deploys; the GitHub workflows call it. Traefik is managed separately, using the same network and deployment conventions as Dentalstock and Fireguard.

| Item                    | Where                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Compose, Nginx, scripts | `/srv/portfolio` (copied by Ansible from `docker/`)                                      |
| Compose variables       | `/srv/portfolio/.env` (Ansible; `TAG` written by `scripts/deploy.sh`)                    |
| Secrets                 | `/srv/portfolio/secrets` (rendered from Ansible Vault, `0700` directory)                 |
| Static site             | `/srv/site/releases/<release>`, links `/srv/site/current` and `/srv/site/previous`       |
| Backups                 | `/srv/backups` (`0750`; daily at 03:30 and before each deployment, 14 days)              |
| Certificates            | Existing shared Traefik, resolver `letsencrypt`; none mounted into the portfolio         |
| Timers                  | `portfolio-backup.timer` (daily), `portfolio-restore-check.timer` (weekly, Sunday 04:00) |

## Containers

- **Hardening**: every container runs with a read-only root file system (`tmpfs` for `/tmp` and runtime directories), `cap_drop: ALL` (Postgres and Nginx get back only what their entrypoint needs to drop to their own user), `no-new-privileges`, memory/CPU/PID limits and rotated logs (`local` driver, 5 × 10 MB). The services run as UID 1000 on a plain Alpine image with the Node binary only (no npm, npx, corepack or yarn).
- **Images**: pinned by version and digest (`docker/service.Dockerfile`, compose files); update version and digest together.
- **Networks**: external `traefik_proxy` connects Traefik to Nginx only. Private `proxy` connects Nginx to services and provides outbound access for GitHub and SMTP; `database` is internal, without egress. Services and Postgres never join the shared edge network. Nginx cannot reach Postgres; migrations and one-off jobs only join `database`. Production publishes no host ports.
- **Postgres roles** (D23): `docker/postgres/init/01-roles.sh` is idempotent. The image runs it on the first start; `scripts/deploy.sh` runs it again before and after the migrations, so a password changed in the vault, new grants or new tables are applied on the next deployment. The application roles have data access only (not on `__migrations`), connection limits, and `PUBLIC` has no access to the database.
- **Traefik**: routers use entrypoints `web` and `websecure`, HTTP redirects to HTTPS, and TLS uses the existing `letsencrypt` resolver. The secure router accepts `APP_HOST` and `www.APP_HOST`; Nginx redirects `www` to the canonical host. Optional `TRAEFIK_SECURE_MIDDLEWARES` attaches an existing shared middleware chain.
- **Nginx**: the official entrypoint renders `nginx/templates/portfolio.conf.template` into `/tmp/portfolio.conf` on tmpfs. `APP_PORT` is the internal HTTP listening port, not a published host port. Only the reviewed Traefik peer from `TRUSTED_PROXIES` may reach the origin or supply the client address; this restored address drives rate limits and logs. HTTPS is preserved when forwarding to services. Upstreams resolve through Docker DNS at runtime, so recreated services need no Nginx reload. JSON access logs carry `request_id`, also returned in `X-Request-Id` and passed to services. Pages are revalidated (`no-cache`); hashed assets are cached for a year and other static files for an hour. Missing hashed assets fall back to the previous release.

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
| `VPS_APP_DIR`                             | Ansible `app_root`, deployment directory             | `/srv/portfolio`                  |
| `TRAEFIK_ROUTER_NAME`                     | Unique router, service and redirect middleware names | Project name                      |
| `TRAEFIK_SECURE_MIDDLEWARES`              | Existing secure middleware chain                     | Empty                             |
| `TRUSTED_PROXIES`                         | One reviewed Traefik IP address or narrow CIDR       | Required; no default              |
| `WEB_MEMORY_LIMIT` / `WEB_CPU_LIMIT`      | Nginx resource limits                                | `128M` / `1.0`                    |
| `LOG_MAX_SIZE` / `LOG_MAX_FILES`          | Container log rotation                               | `10m` / `5`                       |
| `LOG_LEVEL`                               | Service log level                                    | `info`                            |
| `CONTACT_MAIL_FROM` / `CONTACT_NOTIFY_TO` | Sender and notification recipient                    | Addresses derived from `APP_HOST` |
| `VPS_PORT`                                | SSH port                                             | `22`                              |

Obtain `TRUSTED_PROXIES` from the existing Traefik configuration. Use a stable, reviewed proxy address; do not trust the whole shared Docker network, all private ranges or an unrestricted CIDR. A changed Traefik address requires updating this setting and recreating the origin. Ansible validates the address and requires the external `traefik_proxy` network to exist; it does not create the shared proxy or its network.

The portfolio has three distinct service images, so it retains `REGISTRY` and a common commit `TAG` instead of a single `IMAGE_REF`. `IDENTITY_SIGNING_KID`, `SITE_BUILD_REPOSITORY` and `SITE_ROOT` are supplied by the existing Ansible inventory. Image tags identify the deployed commit; base images remain pinned by digest.

## First installation

1. **Shared edge and DNS**: the existing Traefik must expose `web` / `websecure`, have the `letsencrypt` resolver and join external `traefik_proxy`. Point `APP_HOST` and `www.APP_HOST` to that edge. Record its reviewed address in `TRUSTED_PROXIES`.
2. **Inventory**: address in `ansible/inventory/production.yml` or `VPS_HOST`, optional `VPS_USER` and `VPS_PORT`, public SSH keys in `deploy_authorized_keys` (`ansible/inventory/group_vars/all/vars.yml`; provisioning refuses an empty list, and the list is exclusive: a removed key is revoked).
3. **Secrets**: copy `vault.example.yml` to `vault.yml`, fill it in, then encrypt it. The roles check that nothing is left at `CHANGE_ME` and that the Postgres passwords are alphanumeric (they go into URLs).

   ```bash
   openssl rand -hex 24                                   # each Postgres password
   openssl genpkey -algorithm ed25519 -out k1.pem         # token signing key (paste it into the vault)
   ansible-vault encrypt ansible/inventory/group_vars/all/vault.yml
   ```

4. **Provisioning** (initial account provided by OVH, here `ubuntu`):

   ```bash
   cd ansible && ansible-galaxy collection install -r requirements.yml -p .collections
   ansible-playbook playbooks/provision.yml -e ansible_user=ubuntu --ask-vault-pass
   ```

   Packages upgraded, unattended security updates with automatic reboot at 04:30 when needed, firewall (SSH rate-limited, 80, 443 for the shared edge), fail2ban (SSH, bans through UFW), key-only SSH without root or forwarding, kernel network hardening, Docker (daemon defaults: rotated logs, `no-new-privileges`, `live-restore`), files, secrets and backup timers in place. The portfolio installs no Certbot or TLS role.

5. **First deployment** (images already published by the `deploy` workflow):

   ```bash
   ansible-playbook playbooks/deploy.yml -e tag=<sha> --ask-vault-pass
   ```

   On a blank server the backup step reports "Database never migrated" and continues.

6. **Content and admin account**, once, on the VPS (the password is read without echo, never in the shell history):

   ```bash
   cd /srv/portfolio
   docker compose -f compose.prod.yml --profile ops run --rm content-seed
   read -rs IDENTITY_BOOTSTRAP_PASSWORD && export IDENTITY_BOOTSTRAP_PASSWORD
   docker compose -f compose.prod.yml --profile ops run --rm -e IDENTITY_BOOTSTRAP_PASSWORD \
     identity-bootstrap contact@valentin-fortin.pro
   unset IDENTITY_BOOTSTRAP_PASSWORD
   ```

   The command prints the `otpauth://` URI to scan in an authenticator app.

7. **Site**: run the `Site build` workflow (or publish a change from the admin).

## GitHub

Secrets of the `production` environment: `VPS_HOST`, `VPS_SSH_KEY` (private key of the deployment account), `VPS_SSH_KNOWN_HOSTS` (verified SSH server fingerprint), `ANSIBLE_VAULT_PASSWORD`. Optional `VPS_USER` overrides the SSH account; it defaults to `deploy`. Rename the former `VPS_KNOWN_HOSTS` secret to `VPS_SSH_KNOWN_HOSTS`. For a nonstandard SSH port, obtain the fingerprint for that port.

- `CI`: format, lint, typecheck, tests, build, architecture test; operations checks (`docker/scripts/check-ops.sh`); e2e (Playwright, four browsers) on `main`.
- `Deploy services` (after CI on `main`): GHCR images, then `playbooks/deploy.yml -e tag=<sha>` → `scripts/deploy.sh`.
- `Site build` (after CI, or triggered by content-service on each publication): snapshot of the published content, prerendered build, then `playbooks/publish-site.yml -e release=<name>` (release copy, pre-compression and atomic switch). A new rebuild replaces a pending one.

## Migrating an existing standalone installation

Keep `DOCKER_PROJECT_NAME=portfolio` and the existing data-volume identity when adapting an already populated installation. Changing the Compose project name selects different project-scoped volumes; never use `docker compose down -v` for this migration.

Arrange a maintenance window and a current backup. The old portfolio Nginx must release host ports 80/443 before the shared Traefik edge takes them. Recreate the portfolio origin with the new Compose configuration, verify routing and restored client addresses through Traefik, then verify API health and static release serving. Database roles, secret files and static release paths remain compatible. Review any old portfolio-specific Certbot renewal hook manually; shared host certificate tooling may serve other applications and must not be disabled indiscriminately.

## Deployment (`scripts/deploy.sh`)

One deployment at a time (`flock`). Order: images pulled → Postgres up and healthy → backup (skipped only on a never-migrated database) → roles and passwords synced → migrations with the migration roles → roles synced again (grants) → services recreated, `docker compose up --wait` until every container is healthy → Nginx template rendered, configuration tested and reloaded → `TAG` saved in `.env` → images unused for 10 days pruned. Ansible does not reload the previous container while copying the new configuration. A failure stops the script and leaves the previous `TAG` in `.env`.

Downtime: each service is recreated in place (one replica), so its API answers `503` (problem+json) for a few seconds; the static site is not affected. Migrations run while the previous version still serves: they must stay backward compatible (expand now, contract in a later release).

## Routine operations

- **Service rollback**: rerun `playbooks/deploy.yml -e tag=<previous sha>` (the script prints the previous tag), or on the VPS `TAG=<sha> bash scripts/deploy.sh`. A migration is not reverted: in case of an incompatible migration, restore the backup taken just before.
- **Site rollback**: `bash /srv/portfolio/scripts/publish-site.sh "$(basename "$(readlink /srv/site/previous)")"`, or any of the last 5 releases in `/srv/site/releases`.
- **Backups**: `bash scripts/backup.sh` (also run by the timer: `systemctl list-timers portfolio-*`, `journalctl -u portfolio-backup`). Each dump is checked with `pg_restore --list` before it counts; old dumps are removed only after a successful backup. Optional encryption: set `portfolio_backup_age_recipient` (an `age1…` public key) — the dumps are then stored as `.dump.age` and only the holder of the private key can restore them. Off-site copy: not set up yet (see open items).
- **Restore test**: `bash scripts/restore-check.sh [file]` restores the latest backup into a throwaway Postgres container without network and checks every schema's migration history; weekly by `portfolio-restore-check.timer` (`journalctl -u portfolio-restore-check`). Encrypted backups need `BACKUP_AGE_IDENTITY=<key file>`, so run it where the key is.
- **Database restore**:

  ```bash
  cd /srv/portfolio
  docker compose -f compose.prod.yml stop identity-service content-service contact-service
  docker compose -f compose.prod.yml exec -T -u postgres postgres \
    pg_restore --dbname portfolio --clean --if-exists --exit-on-error < /srv/backups/portfolio-<date>.dump
  docker compose -f compose.prod.yml exec -T -u postgres postgres sh /docker-entrypoint-initdb.d/01-roles.sh
  docker compose -f compose.prod.yml start identity-service content-service contact-service
  ```

- **Nginx configuration**: `bash scripts/reload-nginx.sh` renders bind-mounted templates with the container's restricted environment filter, tests the resulting configuration and reloads it. Environment changes require recreating the container first so it receives the new values.
- **Maintenance**: `touch /srv/site/maintenance` (Nginx answers 503 with the prerendered page), `rm` to reopen.
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

No Molecule scenario: the roles manage sshd, UFW, fail2ban, systemd timers and the Docker daemon, which a container scenario cannot exercise faithfully; a disposable VM (same Ubuntu release as the VPS) is the right target if role tests become worth it. The full stack is exercised locally with `docker/compose.dev.yml`, which uses the same hardening, roles script and Nginx configuration as production.

## Locally

- `docker/compose.dev.yml`: a standalone local stack (Postgres with the production roles, Mailpit, services built from source, Nginx over HTTP on `http://localhost:8080`), with production hardening. It needs no Traefik or external network. This file is for local source builds, unlike the remote-development overlays used in some sibling repositories. Usage is at the top of the file. Development secrets: `bash docker/scripts/dev-secrets.sh` copies `docker/dev/secrets.example/*` to `docker/dev/secrets/` (git-ignored) without overwriting.
- `npx nx run-many -t serve -p content-service contact-service identity-service` then `npx nx serve web`: development without Docker (PGlite, `apps/*-service/.env`).

Authenticated acceptance uses `npx nx run web-e2e:e2e-stack`. The runner fixes its generated Compose
project and ignores ambient Compose env files/profiles. It refuses existing resources or image tags,
then removes only its own containers, volumes and three image tags after the run. BuildKit cache and
shared image layers remain reusable. See [Docker optimization verification](docker-optimization-2026-11-03.md).

## Open items

- **Off-site backups**: dumps stay on the VPS. Ship them to another provider (e.g. restic or rclone to object storage, with the age-encrypted dumps).
- **Client-address validation**: verify IPv4 and IPv6 visitors at the shared Traefik edge. Nginx can restore only the address Traefik actually receives; a Docker userland proxy or another unconfigured upstream proxy can still obscure it. Keep the shared edge's forwarded-header trust policy explicit.
- **HSTS preload**: the header has no `preload`; add it only together with a submission to hstspreload.org.
