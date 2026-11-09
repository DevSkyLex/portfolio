import type { CodeLanguageDto } from '@vfortin/content-contracts';

/**
 * Constant CODE_LANGUAGE_LABELS
 *
 * @description
 * Display name of each code block language, shown above a published code block (D40 code block
 * revision). Proper names, identical in both locales. Keyed by the contract's language list, so a
 * language added there does not compile until it is named here.
 */
export const CODE_LANGUAGE_LABELS: Readonly<Record<CodeLanguageDto, string>> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  bash: 'Bash',
  python: 'Python',
  php: 'PHP',
  sql: 'SQL',
  yaml: 'YAML',
  markdown: 'Markdown',
  java: 'Java',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  dockerfile: 'Dockerfile',
  nginx: 'Nginx',
  mermaid: 'Mermaid',
};
