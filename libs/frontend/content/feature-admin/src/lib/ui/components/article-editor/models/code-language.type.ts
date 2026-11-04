import type { CODE_LANGUAGE_LABELS } from '@vfortin/content-web-data-access/admin';

/**
 * Type CodeLanguage
 *
 * @description
 * Language a code block may declare, a key of the contract's `CODE_BLOCK_LANGUAGES` (TypeScript,
 * HTML…); a block without one is plain text.
 */
export type CodeLanguage = keyof typeof CODE_LANGUAGE_LABELS;
