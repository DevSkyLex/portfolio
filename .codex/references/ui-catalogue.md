# The `@vfortin/ui` catalogue

Claude Code keeps an equivalent skill; change one, change both. Normative list:
`libs/frontend/ui/README.md`. Decision: D26.

## Consume

1. **An entry exists** → import it from `@vfortin/ui` and apply it to the native element when it is a
   directive: `<button uiBtn variant="secondary" size="sm">`, `<div uiCard>`, `<input uiInput>`; use the
   `ui-*` component when the entry owns a template (`ui-field`, `ui-select`, `ui-toaster`). Pass extra
   classes through the `class` input: `cn` merges them with the variants.
2. **A composition of entries fits** → compose in the consuming library; do not wrap an entry to rename it.
3. **Missing entry, variant or token** → pf-web-ui-catalogue-builder adds it to the catalogue; no local
   generic widget in a context library.

Overlays (`dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu`) use a trigger directive plus an
`ng-template` content directive, or their service (`DialogService`, `SheetService`, `ToastService`).

## Extend (catalogue owners)

- Directive on the native element whenever possible; component only with a template. Names follow the
  Spartan / shadcn list; behaviour from `@angular/cdk`.
- Variants: `cva` with `variant` / `size` and defaults, merged with the `class` input through `cn`
  (`libs/frontend/ui/src/lib/class-names/class-names.utils.ts`). Template from
  `libs/frontend/ui/src/lib/button/button.directive.ts`.
- `data-slot="<name>"` on every host; state through `data-*` / `aria-*` attributes styled with Tailwind
  variants.
- Value controls implement `FormValueControl<T>` / `FormCheckboxControl` so `[formField]` binds them.
- Default accessible texts: French `$localize` with `@@ui.<component>.<key>`, overridable by an input.
- Spec in the entry's `testing/`; public files re-exported from `libs/frontend/ui/src/index.ts`, one
  `export * from` line per public file; internal files stay out; README catalogue row added;
  `libs/frontend/ui/package.json` keeps `"sideEffects": false`.

## Tokens and themes

`libs/frontend/design-tokens/src/theme.css` defines the variables (`--void`, `--void-raised`, `--void-sunk`,
`--star`, `--star-muted`, `--star-faint`, `--line`, `--line-strong`, `--line-field`, `--line-hover`,
`--aurora-pink|violet|blue|cyan`, `--dur-press|pop|roll|wipe|reveal|pulse` …) and exposes them with
`@theme inline`. Use the Tailwind names (`bg-void-raised`, `text-star-muted`, `border-line`,
`duration-(--dur-pop)`). Dark is the default; light is `[data-theme='light']` on `<html>`, set by the
shell theme service (`libs/frontend/shell/src/lib/theme/theme.service.ts`). Fonts: Unbounded (display),
Host Grotesk (body), Martian Mono (details), self-hosted (D21).

## Icons

`NgIcon` from `@ng-icons/core`; `@ng-icons/lucide` for interface pictograms, `@ng-icons/simple-icons` for
technology logos (strip the `<title>` when a label sits beside it), `@ng-icons/bootstrap-icons` for brands
missing elsewhere (LinkedIn). Every pack stays on the `@ng-icons/core` version. Never paste SVG paths.

## Styling rules

Literal class strings (Tailwind scans `libs/frontend` from `apps/web/src/styles.css`); no `styleUrl`;
custom CSS only inline, small and justified; no mockup class names (`ob-*`, `v2-*`); `motion-reduce:` on
every animation.
