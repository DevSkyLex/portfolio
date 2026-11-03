import path from 'node:path';

/**
 * Constant IMMUTABLE_PREFIXES
 *
 * @description
 * Repository-relative prefixes that a Codex edit never touches, before or after: files written by
 * `npx nx configure-ai-agents`, vendored skills and installed Ansible collections. The adapter refuses
 * them in the pre phase and never formats them in the post phase. Valid `pf-*` shared skill folders
 * are repository-owned and remain editable.
 *
 * @type {string[]}
 */
export const IMMUTABLE_PREFIXES = [
  '.agents/skills/',
  '.github/skills/',
  '.github/agents/',
  '.github/prompts/',
  'ansible/.collections/',
];

/**
 * Function isImmutableSource
 *
 * @description
 * Whether `file` lies under one of the immutable prefixes (path comparison only, the file is not opened).
 *
 * @param {string} root - Absolute repository root.
 * @param {string} file - Absolute or root-relative candidate path.
 * @returns {boolean} True for an immutable source.
 */
export function isImmutableSource(root, file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const normalized = process.platform === 'win32' ? relative.toLowerCase() : relative;
  if (normalized.startsWith('.agents/skills/')) {
    return !/^\.agents\/skills\/pf-[a-z0-9]+(?:-[a-z0-9]+)*\/.+/.test(normalized);
  }
  return IMMUTABLE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
