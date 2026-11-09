import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { ArticleDiagramViewportComponent } from '@internal/content-web-ui/lib/article/components/article-diagram/components/article-diagram-viewport/article-diagram-viewport.component';
import type { RenderedDiagram } from '@internal/content-web-ui/lib/article/components/article-diagram/utils/mermaid-renderer/mermaid-renderer.utils';

const IMAGE: RenderedDiagram = {
  url: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
  width: 500,
  height: 400,
  description: 'Flux de traitement',
};

function setSize(viewport: HTMLDivElement, clientWidth: number, clientHeight: number): void {
  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, value: clientWidth },
    clientHeight: { configurable: true, value: clientHeight },
    scrollWidth: { configurable: true, value: IMAGE.width },
    scrollHeight: { configurable: true, value: IMAGE.height },
  });
}

describe('ArticleDiagramViewportComponent', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('updates the directions after resizing, scrolling and reaching an edge', async (): Promise<void> => {
    const disconnect: Mock<() => void> = vi.fn();
    let notifyResize: () => void = (): void => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class implements ResizeObserver {
        public readonly observe: ResizeObserver['observe'] = vi.fn();
        public readonly unobserve: ResizeObserver['unobserve'] = vi.fn();
        public readonly disconnect: ResizeObserver['disconnect'] = disconnect;

        public constructor(callback: ResizeObserverCallback) {
          notifyResize = (): void => callback([], this);
        }
      },
    );

    const fixture: ComponentFixture<ArticleDiagramViewportComponent> = TestBed.createComponent(
      ArticleDiagramViewportComponent,
    );
    fixture.componentRef.setInput('image', IMAGE);
    fixture.componentRef.setInput('description', IMAGE.description);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const viewport: HTMLDivElement | null = root.querySelector('[role="region"]');
    if (!viewport) throw new Error('Missing diagram viewport');
    const arrow = (label: string): HTMLButtonElement | null =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    const scrollBy: Mock<(options: ScrollToOptions) => void> = vi.fn();
    Object.defineProperty(viewport, 'scrollBy', { value: scrollBy });

    setSize(viewport, 500, 400);
    notifyResize();
    await fixture.whenStable();
    expect(root.querySelectorAll('button[aria-disabled="true"]')).toHaveLength(4);
    expect(viewport.hasAttribute('tabindex')).toBe(false);

    setSize(viewport, 200, 160);
    notifyResize();
    await fixture.whenStable();
    expect(viewport.getAttribute('tabindex')).toBe('0');
    expect(viewport.getAttribute('aria-label')).toBe(IMAGE.description);
    expect(arrow('Vers le haut')?.getAttribute('aria-disabled')).toBe('true');
    expect(arrow('Vers la gauche')?.getAttribute('aria-disabled')).toBe('true');
    expect(arrow('Vers la droite')?.getAttribute('aria-disabled')).toBe('false');
    expect(arrow('Vers le bas')?.getAttribute('aria-disabled')).toBe('false');
    arrow('Vers la droite')?.click();
    arrow('Vers le bas')?.click();
    expect(scrollBy).toHaveBeenNthCalledWith(1, { left: 110, top: 0 });
    expect(scrollBy).toHaveBeenNthCalledWith(2, { left: 0, top: 88 });

    viewport.scrollLeft = 300;
    viewport.scrollTop = 240;
    viewport.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(arrow('Vers la droite')?.getAttribute('aria-disabled')).toBe('true');
    expect(arrow('Vers le bas')?.getAttribute('aria-disabled')).toBe('true');
    arrow('Vers la droite')?.click();
    expect(scrollBy).toHaveBeenCalledTimes(2);
    arrow('Vers la gauche')?.click();
    arrow('Vers le haut')?.click();
    expect(scrollBy).toHaveBeenNthCalledWith(3, { left: -110, top: 0 });
    expect(scrollBy).toHaveBeenNthCalledWith(4, { left: 0, top: -88 });

    setSize(viewport, 500, 400);
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    notifyResize();
    await fixture.whenStable();
    expect(root.querySelectorAll('button[aria-disabled="true"]')).toHaveLength(4);
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
