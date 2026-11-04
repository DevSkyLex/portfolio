import type { ArticleShortcut } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-shortcut.interface';

/**
 * Constant ARIA_KEYS
 *
 * @description
 * `aria-keyshortcuts` names of the modifiers written in `ARTICLE_SHORTCUTS`, `Mod` excepted.
 */
const ARIA_KEYS: Readonly<Record<string, string>> = { Alt: 'Alt', Maj: 'Shift' };

/**
 * Function resolveArticleShortcut
 *
 * @description
 * Resolves an `ARTICLE_SHORTCUTS` entry for the platform: `Mod` becomes `cap` (`⌘` or `Ctrl`, from
 * `ModifierKeyService`) in the caps and `Meta` or `Control` in `aria-keyshortcuts` (D36); `Maj` is
 * shown as the Shift cap of the admin's locale (`Maj` in French, `Shift` in English).
 *
 * @param {readonly string[]} keys - Keys of the shortcut, `Mod` first.
 * @param {boolean} apple - Whether the browser runs on an Apple platform.
 * @param {string} cap - Key cap of the platform modifier.
 *
 * @returns {ArticleShortcut} Caps and `aria-keyshortcuts` value.
 */
export function resolveArticleShortcut(
  keys: readonly string[],
  apple: boolean,
  cap: string,
): ArticleShortcut {
  const shift: string = $localize`:@@admin.article.shortcut.shift:Maj`;
  return {
    caps: keys.map((key: string): string => (key === 'Mod' ? cap : key === 'Maj' ? shift : key)),
    aria: keys
      .map((key: string): string =>
        key === 'Mod' ? (apple ? 'Meta' : 'Control') : (ARIA_KEYS[key] ?? key),
      )
      .join('+'),
  };
}
