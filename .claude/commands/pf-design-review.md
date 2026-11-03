---
description: Compare a page with the mockup boards through computed-style diffs. Read-only.
argument-hint: '<page or component> — e.g. "the home hero" or "the footer"'
---

Delegate to the **pf-web-design-fidelity-reviewer** subagent: $ARGUMENTS

Start the servers first: `preview_start(name: "site")` after `npx nx build web` (or `web` for the dev server) and the local mockup copy described in `.claude/skills/design-fidelity/SKILL.md`. The agent writes its diff spec in a scratch directory and runs `node .claude/skills/design-fidelity/style-diff.mjs`.

Require its report to give deviations worst-first with selector, width, theme, site and mockup values, correction and owner, and the widths or themes not judged.
