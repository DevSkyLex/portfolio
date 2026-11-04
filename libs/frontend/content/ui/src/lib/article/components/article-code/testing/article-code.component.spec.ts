import { PLATFORM_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArticleCode } from '@vfortin/content-web-model';
import { ArticleCodeComponent } from '@internal/content-web-ui/lib/article/components/article-code/article-code.component';
import { CODE_COPY_FEEDBACK_MS } from '@internal/content-web-ui/lib/article/components/article-code/constants/article-code.constants';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

/**
 * Constant HIGHLIGHTED
 *
 * @description
 * TypeScript block whose runs cover a keyword, plain code, a string holding markup and punctuation.
 */
const HIGHLIGHTED: ArticleCode = {
  kind: 'code',
  text: "const tag = '<b>';",
  language: 'TypeScript',
  tokens: [
    { text: 'const', kind: 'keyword' },
    { text: ' tag = ', kind: null },
    { text: "'<b>'", kind: 'string' },
    { text: ';', kind: 'punctuation' },
  ],
};

/**
 * Constant PLAIN
 *
 * @description
 * Plain text block, without language nor runs, keeping its indentation.
 */
const PLAIN: ArticleCode = {
  kind: 'code',
  text: 'npm ci\n  npm test',
  language: null,
  tokens: [],
};

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
 * Renders a code block and returns its fixture.
 */
async function render(code: ArticleCode): Promise<ComponentFixture<ArticleCodeComponent>> {
  const fixture: ComponentFixture<ArticleCodeComponent> =
    TestBed.createComponent(ArticleCodeComponent);
  fixture.componentRef.setInput('code', code);
  await fixture.whenStable();
  return fixture;
}

/**
 * Function button
 *
 * @description
 * Copy button of a rendered block.
 */
function button(fixture: ComponentFixture<ArticleCodeComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
}

/**
 * Function status
 *
 * @description
 * Text of the polite live region of a rendered block.
 */
function status(fixture: ComponentFixture<ArticleCodeComponent>): string | null | undefined {
  return fixture.nativeElement.querySelector('[role="status"]')?.textContent?.trim();
}

/**
 * Function settle
 *
 * @description
 * Lets the clipboard promise of a click resolve, then renders the outcome.
 */
async function settle(fixture: ComponentFixture<ArticleCodeComponent>): Promise<void> {
  for (let turn: number = 0; turn < 5; turn++) await Promise.resolve();
  fixture.detectChanges();
}

/**
 * Function mockClipboard
 *
 * @description
 * Installs a clipboard on the jsdom navigator, or removes it with `undefined`.
 */
function mockClipboard(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  });
}

describe('ArticleCodeComponent', (): void => {
  afterEach((): void => {
    mockClipboard(undefined);
    vi.useRealTimers();
  });

  it('renders the runs as coloured spans, the markup they hold as text', async (): Promise<void> => {
    const root: HTMLElement = (await render(HIGHLIGHTED)).nativeElement;
    const code: HTMLElement | null = root.querySelector('pre > code');
    expect(code?.textContent).toBe("const tag = '<b>';");
    expect(code?.querySelector('b')).toBeNull();
    const spans: HTMLSpanElement[] = [...(code?.querySelectorAll('span') ?? [])];
    expect(spans.map((span: HTMLSpanElement): string | null => span.textContent)).toEqual([
      'const',
      ' tag = ',
      "'<b>'",
      ';',
    ]);
    expect(spans.map((span: HTMLSpanElement): string[] => classes(span))).toEqual([
      classes(ARTICLE_TYPOGRAPHY.codeTokens.keyword),
      [],
      classes(ARTICLE_TYPOGRAPHY.codeTokens.string),
      classes(ARTICLE_TYPOGRAPHY.codeTokens.punctuation),
    ]);
    expect(classes(root.querySelector('pre'))).toEqual(classes(ARTICLE_TYPOGRAPHY.codePre));
    expect(root.querySelector(':scope > div > span')?.textContent).toBe('TypeScript');
  });

  it('shows plain text as is, without language name', async (): Promise<void> => {
    const root: HTMLElement = (await render(PLAIN)).nativeElement;
    expect(root.querySelector('pre > code')?.textContent).toBe('npm ci\n  npm test');
    expect(root.querySelector('pre span')).toBeNull();
    const header: Element | null = root.querySelector(':scope > div');
    expect(classes(header)).toEqual(classes(ARTICLE_TYPOGRAPHY.codeHeader));
    expect(header?.children[0]?.getAttribute('role')).toBe('status');
    expect(header?.textContent?.trim()).toBe('Copier');
  });

  it('names the copy button and keeps an empty polite status before any copy', async (): Promise<void> => {
    const fixture: ComponentFixture<ArticleCodeComponent> = await render(PLAIN);
    expect(button(fixture).getAttribute('type')).toBe('button');
    expect(button(fixture).getAttribute('aria-label')).toBe('Copier le code');
    expect(button(fixture).textContent?.trim()).toBe('Copier');
    expect(button(fixture).querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(status(fixture)).toBe('');
  });

  it('copies the code, says so politely, then returns to its idle state', async (): Promise<void> => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const writes: string[] = [];
    mockClipboard((text: string): Promise<void> => {
      writes.push(text);
      return Promise.resolve();
    });
    const fixture: ComponentFixture<ArticleCodeComponent> = await render(HIGHLIGHTED);
    button(fixture).click();
    await settle(fixture);
    expect(writes).toEqual(["const tag = '<b>';"]);
    expect(status(fixture)).toBe('Code copié');
    expect(button(fixture).dataset['state']).toBe('copied');
    expect(button(fixture).querySelector('ng-icon')?.classList.contains('text-success-ink')).toBe(
      true,
    );
    vi.advanceTimersByTime(CODE_COPY_FEEDBACK_MS - 1);
    fixture.detectChanges();
    expect(status(fixture)).toBe('Code copié');
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(status(fixture)).toBe('');
    expect(button(fixture).dataset['state']).toBe('idle');
  });

  it('says so when the browser refuses the copy', async (): Promise<void> => {
    mockClipboard((): Promise<void> => Promise.reject(new Error('NotAllowedError')));
    const fixture: ComponentFixture<ArticleCodeComponent> = await render(PLAIN);
    button(fixture).click();
    await settle(fixture);
    expect(status(fixture)).toBe('Impossible de copier le code');
    expect(button(fixture).dataset['state']).toBe('failed');
    expect(button(fixture).querySelector('ng-icon')?.classList.contains('text-danger-ink')).toBe(
      true,
    );
  });

  it('says so when the page has no clipboard', async (): Promise<void> => {
    mockClipboard(undefined);
    const fixture: ComponentFixture<ArticleCodeComponent> = await render(PLAIN);
    button(fixture).click();
    await settle(fixture);
    expect(status(fixture)).toBe('Impossible de copier le code');
  });

  it('never touches the clipboard while prerendering', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const writes: string[] = [];
    mockClipboard((text: string): Promise<void> => {
      writes.push(text);
      return Promise.resolve();
    });
    const fixture: ComponentFixture<ArticleCodeComponent> = await render(HIGHLIGHTED);
    button(fixture).click();
    await settle(fixture);
    expect(writes).toEqual([]);
    expect(status(fixture)).toBe('');
  });
});
