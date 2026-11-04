import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArticleBlock } from '@vfortin/content-web-model';
import { ArticleBlocksComponent } from '@internal/content-web-ui/lib/article/components/article-blocks/article-blocks.component';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

/**
 * Constant blocks
 *
 * @description
 * One block of each kind, with nested marks and nested lists.
 */
const blocks: ArticleBlock[] = [
  {
    kind: 'paragraph',
    content: [
      { kind: 'text', text: 'Voir ' },
      {
        kind: 'link',
        href: 'https://angular.dev',
        external: true,
        content: [
          {
            kind: 'bold',
            content: [{ kind: 'italic', content: [{ kind: 'text', text: 'la doc' }] }],
          },
          { kind: 'text', text: ' en ligne' },
        ],
      },
      { kind: 'text', text: ', ' },
      { kind: 'code', content: [{ kind: 'text', text: '<b>npm</b>' }] },
      { kind: 'break' },
      {
        kind: 'link',
        href: 'mailto:hello@example.com',
        external: false,
        content: [{ kind: 'text', text: 'écrire' }],
      },
    ],
  },
  { kind: 'subheading', content: [{ kind: 'text', text: 'Sous-titre' }] },
  {
    kind: 'list',
    ordered: true,
    start: 3,
    items: [
      [
        { kind: 'paragraph', content: [{ kind: 'text', text: 'Un' }] },
        {
          kind: 'list',
          ordered: false,
          start: 1,
          items: [[{ kind: 'paragraph', content: [{ kind: 'text', text: 'Deux' }] }]],
        },
      ],
      [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Trois' }] }],
    ],
  },
  {
    kind: 'blockquote',
    blocks: [
      { kind: 'paragraph', content: [{ kind: 'text', text: 'Cité.' }] },
      {
        kind: 'list',
        ordered: false,
        start: 1,
        items: [[{ kind: 'paragraph', content: [{ kind: 'text', text: 'Point' }] }]],
      },
    ],
  },
  { kind: 'code', text: 'const a = 1;\n  a++;', language: null, tokens: [] },
  { kind: 'rule' },
  {
    kind: 'figure',
    image: {
      src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
      small: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90-960.webp',
      width: 1200,
      height: 900,
      alt: 'Écran du calendrier',
    },
    caption: 'Capture 1.',
  },
  {
    kind: 'figure',
    image: {
      src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
      small: null,
      width: 640,
      height: 480,
      alt: 'Schéma',
    },
    caption: '',
  },
];

/**
 * Function classes
 *
 * @description
 * Sorted classes of an element or a class string, so assertions ignore the order Angular applies
 * them in.
 */
function classes(value: Element | string | null | undefined): string[] {
  const list: string[] =
    typeof value === 'string' ? value.split(/\s+/) : [...(value?.classList ?? [])];
  return list.filter(Boolean).sort();
}

/**
 * Function render
 *
 * @description
 * Renders the blocks with the given reveal classes and returns the component host.
 */
async function render(reveal?: string): Promise<HTMLElement> {
  const fixture: ComponentFixture<ArticleBlocksComponent> =
    TestBed.createComponent(ArticleBlocksComponent);
  fixture.componentRef.setInput('blocks', blocks);
  if (reveal !== undefined) fixture.componentRef.setInput('reveal', reveal);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('ArticleBlocksComponent', (): void => {
  it('renders each block as its element, in order, without extra text', async (): Promise<void> => {
    const root: HTMLElement = await render();
    expect([...root.children].map((child: Element): string => child.tagName.toLowerCase())).toEqual(
      [
        'p',
        'h3',
        'content-article-list',
        'blockquote',
        'content-article-code',
        'hr',
        'figure',
        'figure',
      ],
    );
    const paragraph: HTMLParagraphElement | null = root.querySelector(':scope > p');
    expect(paragraph?.textContent).toBe('Voir la doc en ligne, <b>npm</b>écrire');
    expect(classes(paragraph)).toEqual(classes(ARTICLE_TYPOGRAPHY.paragraph));
    expect(root.querySelector('h3')?.textContent).toBe('Sous-titre');
    expect(classes(root.querySelector('h3'))).toEqual(
      expect.arrayContaining(classes(ARTICLE_TYPOGRAPHY.h3)),
    );
    expect(root.querySelector('pre')?.textContent).toBe('const a = 1;\n  a++;');
    expect(root.querySelector('pre > code')).not.toBeNull();
    expect(classes(root.querySelector('content-article-code'))).toEqual(
      expect.arrayContaining(classes(ARTICLE_TYPOGRAPHY.codeFrame)),
    );
    expect(classes(root.querySelector('hr'))).toEqual(
      expect.arrayContaining(classes(ARTICLE_TYPOGRAPHY.horizontalRule)),
    );
  });

  it('nests the marks and treats the text as text', async (): Promise<void> => {
    const paragraph: Element | null = (await render()).querySelector(':scope > p');
    const external: HTMLAnchorElement | null | undefined =
      paragraph?.querySelector<HTMLAnchorElement>('a[href="https://angular.dev"]');
    expect(external?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(classes(external)).toEqual(classes(ARTICLE_TYPOGRAPHY.link));
    expect(external?.textContent).toBe('la doc en ligne');
    const em: Element | null | undefined = external?.querySelector('strong em');
    expect(em?.textContent).toBe('la doc');
    expect(classes(em)).toEqual(classes(ARTICLE_TYPOGRAPHY.italic));
    expect(classes(external?.querySelector('strong'))).toEqual(classes(ARTICLE_TYPOGRAPHY.bold));
    const code: Element | null | undefined = paragraph?.querySelector('code');
    expect(classes(code)).toEqual(classes(ARTICLE_TYPOGRAPHY.inlineCode));
    expect(code?.textContent).toBe('<b>npm</b>');
    expect(paragraph?.querySelector('b')).toBeNull();
    expect(paragraph?.querySelector('code + br')).not.toBeNull();
    const mail: Element | null | undefined = paragraph?.querySelector(
      'a[href="mailto:hello@example.com"]',
    );
    expect(mail?.hasAttribute('rel')).toBe(false);
    expect(mail?.textContent).toBe('écrire');
  });

  it('renders the lists with their nesting, start and semantics', async (): Promise<void> => {
    const root: HTMLElement = await render();
    const ordered: HTMLOListElement | null = root.querySelector(
      ':scope > content-article-list > ol',
    );
    expect(ordered?.getAttribute('start')).toBe('3');
    expect(classes(ordered)).toEqual(classes(ARTICLE_TYPOGRAPHY.orderedList));
    const items: HTMLLIElement[] = [...(ordered?.children ?? [])] as HTMLLIElement[];
    expect(items.map((item: HTMLLIElement): string => item.tagName)).toEqual(['LI', 'LI']);
    expect(items.map((item: HTMLLIElement): string | null => item.textContent)).toEqual([
      'UnDeux',
      'Trois',
    ]);
    expect(classes(items[0])).toEqual(classes(ARTICLE_TYPOGRAPHY.orderedItem));
    const nested: Element | null | undefined = items[0]?.querySelector(
      ':scope > content-article-list',
    );
    expect(classes(nested)).toEqual(expect.arrayContaining(classes(ARTICLE_TYPOGRAPHY.nestedList)));
    expect(nested?.querySelector(':scope > ul')?.getAttribute('role')).toBe('list');
    expect(classes(nested?.querySelector('li'))).toEqual(classes(ARTICLE_TYPOGRAPHY.bulletItem));
    const quote: Element | null = root.querySelector('blockquote');
    expect(classes(quote)).toEqual(expect.arrayContaining(classes(ARTICLE_TYPOGRAPHY.blockquote)));
    expect(quote?.querySelector(':scope > p')?.textContent).toBe('Cité.');
    expect(quote?.querySelector(':scope > content-article-list > ul > li')?.textContent).toBe(
      'Point',
    );
  });

  it('gives the figures a lazy image of reserved size and an optional caption', async (): Promise<void> => {
    const figures: HTMLElement[] = [...(await render()).querySelectorAll<HTMLElement>('figure')];
    const image: HTMLImageElement | null | undefined = figures[0]?.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp');
    expect(image?.getAttribute('srcset')).toBe(
      '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90-960.webp 960w, /media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp 1200w',
    );
    expect(image?.getAttribute('sizes')).toBe('(min-width: 1024px) 916px, 100vw');
    expect(image?.getAttribute('width')).toBe('1200');
    expect(image?.getAttribute('height')).toBe('900');
    expect(image?.getAttribute('alt')).toBe('Écran du calendrier');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('decoding')).toBe('async');
    expect(classes(image)).toEqual(classes(ARTICLE_TYPOGRAPHY.image));
    expect(figures[0]?.querySelector('figcaption')?.textContent).toBe('Capture 1.');
    const plain: HTMLImageElement | null | undefined = figures[1]?.querySelector('img');
    expect(plain?.hasAttribute('srcset')).toBe(false);
    expect(plain?.hasAttribute('sizes')).toBe(false);
    expect(plain?.getAttribute('alt')).toBe('Schéma');
    expect(figures[1]?.querySelector('figcaption')).toBeNull();
  });

  it('lets the page reveal each top-level block', async (): Promise<void> => {
    const root: HTMLElement = await render('reveal-me');
    for (const block of root.children) {
      expect(block.classList.contains('reveal-me')).toBe(true);
      expect(block.hasAttribute('data-in')).toBe(true);
    }
    expect(root.querySelector('li')?.classList.contains('reveal-me')).toBe(false);
  });
});
