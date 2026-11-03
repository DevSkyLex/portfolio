# Library entry points

A library entry point is a **public surface**, not a convenience re-export.

- Explicit named re-exports: `export { X } from './lib/x'`, `export type { Y } from './lib/y'`. Widening
  it is a deliberate act; export what other projects import, nothing "in case". The guard hook refuses
  `export *` in every entry point except the catalogue barrel `libs/frontend/ui/src/index.ts`, which
  re-exports each public file of `@vfortin/ui` with one `export * from` line and never the internal files
  (`menu-panel`, `combobox-base`, `*.token.ts`, `dialog-container`).
- Other projects import a library only through `@vfortin/<name>` or a declared secondary entry point with
  its `tsconfig.base.json` path (`@vfortin/content-web-data-access/server`,
  `@vfortin/identity-web-data-access/http`, `@vfortin/contact-web-data-access/links`,
  `@vfortin/content-web-data-access/admin`, `@vfortin/web-shell/server`). Deep imports into another library are refused by
  `@nx/enforce-module-boundaries` (`banTransitiveDependencies`, `tools/architecture`).
- A secondary entry point exists to keep weight out of the public bundle (Zod, NgRx, stores, D10, D18):
  never re-export its heavy neighbours from it.
- Inside a project, use its private `@internal/<project-name>/*` alias; never import another project's
  private alias or the library's own public `@vfortin/…` path (D34).

Placement details: [naming](../references/naming.md).
