---
paths:
  - '**/*.ts'
  - '**/*.mjs'
  - '**/*.html'
---

# Comments

- Comments and docblocks are **English**, concise and source-grounded. Anchors:
  `libs/backend/contact/application/src/lib/ports/contact/contact.ports.ts`,
  `libs/frontend/contact/data-access/src/lib/state/contact-form/contact-form.store.ts`.
- `/** … */` on exported declarations and on members whose contract is not obvious (ordering, locking,
  units, lifecycle, failure modes, why a value is what it is); `@param` / `@returns` only when they add
  something the types do not say.
- Reference the decision behind a non-obvious choice (`D16`, `D22`, `docs/architecture/decisions.md`) or
  the mockup element the code reproduces; never restate the code or narrate its history.
- Short `//` notes for non-obvious steps inside a function. No commented-out code, no French comment, no
  `@access`, no decorative separators, no TODO without its reason.
- Template comments only when the markup alone cannot explain a structural constraint.

Preserve lint, formatter, coverage, TypeScript and license directives. For bulk passes, capture the exact pre-edit contents independently of Git; compare TypeScript and JavaScript syntax and protected directives with `node .agents/scripts/comment-diff.mjs <before> <after>`. The checker does not support HTML; report its verification limit. Bulk passes: the `pf-comment-maintainer` agent.
