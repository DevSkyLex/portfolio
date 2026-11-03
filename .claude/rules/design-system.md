---
paths:
  - 'libs/frontend/ui/**'
  - 'libs/frontend/design-tokens/**'
  - 'apps/web/src/styles.css'
  - 'libs/frontend/**/*.html'
---

# Design system: `@vfortin/ui` and the Orbite tokens

- `@vfortin/ui` (`libs/frontend/ui`) is the in-house generic catalogue (D26): Spartan / shadcn names,
  behaviour on `@angular/cdk`, look from Tailwind classes over the tokens, icons from `@ng-icons/lucide`.
  Nothing comes from Spartan; never install a component kit.
- Tokens are CSS variables in `libs/frontend/design-tokens/src/theme.css`, exposed to Tailwind with
  `@theme inline`: `void` surfaces, `star` text, `line` borders, aurora accents, `--dur-*` durations.
  Dark is the default; light is `[data-theme='light']` on `<html>`. Never a raw colour in a template.
- Status colours (D37): `success` green, `warning` amber, `danger` red, `info` blue, each with `-ink` for text
  and `on-` for text on a fill; `signal` is the brand accent (focus, selection), never a status. Show a
  status with `uiAlert`, `uiBadge` (`dot`), `uiBtn variant="danger"`, the toaster and `ConfirmDialogService`,
  not hand-made markup; icons take the ink of their meaning.
- Text is left-aligned (headings, empty states, forms, dialogs); centre only a single figure or a
  mockup composition. `npx nx run architecture:test` (`design.spec.ts`) fails on a palette colour, a raw
  colour or a centred text outside the allowed files.
- `apps/web/src/styles.css` holds imports, `@source` and document-level base rules only; the guard refuses
  class or id rules there.
- Literal class strings only (Tailwind scans `libs/frontend`); prefer Tailwind v4 variants (`data-*`,
  `aria-*`, groups, container queries, `motion-safe:` / `motion-reduce:`) over custom CSS.
- Mockup class names (`ob-*`, `v2-*`) never appear in the code: translate their values, not their names.
- The page stays plain: one hierarchy (section title → content), factual copy, at most one motion accent per
  section, no eyebrow labels, numbering, slogan titles or bracket placeholders.
- `libs/frontend/ui/package.json` keeps `"sideEffects": false`; the catalogue never reads a business model.

Details: the `ui-catalogue` and `design-fidelity` skills.
