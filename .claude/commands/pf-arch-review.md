---
description: Review changes against the boundaries, tags, hexagonal layering and decisions. Read-only.
argument-hint: '[path or diff scope — defaults to the working-tree changes]'
---

Delegate to the **pf-architecture-reviewer** subagent: $ARGUMENTS

Without a scope, review `git status` and `git diff`. The agent carries the checklist; do not restate it.

Require its report to give findings worst-first with the rule or decision violated, then a conforms / changes-required verdict.
