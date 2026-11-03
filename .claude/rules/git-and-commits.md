# Git, branches and commits

- **No commit unless the user asks for one**, and never a push, merge or deployment on your own.
- `main` is production: CI on `main` triggers "Deploy services" and "Site build"
  (`docs/operations/deployment.md`). Work goes through a branch and a pull request; agents never push to
  `main`, merge into it, or run `gh pr merge`.
- Branches: `<type>/<lowercase-kebab-description>` with a Conventional Commits type (`feat`, `fix`,
  `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`); no agent-name prefix.
- Commits follow Conventional Commits (`@commitlint/config-conventional` through `commitlint.config.mjs`),
  checked by `.githooks/commit-msg`: `type(scope): subject`, English, imperative, lowercase subject, no
  final period, header at most 100 characters; scope = the context or area (`feat(contact)`,
  `fix(web-shell)`, `ci`, `chore(deps)`); a breaking change takes `!` and a `BREAKING CHANGE:` footer.
- `.githooks/pre-push` runs `npx nx format:check` and affected lint and typecheck; the hooks are installed by
  `npm install` (`prepare` sets `core.hooksPath`). Never bypass them (`--no-verify`, `core.hooksPath`,
  `PF_SKIP_PUSH_CHECKS`).
- Stage only the files of your task. Never force-push, rewrite pushed history, `reset --hard`, `clean -f`
  or create tags. The `guard-git` hook refuses these; a refusal means stop and let the user decide.
