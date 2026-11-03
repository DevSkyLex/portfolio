# Design fidelity

Claude Code keeps an equivalent skill; change one, change both. The script
`.codex/scripts/style-diff.mjs` exists byte for byte as `.codex/scripts/style-diff.mjs`
(its tests: `.codex/scripts/style-diff.test.mjs`).

## Sources of truth

- Mockup canvas **"Portfolio — One page v2"**, a claude.ai artifact owned by the user:
  https://claude.ai/artifact/95Qvg6GZZ2vQMzh5qz1jJo. Boards: `Main` (1440, one page), `Mobile` (390),
  `Article` and its wrappers (case studies), `MentionsLegales` / `Confidentialite` (legal pages and their
  mobile wrappers), `ContactForm`, `Champs` (field sizes), `Parcours` (journey animation). Shared files:
  `orbite.css`, `v2.css`, `orbite-fx.js`, `v2-fx.js`, `v2-scenes.js`.
- Design system **Orbite**: https://claude.ai/artifact/MPXDavNF22pazDTiSsLMEK. Its token values are
  transcribed in `libs/frontend/design-tokens/src/theme.css`, which is what the code uses.
- Plain-page constraints agreed on the mockup: one hierarchy, factual copy, no eyebrow labels, numbering,
  slogan titles, repeated contact calls or bracket placeholders; at most one motion accent per section;
  equal visual gaps between sections; one 10 px radius for buttons, selects and fields.

## Serve both pages

1. **Site**: `npx nx build web`, then `node apps/web-e2e/support/preview/serve-site.mjs dist/apps/web/browser 4300`
   (the prerendered output served like Nginx), started hidden with its process id recorded. The dev
   server (`npx nx serve web`, 4200) serves French only and is fine for a quick look.
2. **Mockup**: the user (or a client that can read claude.ai artifacts) exports the canvas boards and
   shared files into a task scratch folder, with the canvas runtime saved as `support.js` next to the
   boards (the canvas type's `artifact-type/dc-runtime.js`); serve it:
   `python -m http.server 8791 --bind 127.0.0.1 --directory <scratch>/mockup`. Never copy the mockup into
   the checkout. The local server caches: reload with `cache: 'reload'` after changing a file.

## Run the diff

Write the spec in the scratch folder:

```json
{
  "site": "http://localhost:4300/",
  "mockup": "http://127.0.0.1:8791/Main.dc.html",
  "viewports": [
    { "width": 1440, "height": 900 },
    { "width": 390, "height": 844 }
  ],
  "siteHtml": {},
  "mockupHtml": {},
  "tolerancePx": 1,
  "pairs": [
    { "name": "hero name", "site": "#hero h1", "mockup": "h1" },
    { "name": "primary button", "site": "#hero a[uiBtn]", "mockup": ".ob-btn" }
  ]
}
```

```bash
node .codex/scripts/style-diff.mjs <scratch>/spec.json
```

For the light theme run a second spec with `"siteHtml": { "data-theme": "light" }` and the mockup's own
day theme attribute. Exit 0 = every pair matches, 1 = a difference or a missing element (listed in the
JSON report), 2 = spec or browser error. Transitions and animations are disabled and reduced motion is
emulated, so the values are the settled ones. Default properties cover typography, colours, borders,
radius, padding, gap, opacity and the box size; pass `properties` per pair to focus.

## Read the result

- A difference is a finding only at the same width, theme and scroll state. Box sizes depend on content:
  compare boxes only for fixed-size elements (buttons, fields, cards).
- Colours: compare after resolving tokens; a mockup value missing from `theme.css` is a token request
  for pf-web-ui-catalogue-builder, not a raw value in a template.
- Canvas scenes (ASCII planet, journey) are judged on captures and motion behaviour, not styles.
- Route each correction: template classes → the component's builder; catalogue variant or token →
  pf-web-ui-catalogue-builder.
