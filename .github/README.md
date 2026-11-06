# GitHub automation

The layout follows the Dentalstock web repositories, adapted to this Nx monorepo and its release
policy. No workflow runs on a push to `main`.

| File                                        | Responsibility                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `workflows/ci.yml`                          | Qualify PRs targeting `main`: quality, operations, AI tooling, three coverage partitions and browser acceptance |
| `workflows/conventions.yml`                 | Check branch names, the PR title and commits using the repository's commitlint configuration                    |
| `workflows/deploy.yml`                      | Build four images and deploy the exact commit of a published GitHub release                                     |
| `actions/prepare-node-workspace/action.yml` | Set up Node, pin npm from `packageManager` and restore or install locked dependencies                           |
| `actions/prepare-playwright/action.yml`     | Cache browser binaries and install the matching system packages                                                 |
| `dependabot.yml`                            | Monthly grouped npm and Actions updates targeting `main`                                                        |
| `CODEOWNERS`                                | Assign repository ownership to `@DevSkyLex`                                                                     |
| `pull_request_template.md`                  | Record the problem, validation and contract changes                                                             |
| `scripts/coverage-summary.mjs`              | Present each coverage partition's summary                                                                       |
| `scripts/validate-production-secrets.mjs`   | Validate deployment inputs without printing their values                                                        |
| `release.yml`                               | Categorize GitHub-generated release notes                                                                       |
| `release_template.md`                       | Provide a release description to copy into a draft                                                              |

Issue forms cover bugs, features and documentation under `ISSUE_TEMPLATE/`. Contributor setup and
validation are documented in [CONTRIBUTING.md](../CONTRIBUTING.md); vulnerabilities follow
[SECURITY.md](../SECURITY.md).

## Dependency preparation

All workspace jobs use the local Node action. It pins the exact npm version declared in
`package.json`. CI caches `node_modules` using the operating-system image, architecture, resolved Node
version, npm version, manifests and lifecycle-script policy. There is no fallback cache key. Tooling
jobs that disable lifecycle scripts use a distinct cache. A cache miss uses `npm ci`; a hit reuses the
locked installation. CI does not need local Git hooks; the root prepare hook runs only on a fresh
normal installation.

Release builds explicitly disable dependency caching, install from the lockfile and do not consume
PR dependency caches. Only the image-publishing job can write GHCR packages; the deployment job has
read access for image pulls. Existing Buildx layer caches remain scoped by image.

Browser binaries are keyed by the lockfile, requested browsers and runner image. A cache hit still
installs system packages. The public browser job selects affected projects before browser preparation.
Full-stack acceptance remains unconditional, including operations-only changes.

## Repository conventions

Branches use `<type>/<kebab-description>` with a Conventional Commits type. Dependabot-authored PRs
may use its generated `dependabot/*` branch names; their titles and commits still pass commitlint.
PR edits rerun the conventions check. All untrusted PR metadata is passed through environment
variables rather than interpolated into shell programs.

The `tests` check aggregates all coverage partitions and must succeed. Configure required checks and
owner-review requirements in GitHub repository settings; CODEOWNERS alone does not enforce them.
Dependency updates are proposals, including pinned tool versions; framework major migrations remain
deliberate. No workflow automatically merges a PR.

## Releases

Publishing a release, including a prerelease, runs deployment. A merge or a tag push alone does not.
Create a draft first, copy `release_template.md` into its description and use **Generate release notes**
to append the merged PR list. GitHub reads `release.yml` for the categories; it does not automatically
load the Markdown body template. PRs without a category label appear under Other changes, while
`skip-changelog` excludes a PR from the generated list. Custom category labels must be created in
repository settings before they can be applied to PRs. Creating or editing a draft does not deploy.
The release commit must have been reviewed; deployment does not dispatch CI or prove a green PR run.
The production environment must allow release tags. See
[deployment](../docs/operations/deployment.md#github) for configuration and rollback and
[testing](../docs/workspace/testing.md#ci-execution-budget) for execution budgets.
