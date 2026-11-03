# Docker build optimization

The change reduces repeated service builds and workspace setup while retaining the existing runtime,
private networks, pinned bases, non-root service user, read-only filesystems and health checks.
The shared production Traefik remains independently managed.

## Changes

| Boundary           | Previous behavior                                              | Current behavior                                                                      |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Local Compose      | Nine build declarations across services and one-off jobs       | Three service builds; six jobs reuse their service image                              |
| Build context      | Repository root allowlist admitted all three pruned outputs    | Each context contains only its service's pruned runtime files                         |
| Runtime cache      | `SERVICE` preceded the invariant package/user setup            | The service argument affects only its final image label                               |
| Image workflow     | Three full workspace installs and individual prune runs        | One preparation job produces SHA-named contexts for the image matrix                  |
| Remote build cache | No persistent Docker layer cache                               | Buildx/GHA v2 cache, separately scoped for each service                               |
| Acceptance cleanup | Disposable containers and volumes removed; image tags remained | Existing tags refused; only the generated project's three tags removed after teardown |
| Compose validation | Temporary rewritten development file                           | Existing acceptance overlay supplies public examples directly                         |

The [Dockerfile](../../docker/service.Dockerfile) uses generic manifest/bundle/migration copies from
`dist/apps/<service>`. Its [ignore file](../../docker/service.Dockerfile.dockerignore) excludes source
maps, workspace modules and unrelated outputs. Manifest-first installation and the locked npm cache
mount remain. The [local Compose file](../../docker/compose.dev.yml) gives jobs local-only shared image
references and disables HTTP service probes for those one-off commands.

The [image workflow](../../.github/workflows/deploy.yml) retains the resolved commit, image tags,
publication conditions and latest-main checks. Its artifact includes only Docker inputs and retains
service directories. Cache export failure is non-fatal; a build or publication failure still fails the
workflow. The independent public content snapshot build is preserved.

The [acceptance runner](../../apps/web-e2e/support/stack/run-stack-e2e.mjs) owns a fresh random project and fixes
Compose project/env-file/profile settings. It checks for existing containers, volumes and exact image
tags before building. Success, partial startup, bootstrap failure and browser failure all reach
cleanup. Cleanup attempts all three owned tags without force or global pruning, retaining BuildKit
caches; cleanup errors preserve the original failure and still fail acceptance.

## Verification

- ShellCheck, Hadolint, public-fixture Compose validation, production/development `nginx -t` and CSP
  parity pass through `docker/scripts/check-ops.sh`.
- Containerized actionlint validates the image workflow. The artifact allowlist contains 29 files in
  the current three pruned outputs, preserving the service directories.
- The final runner has 12 passing lifecycle/ownership tests. The architecture target also runs the
  preview-server and runner tests and passed after the changes.
- A real disposable-stack run built the three images, migrated Postgres, seeded content, bootstrapped
  an ephemeral account and passed authenticated Chromium UI/Axe acceptance. It completed in 72 seconds
  and removed its containers, volumes and image tags. The second run, using the final environment
  isolation, passed in 51.8 seconds; all three dependency-install layers were cache hits and its three
  image tags were removed afterward. These durations include startup, fixtures, browser acceptance
  and teardown, not just Docker build time.
- The first build transferred approximately 525 kB for content, 424 kB for contact and 474 kB for
  identity. BuildKit transfer is incremental, so these are observations of the new contexts rather
  than a claimed percentage reduction against an unmeasured earlier transfer.
- `nx affected` cannot select projects because the local `main` reference is absent. Explicit service
  prune/build, architecture and stack checks validate the changed boundaries instead.

The existing six `portfolio-dev` services remain healthy. The dependency/runtime payload was preserved;
image size reduction is not the basis of these changes. GitHub cache hit rate and CI wall-clock savings
will be observable on subsequent authorized workflow runs; no remote workflow was triggered here.

Primary references: [Docker build contexts](https://docs.docker.com/build/concepts/context/),
[Docker argument cache behavior](https://docs.docker.com/reference/dockerfile/#impact-on-build-caching),
and [GHA cache scopes](https://docs.docker.com/build/cache/backends/gha/).
