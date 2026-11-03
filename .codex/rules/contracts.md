# Shared contracts

- `libs/contracts/<ctx>` holds the HTTP contracts of a context as `zod/mini` schemas and their inferred
  types (D5, D10); the layer reads only other contracts and bans frameworks and I/O.
- The server validates with the schemas (`ZodValidationPipe`); the browser imports **types only**; the
  content snapshot schema is applied at prerender, so a breaking change breaks the site build.
- Field names are the public API: a rename is a breaking change for the web client and the snapshot.
  Domain-side names may differ; the problem mapper translates them (`CONTRACT_FIELDS`).
- Bounds mirror the domain constants and the browser copies (`CONTACT_FORM_LIMITS`): change them together.
- Every schema has a fixture in `testing/` and a spec that parses it.

Review: the `pf-api-contract-reviewer` role.
