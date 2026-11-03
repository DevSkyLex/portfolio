---
paths:
  - '**/*.spec.ts'
  - '**/testing/**'
---

# Tests

- Specs live in a `testing/` folder beside the subject; the top-level `describe` names the exact symbol.
- Run through Nx: `npx nx test <project>`, narrowed with a Vitest filter after `--`
  (`npx nx test content-web-ui -- planet-math`); read the executed count, a filter can match nothing.
- Frontend libraries: Vitest through `@analogjs/vitest-angular`, zoneless `TestBed` from each
  `src/test-setup.ts`; the web app: `@angular/build:unit-test`. Backend: Vitest; domain and application
  without Nest (in-memory fakes), repositories on `pglite:memory` with the migrations, composition with
  Nest `Test` and supertest.
- Assert the boundary the unit owns; never change production code to make a test pass.
- Assert French copy (source locale); no `.only`; no `any` in mocks; exact status, code or payload where
  it is the contract.
- A new boundary rule or kind of project gets a rejected-import case in
  `tools/architecture/src/boundaries.spec.ts` (`npx nx run architecture:test`).

Details: the `web-testing` and `api-use-case-recipe` skills.
