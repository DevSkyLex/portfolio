import type { ThemeMode } from '@internal/web-shell/lib/theme/models/theme-mode/theme-mode.type';

/**
 * Constant THEME_STORAGE_KEY
 *
 * @description
 * Storage key shared with the blocking theme script so the saved choice is applied before paint.
 *
 * @type {string}
 */
export const THEME_STORAGE_KEY = 'theme' as const;

/**
 * Constant THEME_MODES
 *
 * @description
 * Allowed stored preferences used to reject stale or unknown local storage values.
 *
 * @type {readonly ThemeMode[]}
 */
export const THEME_MODES: readonly ThemeMode[] = ['system', 'dark', 'light'];
