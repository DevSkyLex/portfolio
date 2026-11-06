<!-- Use an English Conventional Commit title: type(scope): summary. -->

## What and why

<!-- Describe the problem, resulting behavior and related issue. -->

## Validation

<!-- Record commands actually run, results and any checks not run. -->

- [ ] `npx nx affected -t lint typecheck test build`
- [ ] `npx nx run architecture:test`
- [ ] Relevant browser or full-stack acceptance, when behavior changes

## Contracts and documentation

- [ ] Boundaries, public entry points and API contracts remain aligned
- [ ] French UI source has explicit `@@` ids and English translations
- [ ] Relevant architecture and operations documentation is current
- [ ] Database changes remain compatible with the previous deployed version

<!-- A merge does not deploy. Publish a reviewed GitHub release to deploy its commit. -->
