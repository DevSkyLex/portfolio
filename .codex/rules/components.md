# Angular components and directives

- `ChangeDetectionStrategy.OnPush` on every component; standalone by default (never `standalone: true`);
  `imports` limited to what the template uses. No `styleUrl` (the guard refuses it); a small inline
  `styles` block only for what Tailwind cannot express, justified in a comment.
- The class keeps the `Component` / `Directive` suffix; the selector uses the project prefix enforced by
  its `eslint.config.mjs`: `content-`, `contact-`, `identity-`, `legal-`, `ui-` / `ui` for the catalogue,
  `app-` in the shell and the app.
- Members carry explicit access modifiers and `readonly`: `public readonly x = input.required<T>()`,
  outputs in the past tense or as nouns, `protected` for what the template reads, `private readonly` for
  injected collaborators.
- Only pages and feature sections inject stores or services; context `ui` components receive view models
  as inputs (D11). `layer:ui` bans `@angular/common/http` and `@ngrx/*`.
- Visuals come from `@vfortin/ui` and literal Tailwind classes over the Orbite tokens; icons from the
  `@ng-icons` packs, never hand-copied SVG paths.
- Every public page is prerendered: browser APIs run in `afterNextRender` or behind `isPlatformBrowser`.
- Public copy is French source with explicit `@@area.key` ids and English targets in
  `apps/web/src/locale/messages.en.xlf`; admin screens are French only, without `$localize` (D18).

Details: [UI catalogue](../references/ui-catalogue.md), [naming](../references/naming.md), [design system](design-system.md).
