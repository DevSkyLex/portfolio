# Portfolio

An interactive, bilingual portfolio with a private administration area. The public site presents projects, skills and experience, and provides a contact form. The administration interface manages content and messages; it is available in French only.

The application is an Nx monorepo: an Angular frontend and three NestJS services for content, contact and identity. Public pages are prerendered from a versioned content snapshot, while the administration interface is rendered in the browser.

## Features

- French and English public pages, theme preferences, responsive navigation and accessible interactions.
- Project and profile content managed through an administration interface and published to the public site.
- Contact messages with an administration inbox and email notifications.
- Administrator sessions with password and time-based one-time code authentication; no public account registration.
- Local development with a full Docker stack or independently running services.

## Technology

| Area                     | Main technologies                                                 |
| ------------------------ | ----------------------------------------------------------------- |
| Workspace                | Nx, TypeScript, npm                                               |
| Frontend                 | Angular, NgRx SignalStore, Angular Signal Forms, Tailwind CSS     |
| Services                 | NestJS, Drizzle ORM, PostgreSQL; PGlite for development and tests |
| Contracts and validation | Shared Zod schemas                                                |
| Tests                    | Vitest, Playwright, axe                                           |
| Operations               | Docker Compose, Nginx, shared Traefik, Ansible, GitHub Actions    |

## Repository structure

```text
apps/
  web/                     Angular application and localized content snapshots
  web-e2e/                 Browser and full-stack acceptance tests
  content-service/         Content service entry point
  contact-service/         Contact service entry point
  identity-service/        Identity service entry point
libs/
  frontend/                UI, feature, data-access and shell libraries
  backend/                 Context and platform libraries
  contracts/               Shared content, contact and identity contracts
docker/                    Compose configurations, Nginx and operations scripts
ansible/                   Provisioning and deployment configuration
tools/                     Workspace architecture and ESLint tooling
docs/                      Architecture, workspace and operations documentation
```

Each backend context separates domain rules, application use cases, incoming and outgoing adapters, and composition. Nx tags and public entry points enforce dependencies between projects. See [architecture boundaries](docs/architecture/boundaries.md) and [architecture decisions](docs/architecture/decisions.md) for the rules and trade-offs.

## Requirements

- Node.js 24 or newer and npm 11.16.0, as declared in `package.json`.
- Docker Engine and Docker Compose for the full local stack and stack acceptance tests.
- Bash for the local setup scripts; on Windows, use a compatible shell such as Git Bash.

Install dependencies from the repository root:

```bash
npm ci
```

## Run the full stack locally

The development stack builds the services from source and runs PostgreSQL, Mailpit and Nginx. It does not require the shared Traefik network. The preparation script copies public development placeholders into ignored local secret files without overwriting existing values.

```bash
bash docker/scripts/dev-secrets.sh
npx nx run-many -t prune -p identity-service content-service contact-service
npx nx build web
docker compose -f docker/compose.dev.yml up --build -d --wait
docker compose -f docker/compose.dev.yml --profile seed run --rm content-seed
```

The site is at <http://localhost:8080>, administration at <http://localhost:8080/admin/>, and Mailpit at <http://localhost:8025>. Seed content is intended for local development.

To create a local administrator, choose a password when prompted and enroll the one-time code using the URI printed by the bootstrap command:

```bash
read -rs IDENTITY_BOOTSTRAP_PASSWORD && export IDENTITY_BOOTSTRAP_PASSWORD
docker compose -f docker/compose.dev.yml --profile ops run --rm \
  -e IDENTITY_BOOTSTRAP_PASSWORD identity-bootstrap admin@localhost.test
unset IDENTITY_BOOTSTRAP_PASSWORD
```

See [local operations](docs/operations/deployment.md#locally) and the comments at the start of [`docker/compose.dev.yml`](docker/compose.dev.yml) for details. Keep development credentials separate from production credentials.

## Run services without Docker

Copy each service's `.env.example` to its local `.env` and adjust the settings for your environment. PGlite can provide local databases without PostgreSQL. Start the services and web development server in separate terminals:

```bash
npx nx run-many -t serve -p content-service contact-service identity-service
npx nx serve web
```

The web development server uses port 4200; content, contact and identity use ports 3101, 3102 and 3103 respectively. Restart `npx nx serve web` after a change of the build options in `apps/web/project.json` (styles included: the admin's `admin.css` entry is only served by a server started after it was added, see [generators](docs/workspace/generators.md)). See the individual service examples and [operations documentation](docs/operations/deployment.md) for configuration.

## Verify changes

Run the workspace checks from the root. `affected` compares changes with the configured base branch; use `run-many` when a complete workspace run is needed.

```bash
npx nx format:check
npx nx affected -t lint typecheck test build
npx nx run architecture:test
```

Additional checks:

```bash
npx nx run-many -t test --coverage
npx nx e2e web-e2e
npx nx run web-e2e:e2e-stack
bash docker/scripts/check-ops.sh
```

The public browser suite uses a built-site preview. The stack suite requires Docker Compose and Chromium, creates its own disposable stack, and uses ports 18080 and 18025; see [browser acceptance](apps/web-e2e/README.md). Operations checks validate the configuration in disposable containers and do not deploy the application. Coverage thresholds and test conventions are documented in [testing](docs/workspace/testing.md).

## Deployment

Production is designed for an existing shared Traefik edge on a VPS. Traefik terminates TLS and forwards traffic over `traefik_proxy` to a private Nginx origin. Nginx serves static releases and routes API requests to the services; PostgreSQL stays on a separate internal network. The portfolio does not publish production host ports or manage Traefik's certificates.

GitHub Actions runs CI, publishes service images to GHCR and invokes the Ansible deployment and site publication workflows. Successful CI on `main` can trigger production workflows. The `production` GitHub environment, reviewed trusted proxy address, DNS, SSH access and Vault-managed credentials must be configured for the target server before deployment. Never commit credentials or private keys.

Follow [deployment and operations](docs/operations/deployment.md) for the complete environment contract, first installation, backups, restore checks, rotation and rollback procedures. The public configuration template is [`docker/.env.example`](docker/.env.example).

## Contributing and project conventions

Use Nx targets for workspace tasks and keep cross-project dependencies within the documented boundaries. The public interface uses French source messages and English translations; administration is French only. The source translation catalog is generated, and the English catalog is maintained separately.

See [workspace generators](docs/workspace/generators.md), [testing](docs/workspace/testing.md) and the relevant library README before changing an area. Commits follow Conventional Commits, and `npm ci` configures the repository Git hooks.

## AI tooling

The workspace supports [Claude Code](.claude/README.md) and [Codex](.codex/README.md). Both use [AGENTS.md](AGENTS.md), shared Nx skills in `.agents/`, and their respective rules, agents and hooks. The root `.mcp.json` provides portable MCP configuration.

Run `npm run ai:configure` to update the Nx integration for Claude and Codex.
