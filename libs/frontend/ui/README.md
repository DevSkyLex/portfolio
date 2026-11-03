# @vfortin/ui

## Purpose

In-house component catalogue of the Orbite design system (`scope:platform`, `layer:ui`). The list and the names follow the Spartan UI / shadcn catalogue, but nothing comes from Spartan: the behaviour relies on `@angular/cdk`, the look on Tailwind classes over the tokens of `@vfortin/design-tokens`, and the icons on `@ng-icons/lucide`.

Components may be unused by the site. `package.json` declares `"sideEffects": false` so that the build drops whatever the app does not import; the Tailwind classes of the whole catalogue still end up in `styles.css` (`@source` scans `libs/frontend`).

## Public entry points

| Entry point   | Consumers                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vfortin/ui` | `contact-web-feature`, `contact-web-feature-admin`, `content-web-feature`, `content-web-feature-admin`, `content-web-ui`, `identity-web-feature`, `legal-web-feature`, `web-shell` |

The root is the supported visual catalogue surface. Private host tokens, render IDs, shared menu
implementation and overlay containers are not public import shortcuts. Consumers choose controls from
this entry instead of duplicating their interaction behavior in a feature.

## Provider scope

State that belongs to one control is provided by that control or its containing group. Overlay
references, DOM listeners and animation work are disposed with the owner. Application-wide toast,
scroll scheduling and ID services remain domain-agnostic; ID counters belong to an application
injector rather than the JavaScript module lifetime.

## Invariants

- The catalogue imports no business model, store, HTTP client or backend implementation.
- Controls use native semantics where possible, typed signal inputs/outputs and Angular form-control
  contracts; focus and keyboard behavior are part of the public API.
- Styling uses literal token-based Tailwind classes and the shared interactive/status scales.
- Server rendering and hydration must not reuse module-global identity across application instances.
- Overlay close and component destruction release listeners, views and scheduled work.

## Validation

Run `npx nx run-many -t lint typecheck test -p ui` and `npx nx run architecture:test`. Component tests
cover value-control, state, keyboard and ARIA contracts. Repeated application rendering and browser
hydration qualify IDs; browser tests qualify actual geometry, overlays, reduced motion and focus.
See [testing](../../../docs/workspace/testing.md) and decisions D26, D35 and D37.

## Conventions

- Directive on the native element whenever possible (`button[uiBtn]`, `div[uiCard]`); a `ui-*` component only when it owns a template.
- Variants with `cva`, merged with the caller's `class` input through `cn` (tailwind-merge extended with the theme scale, radii, easings and animations); `data-slot="<name>"` on every host.
- Value controls implement the Signal Forms `FormValueControl<T>` / `FormCheckboxControl` contracts: bind them with `[formField]`.
- Accessible default texts are `$localize` messages with `@@ui.<component>.<key>` ids, French source; each can be overridden by an input. A message only reaches `messages.xlf` once the app uses its component: run `extract-i18n` and translate it then.
- One declaration kind per file (D37): component, directive and service files keep their existing declaration contracts and related injection helpers (`linkDialogTitle`, `injectDialogContainer`, `openDialogPanel`). Public names remain imported from `@vfortin/ui`.
- Each catalogue entry is a coherent unit. Its primary matching component/directive may stay at the entry root; child units live in `components/<name>/`, `directives/<name>/` or `services/<concern>/`, with their templates and `testing/` alongside them.
- Related interfaces, aliases and const-enum models live in `models/<concept>/`. Flat `constants/` holds `*.variants.ts` (`cva` families and derived unions), `*.constants.ts` and `*.imports.ts` tuples. Tokens use `tokens/<concern>/`; pure functions use `utils/<helper>/`. Constants/options do not need a directory per value or file.
- `src/index.ts` re-exports each public file with one `export * from` line; inside the library, imports use `@internal/ui/lib/...`.
- Statuses use the `success`, `warning`, `danger` and `info` families (`-ink` for text, `on-` on a fill); `signal` only marks focus, selection and the brand accent (D37). Text starts on the left; only inherently centred parts (icon buttons, OTP slots, calendar cells, spinner) centre their content.
- Specs live in each folder's `testing/`.

## Catalogue

| Family     | Folder            | Entry points                                                                                                                          |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Display    | `alert`           | `uiAlert`, `uiAlertTitle`, `uiAlertDescription`                                                                                       |
|            | `aspect-ratio`    | `uiAspectRatio`                                                                                                                       |
|            | `avatar`          | `uiAvatar`, `uiAvatarImage`, `uiAvatarFallback`                                                                                       |
|            | `badge`           | `uiBadge`                                                                                                                             |
|            | `card`            | `uiCard`, `uiCardHeader`, `uiCardTitle`, `uiCardDescription`, `uiCardAction`, `uiCardContent`, `uiCardFooter`                         |
|            | `empty`           | `uiEmpty`, `uiEmptyHeader`, `uiEmptyMedia`, `uiEmptyTitle`, `uiEmptyDescription`, `uiEmptyContent`                                    |
|            | `icon`            | `ui-icon`                                                                                                                             |
|            | `item`            | `uiItemGroup`, `uiItem`, `uiItemMedia`, `uiItemContent`, `uiItemTitle`, `uiItemDescription`, `uiItemActions`, …                       |
|            | `kbd`             | `uiKbd`, `uiKbdGroup`                                                                                                                 |
|            | `progress`        | `ui-progress`                                                                                                                         |
|            | `separator`       | `uiSeparator`                                                                                                                         |
|            | `skeleton`        | `uiSkeleton`                                                                                                                          |
|            | `spinner`         | `ui-spinner`                                                                                                                          |
|            | `table`           | `uiTableContainer`, `uiTable`, `uiTableHeader`, `uiTableRow`, `uiTableHead`, `uiTableCell`, …                                         |
|            | `typography`      | `uiH1`…`uiH4`, `uiP`, `uiLead`, `uiSmall`, `uiMuted`, `uiBlockquote`, `uiInlineCode`, `uiList`, …                                     |
| Actions    | `button`          | `uiBtn`                                                                                                                               |
|            | `button-group`    | `uiButtonGroup`, `uiButtonGroupText`, `uiButtonGroupSeparator`                                                                        |
|            | `toggle`          | `uiToggle`                                                                                                                            |
|            | `toggle-group`    | `uiToggleGroup`, `uiToggleGroupItem`                                                                                                  |
| Forms      | `field`           | `ui-field` (label, hint, error, `[uiFieldAside]` counter)                                                                             |
|            | `field-set`       | `uiFieldSet`, `uiFieldLegend`, `uiFieldGroup`, `uiFieldDescription`, `uiFieldError`, `uiFieldSeparator`                               |
|            | `label`           | `uiLabel`                                                                                                                             |
|            | `input`           | `uiInput`                                                                                                                             |
|            | `input-group`     | `uiInputGroup`, `uiInputGroupInput`, `uiInputGroupAddon`, `uiInputGroupText`, `uiInputGroupButton`                                    |
|            | `input-otp`       | `ui-input-otp`, `uiInputOtpGroup`, `ui-input-otp-slot`, `ui-input-otp-separator`                                                      |
|            | `textarea`        | `uiTextarea`                                                                                                                          |
|            | `native-select`   | `ui-native-select`                                                                                                                    |
|            | `select`          | `ui-select`, `ui-select-option`, `uiSelectGroup`, `uiSelectLabel`, `uiSelectSeparator`                                                |
|            | `combobox`        | `ui-combobox`, `ui-combobox-option`                                                                                                   |
|            | `autocomplete`    | `ui-autocomplete`                                                                                                                     |
|            | `checkbox`        | `ui-checkbox`                                                                                                                         |
|            | `radio-group`     | `uiRadioGroup`, `ui-radio-group-item`                                                                                                 |
|            | `switch`          | `uiSwitch`                                                                                                                            |
|            | `slider`          | `ui-slider`                                                                                                                           |
|            | `calendar`        | `ui-calendar`                                                                                                                         |
|            | `date-picker`     | `ui-date-picker`                                                                                                                      |
| Overlays   | `dialog`          | `[uiDialogTrigger]` + `ng-template[uiDialogContent]`, parts, `DialogService`                                                          |
|            | `alert-dialog`    | `[uiAlertDialogTrigger]` + `ng-template[uiAlertDialogContent]`, `uiAlertDialogAction`, `uiAlertDialogCancel`, `AlertDialogService`    |
|            | `sheet`           | `[uiSheetTrigger]` + `ng-template[uiSheetContent]` (`side`: top, right, bottom, left, full), `SheetService`                           |
|            | `popover`         | `[uiPopoverTrigger]` + `ng-template[uiPopoverContent]`                                                                                |
|            | `tooltip`         | `[uiTooltip]`                                                                                                                         |
|            | `hover-card`      | `[uiHoverCardTrigger]` + `ng-template[uiHoverCardContent]`                                                                            |
|            | `confirm-dialog`  | `ConfirmDialogService` (`confirm(options: ConfirmDialogOptions)` resolves `true` on confirm; `tone: 'danger'` for a destructive one)  |
|            | `sonner`          | `ui-toaster`, `ToastService`                                                                                                          |
| Menus      | `dropdown-menu`   | `[uiDropdownMenuTrigger]`, `uiDropdownMenuContent`, `uiDropdownMenuItem`, checkbox/radio items, sub-menus, label, separator, shortcut |
|            | `context-menu`    | `[uiContextMenuTrigger]` (dropdown-menu parts)                                                                                        |
|            | `menubar`         | `uiMenubar`, `[uiMenubarTrigger]`                                                                                                     |
|            | `navigation-menu` | `uiNavigationMenu`, list, item, trigger, content, link, `ui-navigation-menu-viewport`, indicator                                      |
|            | `command`         | `ui-command`, `ui-command-input`, `uiCommandList`, `ui-command-group`, `uiCommandItem`, `uiCommandEmpty`, …                           |
| Navigation | `breadcrumb`      | `uiBreadcrumb`, list, item, link, page, separator, ellipsis                                                                           |
|            | `pagination`      | `uiPagination` parts, `ui-numbered-pagination`                                                                                        |
|            | `tabs`            | `uiTabs`, `uiTabsList`, `[uiTabsTrigger]`, `[uiTabsContent]`                                                                          |
|            | `sidebar`         | `uiSidebarProvider`, `ui-sidebar`, `ui-sidebar-trigger`, menu parts, `SidebarService`                                                 |
| Layout     | `accordion`       | `uiAccordion`, `uiAccordionItem`, `uiAccordionTrigger`, `ui-accordion-icon`, `ui-accordion-content`                                   |
|            | `collapsible`     | `uiCollapsible`, `uiCollapsibleTrigger`, `ui-collapsible-content`                                                                     |
|            | `carousel`        | `uiCarousel`, `uiCarouselContent`, `uiCarouselItem`, `ui-carousel-previous`, `ui-carousel-next`                                       |
|            | `scroll-area`     | `uiScrollArea`                                                                                                                        |
|            | `resizable`       | `uiResizablePanelGroup`, `uiResizablePanel`, `ui-resizable-handle`                                                                    |
| Data       | `data-table`      | `ui-data-table`, `ng-template[uiDataTableCell]`                                                                                       |
| Site       | `deco`, `reveal`  | `ui-deco`, `ui-glyph`, `uiReveal`                                                                                                     |
|            | `section-heading` | `ui-section-heading`                                                                                                                  |
|            | `section-fx`      | `uiSectionFx`, `SECTION_FX_CONTENT`                                                                                                   |
|            | `scroll-progress` | `uiScrollProgress` (`--p`, `--e`)                                                                                                     |
|            | `scroll-frame`    | `ScrollFrameService` (one scroll listener and one frame for every scroll-linked element, reads before writes)                         |

`menu-panel` (shared panel and option variants, class constants and helpers, and `menu-motion.ts`, the unrolling shared by `ui-select` and `ui-menu-select`), `render-id` (ids counted per application, stable between prerendering and hydration), `boolean-attribute` (the empty-attribute transform shared by accordion, collapsible, sidebar and tabs), `combobox-base`, the `*.token.ts` files with the host interfaces they carry (`combobox-host.interface.ts`, `select-host.interface.ts`, …), `dialog-container` (with `dialog-panel.interface.ts` and `dialog-panel.token.ts`) and the constants files of private values (`checkbox.constants.ts`, `pagination.constants.ts`, …) are internal and stay out of the barrel.

## Tests

Run `npx nx test ui`.
