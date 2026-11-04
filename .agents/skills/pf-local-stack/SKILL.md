---
name: pf-local-stack
description: 'Inspect or change the local Docker Compose stack, Nginx routing, shared Traefik environment contract or Ansible configuration for this repository. Use for local integration and configuration review; this skill does not authorize deployment, secret access or changes to the shared edge.'
---

# Local stack and edge contract

Read [deployment and operations](../../../docs/operations/deployment.md) and the requested configuration
before acting. Resolve whether the work concerns the existing developer stack, disposable acceptance,
or a production configuration review. Those targets have different lifecycle ownership.

## Use the actual topology

- `docker/compose.dev.yml` is the local source-built stack: Postgres, Mailpit, three services and Nginx,
  normally exposed on 8080/8025. It needs no shared Traefik or external edge network.
- Production's separately managed Traefik terminates TLS and reaches only the private Nginx origin on
  `traefik_proxy`. Services and Postgres stay off the shared edge; the database network is internal.
  Keep the project/router names, `APP_HOST`, internal `APP_PORT`, reviewed `TRUSTED_PROXIES` and image
  tag contract documented together. Do not broaden trusted proxies to an entire shared/private network.
- Preserve Nginx's localized static routes, per-locale CSR admin (`/admin/`, `/en/admin/`), true 404s, CSP, cache and
  robots headers, forwarded HTTPS/client address and request IDs. A new location can alter inherited
  headers. The preview server models application route/header behavior, not the entire Nginx edge.
- Service image and network changes must preserve the existing non-root, read-only filesystem,
  resource-limit, healthcheck and separate application/migration-role design. Follow existing pinned
  versions/digests instead of replacing the stack with an unrelated image or proxy pattern.

## Validate without changing the wrong target

Use public example configuration and inspect static-check scripts before choosing their matching
scope. Never read service `.env`, local data, private development secrets, vault or key files to make a
configuration command succeed. Documentation that describes a human deployment does not authorize
running playbooks, production Compose, deployment scripts, image pushes or production workflows.

For authenticated browser acceptance, use `npx nx run web-e2e:e2e-stack`. Its maintained runner owns a
fresh `portfolio-e2e-*` project, example mounts, ephemeral account and cleanup. Preserve `portfolio-dev`
and other users' servers/volumes; do not use a shared project name or an unqualified volume teardown.
See the [acceptance contract](../../../apps/web-e2e/README.md) and
[overlay](../../../docker/compose.e2e.yml). Local startup or account/secret creation still requires the
corresponding user authorization; this skill only supplies the workflow.

Report which configuration and environment were checked, whether the check was static or exercised
real services, and which resources the task created. Use
[official Compose networking documentation](https://docs.docker.com/compose/how-tos/networking/) for
network semantics, and the project's operations document for its Traefik/Nginx/Ansible decisions.
