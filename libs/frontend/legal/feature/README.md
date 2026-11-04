# Legal content feature

## Purpose

`legal-web-feature` owns the public legal notice and privacy policy, with a shared article component.
Its `/legal-notice` and `/privacy` routes are localized by the French and English site builds.

## Public entry points

| Entry point                  | Consumers   |
| ---------------------------- | ----------- |
| `@vfortin/legal-web-feature` | `web-shell` |

The root publishes `LEGAL_ROUTES`, the `LEGAL_DOCUMENTS` port (`LegalDocumentSource`) and the
`COOKIE_PREFERENCES` port (`CookiePreferences`). Pages, the document renderer and its view model stay
private; the shell mounts the owner routes within its public layout, binds `LEGAL_DOCUMENTS` to the
content snapshot (D44), since this context reads no content library, and `COOKIE_PREFERENCES` to its
consent service (D48): the privacy page then ends with « Gérer les cookies ».

## Provider scope

Pages are lazy standalone OnPush components with no mutable business store or data-access service;
they read their document from `LEGAL_DOCUMENTS`, provided by the shell on the guarded public routes.
They participate in public prerendering and the shell's localized route policy.

## Invariants

- The documents are content, edited on the « Légal » administration page; the page chrome (title,
  home link, « Dernière mise à jour ») has explicit localization IDs and English targets.
- Documents render node by node, never through `innerHTML`; each level-2 heading opens a labelled
  `section` whose heading id takes a `legal-` prefix.
- Titles/headings identify the page purpose, and legal routes never require authentication.
- Shared visual controls come from `@vfortin/ui`; legal content is not infrastructure for other contexts.
- No user data, session authority or backend transport is serialized by the feature.

## Validation

Run `npx nx run-many -t lint typecheck test -p legal-web-feature`, then
`npx nx run architecture:test` and `npx nx build web`. Component tests cover semantics/metadata;
built-site browser tests cover localized navigation and accessibility.
See [testing](../../../../docs/workspace/testing.md), decisions D7 and D18.
