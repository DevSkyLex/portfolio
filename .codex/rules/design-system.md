# Design system: `@vfortin/ui` and the Orbite tokens

- `@vfortin/ui` (`libs/frontend/ui`) is the in-house generic catalogue (D26): Spartan / shadcn names,
  behaviour on `@angular/cdk`, look from Tailwind classes over the tokens, icons from `@ng-icons/lucide`.
  Nothing comes from Spartan; never install a component kit.
- Tokens are CSS variables in `libs/frontend/design-tokens/src/theme.css`, exposed to Tailwind with
  `@theme inline` by role (D41): `surface*` backgrounds (`surface-hover`, `surface-selected` for every
  state), `fg*` text, `border*` lines, `fill` / `on-fill` for filled controls, aurora brand colours,
  `--dur-*` durations.
  Dark is the default; light is `[data-theme='light']` on `<html>`. Never a raw colour in a template.
- Status colours (D37): `success` green, `warning` amber, `danger` red, `info` blue, each with `-ink` for text
  and `on-fill` for text on a fill; `accent` is the brand accent (focus, selection), never a status. Show a
  status with `uiAlert`, `uiBadge` (`dot`), `uiBtn variant="danger"`, the toaster and `ConfirmDialogService`,
  not hand-made markup; icons take the ink of their meaning.
- Text is left-aligned (headings, forms, dialogs); centre only a single figure, a mockup composition
  or an empty state: `uiEmpty` centres its icon tile, title, description and actions (the owner's
  exception, D36 empty state revision), so consumers never align it themselves.
  `npx nx run architecture:test` (`design.spec.ts`) fails on a palette colour, a raw colour or a centred
  text outside the allowed files.
- `apps/web/src/styles.css` (public, initial) and `apps/web/src/admin.css` (non-injected, loaded with the
  admin area, D31) hold imports, `@source` and document-level rules only; the guard refuses class or id
  rules in styles.css.
- Literal class strings only. `styles.css` scans only what the public pages reach (`source(none)`, one
  `@source` per public presentation library or catalogue folder); `admin.css` scans all of
  `libs/frontend`. A catalogue folder newly used by a public page, or a new public library, gets its
  `@source` line in styles.css; `npx nx run architecture:test` (`stylesheets.spec.ts`) fails otherwise,
  and on a listed folder nothing public reaches. Admin-only code needs no change.
- Prefer Tailwind v4 variants (`data-*`, `aria-*`, groups, container queries, `motion-safe:` /
  `motion-reduce:`) over custom CSS.
- Mockup class names (`ob-*`, `v2-*`) never appear in the code: translate their values, not their names.
- The page stays plain: one hierarchy (section title → content), factual copy, at most one motion accent per
  section, no eyebrow labels, numbering, slogan titles or bracket placeholders.
- Radii follow the size scale of D43 (`rounded-2xs` 2 px to `rounded-xl` 12 px; Tailwind's defaults are
  cleared, no `rounded-[Npx]` where a step fits): `xs` kbd, badges, checkboxes, chips; `sm` h-7/h-8
  controls, options, sidebar entries, tab triggers; `md` fields and buttons h-9 to h-11; `lg` menus, lists,
  popovers, toolbars; `xl` cards, dialogs, toasts. An element hugging a rounded container with a gap of
  8 px or less takes the container radius minus the gap (border included; menus pad `p-[3px]`, so
  `lg` = `sm` + 4); with 16 px or more of padding each keeps its own step. Menus use one compact density
  (32 px options, 13 px text).
- Admin pages keep their 48 px bar for the navigation context only; the title, meta, actions and tabs go in
  `ui-page-header`. Overlay templates (`ng-template[uiPopoverContent]`, sheets, dialogs) bind `[class]`.
- `libs/frontend/ui/package.json` keeps `"sideEffects": false`; the catalogue never reads a business model.

Details: [UI catalogue](../references/ui-catalogue.md), [design fidelity](../references/design-fidelity.md).
