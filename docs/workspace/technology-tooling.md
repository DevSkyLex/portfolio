# Technology skills and MCP

The project keeps Claude and Codex tooling plus shared skills. Skills describe the repository's
workflows; MCP servers provide live documentation or workspace capabilities. Neither grants permission
for an external action. Repository architecture and explicit user instructions take precedence over
upstream examples.

## Skills

Canonical shared skills live under `.agents/skills/`. Project-owned names begin with `pf-` and remain
editable; installed Nx and Angular skills are protected from hand edits. Claude has small discovery
entries pointing to the same canonical skills. Codex discovers the shared directory directly. The
existing client-specific recipes still supply detailed catalogue, data-access, SignalStore and test
examples, rather than introducing a second architecture.

| Skill                 | Use                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pf-angular`          | Angular 22 in Nx: typed DI, Signal Forms, NgRx 22 state ownership, Tailwind 4 tokens, Vitest 5/Analog tests, routing and hydration |
| `angular-developer`   | Official Angular API reference pack, loaded with the portfolio overrides from `pf-angular`                                         |
| `pf-nestjs`           | NestJS transport adapters, providers, composition and lifecycle; the runtime version follows D9                                    |
| `pf-drizzle-postgres` | Drizzle 0.45 transactions, versions, outbox, migrations and PostgreSQL/PGlite test boundaries                                      |
| `pf-zod-contracts`    | Zod 4 Mini request/response schemas, type-only browser contracts and field-error mapping                                           |
| `pf-local-stack`      | Local Compose, Nginx routing and the shared Traefik/Ansible configuration contract                                                 |

The seven Nx skills remain managed by `npm run ai:configure`, which selects only Claude and Codex.
Generic design, Supabase and alternate UI/framework packs are not installed: the project already owns
its catalogue, design language, persistence and testing stack.

## Angular MCP

Both `.mcp.json` and `.codex/config.toml` use:

```text
npx -y @angular/cli@22.2.5 mcp --read-only --root .
```

The command is pinned to the repository's Angular 22.2 family, uses a project-relative root and sets
`NG_CLI_ANALYTICS=false`. It runs from npm's tool cache; no Angular CLI dependency, lockfile change or
parallel workspace configuration is needed. Claude enables the `angular` server and its relevant
specialists can call the two documentation tools explicitly.

- `get_best_practices` works without a workspace argument; omit it here.
- `search_documentation` accepts the installed Angular major (`version: 22`).
- `list_projects` expects `angular.json`. Use Nx skills and `nx show` for this workspace; do not create
  that file merely to satisfy the Angular MCP. Builds, tests and generators also remain Nx-owned.
- Read-only mode omits mutation tools such as `run_target`, `devserver_start` and `devserver_stop`.
  Existing Nx, Context7 and Playwright integrations retain their responsibilities.

An isolated stdio MCP handshake verified server `angular-cli-server` version `22.2.5`, listed its tools,
checked the mutation tools were absent, successfully called `get_best_practices` and searched Angular 22 documentation for Signal Forms. The smoke process
was closed afterward. New client configuration is loaded on a new session/reconnect; this check does
not mean an already-open session has discovered the server. The first launch may need network access
to populate npm's cache.

Official sources: [Angular MCP](https://angular.dev/ai/mcp),
[Angular skills](https://angular.dev/ai/agent-skills),
[Codex skills](https://learn.chatgpt.com/docs/build-skills).

## Upstream provenance and updates

`angular-developer` is installed unchanged from the official
[angular/skills repository](https://github.com/angular/skills/tree/fcda81301d03fd36579e5032e2b06bbd3ccd7284/angular-developer),
revision `fcda81301d03fd36579e5032e2b06bbd3ccd7284`. Its `BUILD_INFO` identifies Angular source revision
`2e939258e9f693fc9364f94d9cc4435ad87c4fef`. The skill declares MIT and copyright 2026 Google LLC.
Only this development pack is installed; the standalone `angular-new-app` pack does not match Nx.

Review a fixed upstream revision and license before an update, install through a skill installer,
review its diff and re-run the tooling validator and relevant hook tests. Keep the source pack intact;
project-specific adaptations belong in `pf-angular`. When changing the Angular MCP pin, update both
client configurations together and repeat initialization, tool-list and a documentation call. Check
installed Angular versions before selecting the replacement; do not upgrade the application by accident.

The project-owned skill text is authored for this repository; it is not presented as an official
NestJS, Drizzle, Zod or Docker skill. Its primary documentation links and source exemplars identify
which framework behavior and which local architectural choices it relies on.

## Validation of this addition

The tooling validator passes with five project-owned shared skills, fifteen Claude discovery entries
and four Codex MCP servers. All 46 Python and 297 hook/script tests pass. Skill metadata checks,
scoped Prettier and `git diff --check` pass. All 44 installed Angular files match their pinned upstream
Git blobs exactly. An independent read-only scenario review covered frontend implementation, backend
HTTP/concurrency changes and local proxy review; its PostgreSQL cache-bypass correction is included.

`npx nx run architecture:test` passed with both targets cached. `npx nx affected -t lint typecheck test
build` could not select projects because the local `main` reference is absent. Application lint,
typecheck, tests and builds were not repeated for this tooling-only addition.

### Angular skill license notice

[Upstream license](https://github.com/angular/angular/blob/2e939258e9f693fc9364f94d9cc4435ad87c4fef/LICENSE):

```text
The MIT License

Copyright (c) 2010-2026 Google LLC. https://angular.dev/license

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
