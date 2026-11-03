# Workspace tooling

Only maintained checks that apply to the whole monorepo belong here.

| Directory       | Responsibility                                                                  | Standard tools used                                                   |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `architecture/` | Project-specific boundaries, owner contracts, source layout and design policies | Nx project metadata and module boundaries, TypeScript, ESLint, Vitest |
| `eslint/`       | Explicit declaration and injection policy that standard rules do not express    | typescript-eslint scope utilities and ESLint syntax selectors         |

Application scripts live with their owner: snapshot collection in `apps/web/scripts`, browser preview
and disposable-stack acceptance in `apps/web-e2e/support`. CI presentation belongs in `.github/scripts`;
shared assistant checks belong in `.agents/scripts`.

Use existing tool APIs before adding a custom check. Keep a helper only when a recurring command uses
it and its project-specific behavior cannot be expressed by the configured tools. Temporary audits,
migrations and source-rewrite helpers are not maintained tooling and must be removed after use.

Run `npx nx run-many -t lint typecheck test -p architecture`,
`npx nx run web-e2e:test-tooling` and `npx nx run web:test-snapshot` for the corresponding owners.
