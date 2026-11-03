# Portfolio

French/English Angular portfolio with a prerendered public site, a French administration area and three NestJS services: content, contact and identity. The Nx workspace keeps each context's domain, application and adapters separate.

## Development

Use Node.js 24 or newer and the npm version declared in `package.json`:

```bash
npm ci
npx nx run-many -t serve -p content-service contact-service identity-service
npx nx serve web
```

The web development server listens on port 4200; content, contact and identity use 3101, 3102 and 3103. Service configuration examples live in `apps/*-service/.env.example`. PGlite supports development without Docker.

For a standalone Docker stack, follow [local operations](docs/operations/deployment.md#locally): `docker/compose.dev.yml` builds the services and serves the site on `http://localhost:8080`, with Postgres and Mailpit. It needs no external Traefik network.

## Production

The existing shared Traefik routes HTTPS to a private Nginx origin over `traefik_proxy`. Nginx serves static releases and dispatches API requests to private services; Postgres uses a separate internal network. The portfolio publishes no production host ports and manages no certificates.

[Deployment and operations](docs/operations/deployment.md) documents the shared environment conventions, required `TRUSTED_PROXIES` setting, Ansible provisioning, Vault-rendered secrets, GitHub workflows, backups and migration from a standalone installation. Public runtime settings are listed in [docker/.env.example](docker/.env.example).

## Verification

```bash
npx nx affected -t lint typecheck test build
npx nx run architecture:test
bash docker/scripts/check-ops.sh
```

The operations checks validate configuration in disposable containers; they do not deploy the application.

See [architecture boundaries](docs/architecture/boundaries.md), [architecture decisions](docs/architecture/decisions.md) and [workspace generators](docs/workspace/generators.md) before adding code.

## AI tooling

The workspace supports [Claude Code](.claude/README.md) and [Codex](.codex/README.md). Both use
[AGENTS.md](AGENTS.md), the shared Nx skills in `.agents/` and their own agents, rules and hooks.
The root `.mcp.json` provides portable MCP configuration.

Use `npm run ai:configure` to update the Nx integration for these two clients. The script selects
Claude and Codex explicitly so an update does not recreate configurations for other assistants.
