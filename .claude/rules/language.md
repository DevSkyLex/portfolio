# Language

Everything written in this repository is **English**: code, identifiers, comments, docs
(`docs/**`, READMEs, `AGENTS.md`, `CLAUDE.md`), agent prompts, rules, skills, hook messages, test names,
logs, API error messages, URL routes (`/projects`, `/legal-notice`, `/privacy`, `/error/:code`,
`/admin/login`), commit messages, branch names and PR text.

Product copy keeps its language:

- Public UI copy is **French source** (`sourceLocale` `fr` in `apps/web/project.json`) with explicit
  `@@area.key` ids; English targets live in `apps/web/src/locale/messages.en.xlf` and the build fails on a
  missing one. Regenerate the source catalog with `npx nx run web:extract-i18n`, never by hand.
- The admin UI follows the same rule (ids `@@admin.<area>.<key>`, served at `/admin` and
  `/en/admin`, D18 revision). The owner's notification e-mail is French; seed content, the content the
  owner types in the admin and the content snapshot carry both languages from the content service.
- Mockup names and quoted mockup copy stay as they are, in code formatting.

No emojis. The conversation follows the user's language.
