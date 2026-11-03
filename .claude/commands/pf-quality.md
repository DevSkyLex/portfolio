---
description: Run the portfolio quality gate (format, affected lint/typecheck/test/build, architecture test, and the agent-tooling tests when .claude/.codex changed), or a focused test run, stopping at the first failure.
argument-hint: '[optional project and filter — e.g. "content-web-ui planet-math"]'
allowed-tools: Bash(npx nx format:check), Bash(npx nx affected:*), Bash(npx nx run architecture:test), Bash(npx nx test:*), Bash(python -B .codex/scripts/validate.py), Bash(python -B -m unittest discover -s .codex/scripts -p "test_*.py"), Bash(node --test:*)
---

Run the gate yourself and report each step. No agent.

**With an argument** `<project> [filter]`, run only `npx nx test <project> -- <filter>` (or
`npx nx test <project>` without a filter) and stop. Report the executed test count: a filter that
matches nothing runs 0 files.

**Without an argument**, run in order and stop at the first failure:

1. `npx nx format:check` — on failure, report affected files and use scoped formatting only when authorized; preserve unrelated changes.
2. `npx nx affected -t lint typecheck test build` — the same targets as CI (`.github/workflows/ci.yml`).
   On a fresh repository without commits, use `npx nx run-many -t lint typecheck test build` instead.
3. `npx nx run architecture:test` — the rejected-import proof of `tools/architecture`.
4. Only when `.claude/`, `.codex/`, `.githooks/` or `.mcp.json` changed, the tooling checks of
   `.codex/maintenance.md`:
   `python -B .codex/scripts/validate.py`,
   `python -B -m unittest discover -s .codex/scripts -p "test_*.py"`, then
   `node --test .claude/hooks/guard.test.mjs .claude/hooks/guard-git.test.mjs .claude/hooks/guard-delete.test.mjs .claude/hooks/format.test.mjs .claude/hooks/comment-diff.test.mjs .codex/hooks/adapter.test.mjs .codex/scripts/style-diff.test.mjs`.

The e2e suite is not part of this gate (CI runs it on `main` and on affected pull requests): use `/pf-e2e`.

If a step fails, **stop**, show the relevant output and propose the fix. End with one line per step:
PASS, FAIL or not run.
