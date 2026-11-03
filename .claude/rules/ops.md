---
paths:
  - 'docker/**'
  - 'ansible/**'
  - '.github/workflows/**'
  - 'apps/web/scripts/**'
  - 'apps/web-e2e/support/**'
  - '.github/scripts/**'
---

# Operations

- Production is one OVH VPS: shared Traefik edge (D33), private Nginx, Docker Compose (`docker/compose.prod.yml`), Postgres 17, static site
  releases; Ansible provisions and deploys, deployment steps stay in `docker/scripts/*.sh` (D24).
  `docs/operations/deployment.md` is the procedure: keep it current in the same change.
- Agents never run playbooks, open the vault, use `compose.prod.yml` (except `config`), run the deployment
  scripts, push images or trigger the deploy and site-build workflows; the `guard-git` hook refuses them.
- Secrets are Docker secret files rendered from Ansible Vault (`vault.example.yml` documents the keys);
  development values live only in `docker/compose.dev.yml` and `docker/dev/secrets/`. Never write a real
  secret, never `echo` one in a workflow.
- Images: pinned base, pruned lockfile (`npx nx run <service>:prune`), non-root, healthcheck. Postgres:
  `<ctx>_migrator` and `<ctx>_app` roles (D23). Nginx: strict CSP without inline scripts (D20), `/api/*`
  routing (D2), maintenance page, headers repeated in every location that adds its own. Trust only the reviewed Traefik address via `TRUSTED_PROXIES`; preserve client IP and HTTPS forwarding.
- Shell scripts use LF endings (`.gitattributes`) and `set -eu`; validate with `sh -n`,
  `docker compose -f docker/compose.dev.yml config` and `ansible-playbook <playbook> --syntax-check`.

Review: the `pf-ops-reviewer` and `pf-workflow-reviewer` agents.
