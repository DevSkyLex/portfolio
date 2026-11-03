---
description: Audit pages or catalogue entries against WCAG 2.2 AA. Read-only.
argument-hint: '[path or surface — e.g. libs/frontend/contact/feature or "the footer"]'
---

Delegate to the **pf-web-a11y-auditor** subagent: $ARGUMENTS

The agent audits intent statically; live contrast and focus checks belong to **pf-e2e-runner**.

Require its report to give findings worst-first with `file:line`, criterion, severity and fix, plus a "needs live confirmation" list.
