import { TestBed, type ComponentFixture } from '@angular/core/testing';
import mermaid, { type RenderResult } from 'mermaid';
import { ArticleDiagramComponent } from '@internal/content-web-ui/lib/article/components/article-diagram/article-diagram.component';

vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: vi.fn() } }));

const SOURCE: string = 'flowchart LR\n  Browser --> API';
const IMAGE: RenderResult = {
  diagramType: 'flowchart-v2',
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><desc>Request flow</desc></svg>',
};

function mount(source: string): ComponentFixture<ArticleDiagramComponent> {
  const fixture: ComponentFixture<ArticleDiagramComponent> =
    TestBed.createComponent(ArticleDiagramComponent);
  fixture.componentRef.setInput('source', source);
  fixture.detectChanges();
  return fixture;
}

describe('ArticleDiagramComponent', (): void => {
  beforeEach((): void => {
    vi.resetAllMocks();
    vi.mocked(mermaid.render).mockResolvedValue(IMAGE);
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  afterEach((): void => document.documentElement.removeAttribute('data-theme'));

  it('replaces the readable source with an accessible image and redraws it in the new theme', async (): Promise<void> => {
    const root: HTMLElement = mount(SOURCE).nativeElement;
    expect(root.querySelector('code')?.textContent).toBe(SOURCE);
    await vi.waitFor((): void => {
      const image: HTMLImageElement | null = root.querySelector('img');
      expect(image?.alt).toBe('Request flow');
      expect(image?.width).toBe(240);
      expect(image?.height).toBe(80);
      expect(image?.src).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(IMAGE.svg)}`);
    });
    expect(root.querySelector('code')).toBeNull();
    expect(vi.mocked(mermaid.render).mock.lastCall?.[2]?.isConnected).toBe(false);

    document.documentElement.setAttribute('data-theme', 'light');
    await vi.waitFor((): void => expect(mermaid.render).toHaveBeenCalledTimes(2));
    expect(mermaid.initialize).toHaveBeenLastCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        themeVariables: expect.objectContaining({ darkMode: false }),
      }),
    );
  });

  it('uses a localized description and restores the source if the image fails to load', async (): Promise<void> => {
    vi.mocked(mermaid.render).mockResolvedValue({
      ...IMAGE,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"></svg>',
    });
    const root: HTMLElement = mount(SOURCE).nativeElement;
    await vi.waitFor((): void => expect(root.querySelector('img')?.alt).toBe('Diagramme Mermaid'));
    root.querySelector('img')?.dispatchEvent(new Event('error'));
    await vi.waitFor((): void => expect(root.querySelector('code')?.textContent).toBe(SOURCE));
  });

  it.each([
    ['empty', ''],
    ['oversized', 'x'.repeat(10_001)],
  ])('keeps %s source out of Mermaid', async (_label: string, source: string): Promise<void> => {
    const fixture: ComponentFixture<ArticleDiagramComponent> = mount(source);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('code')?.textContent).toBe(source);
    expect(mermaid.render).not.toHaveBeenCalled();
  });

  it('preserves the source if Mermaid rejects the diagram and removes the measurement container', async (): Promise<void> => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid diagram'));
    const root: HTMLElement = mount(SOURCE).nativeElement;
    await vi.waitFor((): void => {
      expect(vi.mocked(mermaid.render).mock.lastCall?.[2]?.isConnected).toBe(false);
    });
    expect(root.querySelector('code')?.textContent).toBe(SOURCE);
    expect(root.querySelector('img')).toBeNull();
  });

  it('ignores an in-flight diagram once its source has been replaced', async (): Promise<void> => {
    let finishFirst: (result: RenderResult) => void = (): void => undefined;
    const first: Promise<RenderResult> = new Promise((resolve): void => {
      finishFirst = resolve;
    });
    vi.mocked(mermaid.render)
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({
        ...IMAGE,
        svg: IMAGE.svg.replace('<desc>Request flow</desc>', '<title>Data flow</title>'),
      });
    const fixture: ComponentFixture<ArticleDiagramComponent> = mount(SOURCE);
    const root: HTMLElement = fixture.nativeElement;
    await vi.waitFor((): void => expect(mermaid.render).toHaveBeenCalledTimes(1));
    const replacement: string = 'flowchart TB\n  API --> Database';
    fixture.componentRef.setInput('source', replacement);
    await fixture.whenStable();

    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('code')?.textContent).toBe(replacement);
    finishFirst(IMAGE);
    await vi.waitFor((): void => expect(root.querySelector('img')?.alt).toBe('Data flow'));
  });
});
