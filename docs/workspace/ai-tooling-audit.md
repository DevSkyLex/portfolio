# AI tooling audit

Scope: portfolio-owned Codex and Claude agents, commands, rules, skills, hooks, documentation and the
CI tooling gate. Nx-managed skills and configuration remain owned by `nx configure-ai-agents`.

## Findings addressed

- Kept Claude Code, Codex, the shared `.agents/` skills, `AGENTS.md` and `.mcp.json`. Removed
  OpenCode configuration and GitHub Copilot's generated agents, prompts and skill copies; the former
  Cursor, Gemini and OpenCode directories are absent. `npm run ai:configure` selects only Claude and
  Codex when updating Nx integrations. Existing hook denial fixtures for other clients remain useful
  protection against accidental edits to externally managed paths.
- The two agent catalogues already contained a comment maintainer. Added a read-only reviewer and a
  Claude command; both catalogues now carry the same roles. Maintenance uses pre-edit snapshots and a
  syntax comparison that includes untracked files instead of treating `git diff -w` as proof.
- The TypeScript/JavaScript comparison checks syntax leaves and selected comment directives; it does not
  execute the code and does not support HTML. Review HTML changes manually and report that limitation.
  The `ai-tooling` CI job installs the workspace dependencies needed by this checker and runs its tests.
- The shared Docker guard now skips Compose options with separate values when identifying the command.
  It permits a production Compose `config` check with an example env file while refusing `up` when an
  option value happens to be `config`. It also refuses production-oriented reload and restore scripts.
- Updated operations, security and contract-review guidance for the shared Traefik edge and private
  Nginx origin. Corrected CI, e2e, package-script and web-budget descriptions. The quality command no
  longer suggests formatting the entire workspace after a failure.

## Limits

- Hooks and client permissions are guardrails, not a complete security boundary: arbitrary shell or
  search commands are not comprehensively intercepted for secret access. The repository prohibition
  on reading or writing secrets and the active sandbox still apply. Claude's broad `.env.*` read deny
  also covers example files; it is more restrictive than the repository convention.
- Catalogue parity and link validation are static checks. They do not prove the clients have reloaded
  the new agents or that a given model or tool is available at runtime.
- The comment checker uses the workspace's TypeScript parser. Unsupported file types and parse errors
  require manual investigation; successful comparison is evidence of matching syntax and selected
  directives, not a proof of identical runtime behaviour.
