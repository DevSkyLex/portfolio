---
name: ui-catalogue
description: How to consume and extend @vfortin/ui, the in-house Orbite catalogue on @angular/cdk and Tailwind — entry points, variants with cva and cn, data-slot, Signal Forms controls, tokens of @vfortin/design-tokens, themes, icons from ng-icons, the barrel and tree-shaking. Use before writing markup or touching libs/frontend/ui or libs/frontend/design-tokens.
---

# The `@vfortin/ui` catalogue

Codex counterpart: `.codex/references/ui-catalogue.md`; change one, change both. Normative list:
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
  Inside a `ui-field`, a control reads the field's error through `FIELD_HOST` and sets `aria-invalid`
  (`reflectFieldInvalid()` for directives on native controls): consumers bind `[error]` on the field only.
- Default accessible texts: French `$localize` with `@@ui.<component>.<key>`, overridable by an input.
- Spec in the entry's `testing/`; public files re-exported from `libs/frontend/ui/src/index.ts`, one
  `export * from` line per public file; internal files stay out; README catalogue row added;
  `libs/frontend/ui/package.json` keeps `"sideEffects": false`.

## Tokens and themes

`libs/frontend/design-tokens/src/theme.css` defines the colour roles (D41): surfaces (`--surface`,
`--surface-raised`, `--surface-sunk`, `--surface-glass`, `--surface-float` (floating bars and overlays), `--surface-field` (text fields), and `--surface-hover` / `--surface-selected` for every
hover, pressed and current state), text (`--fg`, `--fg-muted`, `--fg-faint`), borders (`--border`,
`--border-strong`, `--border-field`, `--border-hover`), filled controls (`--fill`, `--fill-hover`, `--fill-disabled`, `--on-fill`),
the brand (`--aurora-pink|violet|blue|cyan`, `--accent`), the status families and `--dur-press|pop|roll|wipe|reveal|pulse`,
and exposes them with `@theme inline`. Use the Tailwind names (`bg-surface-raised`, `text-fg-muted`,
`border-border`, `hover:bg-surface-hover`, `bg-fill text-on-fill`, `duration-(--dur-pop)`); a faint ink
background such as `bg-fg/5` is refused by `design.spec.ts`. Dark is the default; light is `[data-theme='light']` on `<html>`, set by the
shell theme service (`libs/frontend/shell/src/lib/theme/theme.service.ts`). Fonts: Geist (display and body),
Geist Mono (details), self-hosted (D21).

Radii (D43): `rounded-2xs|xs|sm|md|lg|xl` = 2, 4, 6, 8, 10, 12 px by element size, the only radii
(`--radius-*: initial`). `xs` kbd, badges, checkboxes, chips, inline code; `sm` h-7/h-8 controls (button
`size="xs"`, `size="icon-xs"` / `"icon-sm"` square icon buttons, or `h-8 rounded-sm` on an override), menu options, sidebar entries, tab triggers; `md` fields,
buttons, select triggers, input groups (h-9 to h-11); `lg` menus, select lists, popovers, toolbars, the
save bar; `xl` cards, dialogs, toasts, large previews. Nesting: an element hugging a rounded container
with a gap of 8 px or less (edge to edge, border included) takes the container radius minus the gap, so
menu panels pad `p-[3px]` inside their border (`lg` = `sm` + 4); with 16 px or more of padding the size
scale wins. Menus share one compact density (`min-h-8 px-2 text-[13px]/5` options). Admin pages put their
title, meta, actions and tabs in `ui-page-header`, below a 48 px bar that only names the context (hidden
below 1024 px when it repeats the title). Dialogs take `size: 'sm'` (420 px) or `'md'` (512 px); `uiBadge`
takes `variant` (neutral `default`/`outline`, `secondary`, the statuses, `accent`), `appearance`
(`outline` by default: no fill, a hairline, a muted label and the colour on the dot or leading icon
only; `ghost`, `soft`, `solid`), `shape` (`default` `xs`, `pill`) and `size` (`sm` 20 px by
default, `md` 24 px), a leading dot or icon taking a smaller start padding; every status badge with an
icon goes through it, never hand-made markup; a list of short strings (technology keys) is a
`ui-tags-input` (`FormValueControl<readonly string[]>`, outlined badges with a remove button, Enter
or a separator commits, Backspace twice removes the last tag, `maxTags`, `maxTagLength`, `normalize`,
`mono`, `size` `sm` 32 px or `md` 36 px), never a comma-separated text field; an empty state is `uiEmpty` (icon tile, title, description, actions, centred: the one centred
text of the admin) whose `layout` follows its position: `fill` when nothing follows it in its page
column (remaining height, content centred in it), `inline` (default) when something follows it
(compact, centred horizontally only), `panel` when it is the only content of a bounded pane or frame
(content centred in the box), and `ui-data-table` passes its `emptyLayout` to it (`let-layout` on
`ng-template[uiDataTableEmpty]`); `ui-selection-bar` is the floating bar of a table
selection; `ui-data-table` with `resizableColumns` takes every column but one with a `width` in px
(`minWidth` / `maxWidth` bounds) and leaves the title without one: it fills the room left (down to
its `minWidth`, then the frame scrolls), has no handle, and the other columns resize from the edge
facing it so that the edge follows the pointer (D36 column resizing revision); `ui-sidebar-trigger` toggles the sidebar of the nearest `SIDEBAR_CONTROL`
provider (`uiSidebarProvider`, or a layout's own `SidebarControl` such as the admin layout's, D36),
named by the state, and renders nothing without one or while the provider reports it unavailable; shortcut caps and `aria-keyshortcuts` come from `ModifierKeyService.caps` /
`ariaKeys` with `Mod` for the platform modifier. Overlay
templates take their panel classes through a bound `[class]`: Angular drops a static `class` on an
`ng-template`.

## Icons

`NgIcon` from `@ng-icons/core`; `@ng-icons/lucide` for interface pictograms, `@ng-icons/simple-icons` for
technology logos (strip the `<title>` when a label sits beside it), `@ng-icons/bootstrap-icons` for brands
missing elsewhere (LinkedIn). Every pack stays on the `@ng-icons/core` version. Never paste SVG paths.

## Styling rules

Literal class strings (the admin's `apps/web/src/admin.css` scans all of `libs/frontend`; the public
`apps/web/src/styles.css` scans one `@source` per catalogue folder a public page uses: add the folder
there when a public page starts using a component, D31); no `styleUrl`;
custom CSS only inline, small and justified; no mockup class names (`ob-*`, `v2-*`); `motion-reduce:` on
every animation.
