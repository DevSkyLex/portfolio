import { lucideCheck, lucideCircleAlert, lucideCopy } from '@ng-icons/lucide';
import type { CodeCopyState } from '@internal/content-web-ui/lib/article/components/article-code/models/code-copy-state.type';

/**
 * Constant CODE_COPY_FEEDBACK_MS
 *
 * @description
 * How long the copy button shows the outcome of a copy before it reads « Copier » again.
 *
 * @type {number}
 */
export const CODE_COPY_FEEDBACK_MS: number = 2000;

/**
 * Constant CODE_COPY_ICONS
 *
 * @description
 * Icon of the copy button in each state.
 */
export const CODE_COPY_ICONS: Readonly<Record<CodeCopyState, string>> = {
  idle: lucideCopy,
  copied: lucideCheck,
  failed: lucideCircleAlert,
};

/**
 * Constant CODE_COPY_ICON_CLASSES
 *
 * @description
 * Ink of the copy icon in each state (D37): the button's own text colour, then success or danger.
 */
export const CODE_COPY_ICON_CLASSES: Readonly<Record<CodeCopyState, string>> = {
  idle: '',
  copied: 'text-success-ink',
  failed: 'text-danger-ink',
};

/**
 * Constant CODE_COPY_MESSAGES
 *
 * @description
 * Status written beside the copy button and announced politely; empty while waiting.
 */
export const CODE_COPY_MESSAGES: Readonly<Record<CodeCopyState, string>> = {
  idle: '',
  copied: $localize`:@@project.code.copied:Code copié`,
  failed: $localize`:@@project.code.copyFailed:Impossible de copier le code`,
};
