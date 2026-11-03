# Third-party skills

## Installed: the Nx skills

`.agents/skills/` holds the Nx skills (`nx-workspace`, `nx-generate`, `nx-run-tasks`, `nx-plugins`,
`nx-import`, `link-workspace-packages`, `monitor-ci`), installed and updated by
`npm run ai:configure` with only Claude and Codex selected, together with
`.codex/agents/ci-monitor-subagent.toml` and the `nx-mcp` entry of [config.toml](config.toml). They are
read-only for agents (the guard and the Codex adapter refuse edits): a hand change is lost at the next
update. Use the explicit client-selection command and review the diff. `AGENTS.md` and `CLAUDE.md` keep
the Nx guidance sections that the command maintains. Shared skills live in `.agents/skills/`; duplicate
assistant-specific skill trees are intentionally absent.

Use them for workspace exploration (`nx-workspace`), scaffolding (`nx-generate`, with the commands of
`docs/workspace/generators.md`) and task execution (`nx-run-tasks`). Repository rules win where they
differ: tags, `depConstraints` and projects created on demand.

## Installed: official Angular development skill

The unmodified MIT-licensed `angular-developer` pack is pinned to revision
`fcda81301d03fd36579e5032e2b06bbd3ccd7284` of the official `angular/skills` repository. It lives in
`.agents/skills/angular-developer/`, outside Nx ownership, and stays protected from manual edits.
Its complete attribution, source revision, update procedure and license notice are in
[technology tooling](../docs/workspace/technology-tooling.md).

Project-authored `pf-*` technology skills in the same shared directory adapt framework guidance to the
repository; they are editable source. Load `pf-angular` before the upstream Angular pack so Nx tasks,
Signal Forms, the existing catalogue and explicit typing remain the local conventions. These skills
are separate from the native agent catalogue.

## Evaluated and not installed

| Skill                                                  | Reason                                                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spartan` (official Spartan UI skill)                  | `@vfortin/ui` reuses Spartan names only; nothing comes from Spartan (D26). Its CLI, helm/brain imports and registry would contradict `libs/frontend/ui/README.md`.                              |
| `impeccable`, `ui-ux-pro-max`, `design-taste-frontend` | The visual language is decided by the mockup and Orbite; a generator of palettes, layouts or "taste" passes would compete with them and reintroduce the decorative patterns the mockup removed. |
| Sonar or other quality-gate skills                     | Not configured for this workspace; ESLint, the architecture test and CI are the gates.                                                                                                          |

Installing a third-party skill later needs the user's decision, its license, an entry in this file and,
when vendored, its folder added to `.prettierignore` and protected by the hooks.
