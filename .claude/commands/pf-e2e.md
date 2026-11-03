---
description: Write or run the Playwright suite on the built site, or verify a behaviour in a real browser.
argument-hint: '[spec or behaviour] — e.g. "the /en/ legal pages" or apps/web-e2e/src/public-site.spec.ts'
---

Delegate to the **pf-e2e-runner** subagent: $ARGUMENTS

First make it justify the browser: if a unit test, the lint or the build proves it, that check is used instead. The standalone suite builds the site and starts its dedicated server on `E2E_PORT` (default 4200, validated 1–65535). Choose an available port; never stop or reuse an unknown user's server. Use the isolated `web-e2e:e2e-stack` target for real authenticated UI mutations, cookie/TOTP and Mailpit journeys. It owns its disposable project and cleanup; it never uses the developer's existing stack.

Require its report to give what ran on which projects with pass/fail and failing assertions, or the visual finding with width, theme and values.
