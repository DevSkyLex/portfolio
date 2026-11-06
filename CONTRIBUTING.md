# Contributing

Read the [README](README.md) for setup and the [architecture boundaries](docs/architecture/boundaries.md)
and [decisions](docs/architecture/decisions.md) before changing project ownership or public contracts.
Assistant-specific rules live in [AGENTS.md](AGENTS.md).

The repository is proprietary and all rights are reserved; see [LICENSE](LICENSE). Discuss a
contribution with the maintainer before starting substantial work. Include third-party material only
when you have the right to contribute it and preserve its attribution and license notices.

## Report an issue

Use the [issue forms](https://github.com/DevSkyLex/portfolio/issues/new/choose) for bugs, feature
requests and documentation. Search existing issues first. Include a release tag or commit SHA,
reproduction steps and sanitized evidence. Report vulnerabilities privately through
[SECURITY.md](SECURITY.md).

## Set up a checkout

Use Node.js 24 or newer and the exact npm version declared by `packageManager` in `package.json`.
Run commands from the repository root:

```bash
npm ci
npx nx show projects
```

`npm ci` installs the Git hooks through the root prepare script. Follow the README for local services
or the disposable Docker stack. Use public development examples and keep credentials out of tracked
files. Do not use production data to reproduce a bug.

## Branches and commits

Create a branch from an up-to-date `main`, using `<type>/<kebab-description>`:

```text
fix/contact-validation
feat/project-filter
docs/local-setup
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` and
`revert`. Use English Conventional Commits and the same format for the PR title:

```text
fix(contact): reject an invalid reply address
```

Keep commits focused and include the relevant tests and documentation. Do not bypass Git hooks or
rewrite shared history. Open a PR targeting `main`; direct pushes to `main` are not the contribution
workflow. Dependabot uses its own generated branch names.

## Implementation rules

- Every Nx project has one `scope:*`, `platform:*` and `layer:*` tag. Keep imports within the declared
  boundaries and public entry points; do not relax constraints to permit an import.
- Backend domain and application layers stay independent of NestJS, persistence and transport schemas.
- Frontend work follows the owning library's README and the Orbite design tokens. Reusable controls
  belong to the UI catalogue; business behavior remains in its owning feature or data-access layer.
- Code, comments, documentation, test names, routes, commits and PR text are English. UI source text
  is French with explicit `@@` ids; include English translations, including administration copy.
- Use Nx generators for new projects, creating a project only when it receives real code. Follow
  [generator guidance](docs/workspace/generators.md).
- Generate lockfiles, locale source catalogs, content snapshots and migration metadata with their
  owning tools. Do not edit generated output or vendored dependencies by hand.

## Validate a change

Run the narrowest relevant owner checks first, then the local gate:

```bash
npx nx format:check
npx nx affected -t lint typecheck test build
npx nx run architecture:test
```

Inspect the affected project list and use an explicit base/head when needed. The configured base is
`main`. Run `npx nx run-many -t lint typecheck test build` when full-workspace validation is required.
Use Nx rather than invoking a project's underlying compiler or test runner directly.

Add tests at the boundary that owns the behavior. Preserve coverage thresholds. For browser behavior,
run the relevant built-site or isolated-stack suite:

```bash
npx nx e2e web-e2e
npx nx run web-e2e:e2e-stack
```

The stack suite requires Docker and owns disposable containers and volumes. Follow
[testing guidance](docs/workspace/testing.md) and [operations guidance](docs/operations/deployment.md)
for the checks appropriate to the change. Record commands actually run and their outcomes; explicitly
identify checks not run or blocked by the environment.

## Open a pull request

Use the PR template to explain the problem, resulting behavior and validation. Link the issue and
update contracts, translations and documentation in the same change. Include desktop/mobile and
theme evidence for presentation changes. Keep private user data and credentials out of logs and
screenshots.

CI and convention checks run for PRs targeting `main`. All coverage partitions must pass the final
`tests` check. See [GitHub automation](.github/README.md) for the checks and caches.

## Releases and production

A merge does not deploy. Maintainers publish a reviewed GitHub release to build and deploy its exact
commit. Start with a draft and the [release template](.github/release_template.md); published
prereleases also deploy. Production changes and rollback follow the operations procedure and require
explicit operator authorization. Do not trigger deployment as part of an ordinary contribution.
