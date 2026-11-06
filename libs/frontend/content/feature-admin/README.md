# Project administration feature

## Purpose

`content-web-feature-admin` owns the project list and bilingual editor under `/admin/projects`, and the
« Expériences » and « Formations » lists and editors under `/admin/experiences` and `/admin/education`, and
the « Informations » (profile texts, facts, public links) and « Légal » (legal notice, privacy policy)
pages under `/admin/information` and `/admin/legal` (D44), and the « Tableau de bord » SEO dashboard under
`/admin/dashboard`, the administration's landing page (D47). Pages
coordinate page-scoped stores, routing and confirmations; dataviews render collections, and forms own
validated editor values and emit submission intent.

## Public entry points

| Entry point                          | Consumers   |
| ------------------------------------ | ----------- |
| `@vfortin/content-web-feature-admin` | `web-shell` |

The root publishes `ADMIN_DASHBOARD_ROUTES`, `ADMIN_CONTENT_ROUTES`, `ADMIN_EXPERIENCE_ROUTES`, `ADMIN_EDUCATION_ROUTES`,
`ADMIN_INFORMATION_ROUTES` and `ADMIN_LEGAL_ROUTES` only. Pages, forms, dataviews, search, order and
table-query helpers and editor models stay internal. The shell palette consumes the content owner's navigation port.

## Provider scope

The authenticated shell mounts the owner routes lazily. Each project page provides `AdminProjectsStore`,
each timeline page `AdminTimelineStore`, the « Informations » page `AdminProfileStore` and the « Légal »
page `AdminLegalStore`, the dashboard page `AdminSeoDashboardStore` (its refresh polling stops with the page); the timeline routes pass their kind as route `data`.
The editor reacts to its bound route ID and invalidates obsolete reads; page scope alone does not
make a reused route input static.

Public content edits request an automatic site rebuild. Notices report the expected update without
claiming that the rebuild or publication has completed.

## Invariants

- The dashboard window lives in `?periode=` (`7j`, `90j`; the default 28 days writes none) and
  scopes every section; another window keeps the previous figures dimmed until it arrives. Each
  Google section shows its own state (variables to set in mono, no collection yet, a failed
  collection above its last good report); charts are the catalogue's `ui-area-chart` and
  `ui-bar-list`, one measure per chart.
- Navigation from A to B clears A's projection and cannot apply an obsolete answer to B.
- The project list is a `ui-data-table` whose search, facets (`statut`, `accueil`, `completude`), sort
  (`tri`, `ordre`) and page live in the query parameters, written with `replaceUrl`; its default order
  is the public one (position, then title).
- Dirty and pending edits have an explicit leave decision for route changes and browser exit.
- Signal Form rules represent browser-safe contract bounds and map typed server errors to fields.
- Form values, labels and rules are feature-owned; data access converts them to requests.
- Writes retain the observed version; conflicts offer deliberate reload instead of silent overwrite.
- Publication changes are deliberate and destructive actions use accessible catalogue confirmation.
- A request's outcome is a toast through the admin layout's single toaster; a version conflict stays an
  inline alert offering to reload, and field errors stay on their fields.
- The editor shows one language per tab (presentation, information, article, search texts and
  keywords with a search result preview, a link card preview and the « Balises générées » list);
  settings shared by both languages (cover, site, technologies, home-page feature) sit in the
  properties panel, rendered from the form's `settings` template so that they stay fields of the same
  Signal Form.
- Search texts and keywords are optional: an empty text falls back on the title or summary and is
  omitted from the revision, empty keywords fall back on the technology keys (« Reprendre les
  technos » appends them); `PROJECT_SEO_LIMITS` is the browser copy of the contract bounds (D10). The
  previews and the generated tags come from the public `projectPageSeo` and `pageSeoMetaTags`
  (`@vfortin/content-web-data-access/admin`), fed with the form values by `projectSeoSource`.
- A published project stays complete in both languages: the form flags what the API would refuse
  (`content.project-incomplete`) before sending; a draft may leave English empty.
- Each language's case study is one rich document edited in `ui/components/article-editor/`, a TipTap
  editor (D40) whose nodes carry the public `ARTICLE_TYPOGRAPHY` classes: the editing surface is the
  preview. Its schema produces only what `EditableArticleDocumentSchema` accepts, loading a value never
  marks the form dirty, and images are inserted only after the upload answered. TipTap and ProseMirror
  are imported by this library only, from the lazy editor route.
- The golden fixture `libs/contracts/content/src/lib/testing/article-document.golden.json` is the
  editor's own JSON for every node and mark; the editor spec fails when TipTap changes it.
- A timeline list is a `ui-data-table` without search, sort or pages, most recent first (start date,
  then an ongoing entry and the later end first): the public timeline places the entries by date, so
  the list offers no manual order (D36 timeline selection revision). « Supprimer », from the row menu
  or the selection bar, confirms in the danger tone; a version conflict reloads the list and warns.
- The timeline editor follows the project editor: FR/EN tabs in the page header, the texts of one
  language per panel (both languages required, since an entry is public at once), the period (month and
  year `ui-select` choices, « En cours » for no end) and the technologies (`ui-tags-input`) in the
  properties panel, the save bar, Ctrl/Cmd+S, the leave guard and `TIMELINE_ENTRY_LIMITS`, the browser
  copy of the contract bounds (D10).
- Administration copy is localized (`@@admin.projects.*`, `admin.project.*`, `admin.timeline.*`,
  `admin.article.*`, `admin.legal.*`, `admin.profile.*`, `admin.information.*`, `admin.content.*`) and
  client-rendered (D18); the FR/EN content the owner types is data, not translated.

## Validation

Run `npx nx run-many -t lint typecheck test -p content-web-feature-admin`, then
`npx nx run architecture:test`. Tests cover reused route IDs, out-of-order reads, accepted/declined leave
decisions, bounds, server field errors and conflicts. Authenticated stack tests qualify HTTP/cookies.
See [testing](../../../../docs/workspace/testing.md), decisions D18, D19, D36, D37 and D40.
