import { clearTranslations, loadTranslations } from '@angular/localize';
import { ARTICLE_SHORTCUTS } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-shortcuts.constants';
import { resolveArticleShortcut } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-shortcut/article-shortcut.utils';

describe('resolveArticleShortcut', (): void => {
  it('shows Ctrl and announces Control outside Apple platforms', (): void => {
    expect(resolveArticleShortcut(ARTICLE_SHORTCUTS.bulletList, false, 'Ctrl')).toEqual({
      caps: ['Ctrl', 'Maj', '8'],
      aria: 'Control+Shift+8',
    });
  });

  it('shows the Command glyph and announces Meta on Apple platforms', (): void => {
    expect(resolveArticleShortcut(ARTICLE_SHORTCUTS.h2, true, '⌘')).toEqual({
      caps: ['⌘', 'Alt', '2'],
      aria: 'Meta+Alt+2',
    });
    expect(resolveArticleShortcut(ARTICLE_SHORTCUTS.bold, true, '⌘').aria).toBe('Meta+B');
  });

  it('shows the Shift cap of the English admin', (): void => {
    loadTranslations({ 'admin.article.shortcut.shift': 'Shift' });
    try {
      expect(resolveArticleShortcut(ARTICLE_SHORTCUTS.redo, false, 'Ctrl')).toEqual({
        caps: ['Ctrl', 'Shift', 'Z'],
        aria: 'Control+Shift+Z',
      });
    } finally {
      clearTranslations();
    }
  });
});
