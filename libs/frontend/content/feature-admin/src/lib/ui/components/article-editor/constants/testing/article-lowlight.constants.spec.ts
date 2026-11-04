import { ARTICLE_LOWLIGHT } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-lowlight.constants';

/**
 * Type Run
 *
 * @description
 * Highlighted text and the classes of its span, empty for bare text.
 */
type Run = readonly [string, string];

/**
 * Function runs
 *
 * @description
 * Runs of a highlighted tree, failing on a nested span.
 *
 * @param {ReturnType<typeof ARTICLE_LOWLIGHT.highlight>} root - Highlighted tree.
 *
 * @returns {Run[]} Text and classes of each run.
 */
function runs(root: ReturnType<typeof ARTICLE_LOWLIGHT.highlight>): Run[] {
  return root.children.map((node): Run => {
    if (node.type === 'text') return [node.value, ''];
    if (node.type !== 'element') throw new Error(`unexpected ${node.type}`);
    const [child] = node.children;
    if (node.children.length !== 1 || child?.type !== 'text') throw new Error('nested span');
    const className: unknown = node.properties['className'];
    return [child.value, Array.isArray(className) ? className.join(' ') : ''];
  });
}

describe('ARTICLE_LOWLIGHT', (): void => {
  it('gives each text the classes of its innermost coloured scope, an interpolation none', (): void => {
    const highlighted: Run[] = runs(
      ARTICLE_LOWLIGHT.highlight('typescript', 'const url = `/p/${id}`; class A {}'),
    );
    expect(highlighted).toEqual(
      expect.arrayContaining([
        ['const', 'hljs-keyword'],
        ['`/p/', 'hljs-string'],
        ['class', 'hljs-keyword'],
        ['A', 'hljs-title class_'],
      ]),
    );
    // The interpolation is plain text, not the string around it.
    expect(highlighted.filter(([text]): boolean => text.includes('id'))).toEqual([
      expect.arrayContaining([expect.stringContaining('id'), '']),
    ]);
    expect(highlighted.some(([, classes]): boolean => classes.includes('subst'))).toBe(false);
  });

  it('colours the name and the attributes of a tag rather than the tag around them', (): void => {
    expect(runs(ARTICLE_LOWLIGHT.highlight('html', '<a href="x">y</a>'))).toEqual([
      ['<', 'hljs-tag'],
      ['a', 'hljs-name'],
      [' ', 'hljs-tag'],
      ['href', 'hljs-attr'],
      ['=', 'hljs-tag'],
      ['"x"', 'hljs-string'],
      ['>', 'hljs-tag'],
      ['y', ''],
      ['</', 'hljs-tag'],
      ['a', 'hljs-name'],
      ['>', 'hljs-tag'],
    ]);
  });

  it('never guesses a plain text block and knows only the listed languages', (): void => {
    expect(runs(ARTICLE_LOWLIGHT.highlightAuto('const answer = 42;'))).toEqual([
      ['const answer = 42;', ''],
    ]);
    expect(ARTICLE_LOWLIGHT.listLanguages()).toContain('html');
    expect(ARTICLE_LOWLIGHT.listLanguages()).toHaveLength(19);
    expect(ARTICLE_LOWLIGHT.registered('html')).toBe(true);
    expect(ARTICLE_LOWLIGHT.registered('ts')).toBe(false);
    expect(ARTICLE_LOWLIGHT.registered('kotlin')).toBe(false);
  });
});
