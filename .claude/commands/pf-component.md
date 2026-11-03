---
description: Create or change a page, home-page section or presentational component of the portfolio web app from @vfortin/ui and the Orbite tokens.
argument-hint: '<name> [where] — e.g. "testimonial-card in content ui" or "projects-page in content feature"'
---

Delegate to the **pf-web-component-builder** subagent: $ARGUMENTS

The agent carries the placement table, naming, markup and copy rules; do not restate them. If the request is really a missing catalogue entry or token, hand it to **pf-web-ui-catalogue-builder** instead and say so.

Require its report to give the **placement decision and the rule that drove it**, the files created, every `@@` id introduced with its English target in `apps/web/src/locale/messages.en.xlf`, and the lint/typecheck/test/build results.
