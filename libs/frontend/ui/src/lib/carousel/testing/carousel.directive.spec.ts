import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Mock } from 'vitest';
import {
  CarouselContentDirective,
  CarouselDirective,
  CarouselItemDirective,
  CarouselNextComponent,
  CarouselPreviousComponent,
} from '@internal/ui/lib/carousel/carousel.directive';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Fixture with three slides and both navigation controls for carousel integration tests.
 */
@Component({
  imports: [
    CarouselDirective,
    CarouselContentDirective,
    CarouselItemDirective,
    CarouselPreviousComponent,
    CarouselNextComponent,
  ],
  template: `<div uiCarousel label="Projects">
    <div uiCarouselContent>
      @for (slide of slides; track slide) {
        <div uiCarouselItem>{{ slide }}</div>
      }
    </div>
    <ui-carousel-previous />
    <ui-carousel-next />
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property slides
   * @readonly
   *
   * @description
   * Stable slide labels used to check generated position names and navigation bounds.
   *
   * @type {string[]}
   */
  public readonly slides: string[] = ['A', 'B', 'C'];
  // #endregion
}

/**
 * Function layout
 *
 * @description
 * Stubs viewport dimensions and slide rectangles because jsdom does not calculate layout, then sets the initial horizontal scroll offset used by navigation assertions.
 *
 * @param {HTMLElement} viewport - Carousel viewport whose scroll metrics are stubbed.
 * @param {HTMLElement[]} items - Slides positioned at 300-pixel intervals.
 * @param {number} scrollLeft - Initial viewport scroll offset.
 *
 * @returns {void}
 */
function layout(viewport: HTMLElement, items: HTMLElement[], scrollLeft: number): void {
  Object.defineProperty(viewport, 'scrollLeft', { configurable: true, value: scrollLeft });
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 900 });
  viewport.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 300, 200);
  items.forEach((item, index) => {
    item.getBoundingClientRect = (): DOMRect => new DOMRect(index * 300 - scrollLeft, 0, 300, 200);
  });
}

/**
 * Type ScrollBy
 *
 * @description
 * Keeps both native scrolling call signatures available to the scroll spy.
 */
type ScrollBy = (...args: [options?: ScrollToOptions | undefined] | [x: number, y: number]) => void;

/**
 * Function setup
 *
 * @description
 * Creates a stable fixture, stubs the viewport and slide geometry, dispatches the initial scroll event, and exposes the DOM controls and scroll spy.
 *
 * @param {number} scrollLeft - Initial viewport scroll offset passed to the geometry stub.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; root: HTMLElement; items: HTMLElement[]; scrollBy: Mock<ScrollBy>; prev: HTMLButtonElement | undefined; next: HTMLButtonElement | undefined }>} Stable fixture, controls and scroll spy.
 */
async function setup(scrollLeft: number): Promise<{
  fixture: ComponentFixture<HostComponent>;
  root: HTMLElement;
  items: HTMLElement[];
  scrollBy: Mock<ScrollBy>;
  prev: HTMLButtonElement | undefined;
  next: HTMLButtonElement | undefined;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const root: HTMLElement = element.querySelector<HTMLElement>('[uiCarousel]') as HTMLElement;
  const viewport: HTMLElement = element.querySelector<HTMLElement>(
    '[uiCarouselContent]',
  ) as HTMLElement;
  const items: HTMLElement[] = Array.from(
    element.querySelectorAll<HTMLElement>('[uiCarouselItem]'),
  );
  const scrollBy: Mock<ScrollBy> = vi.fn<ScrollBy>();
  viewport.scrollBy = scrollBy;
  layout(viewport, items, scrollLeft);
  viewport.dispatchEvent(new Event('scroll'));
  await fixture.whenStable();
  const [prev, next] = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
  return { fixture, root, items, scrollBy, prev, next };
}

describe('Carousel', () => {
  it('exposes the carousel and slide roles with default slide labels', async () => {
    const { root, items, prev, next } = await setup(0);
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-roledescription')).toBe('carousel');
    expect(root.getAttribute('aria-label')).toBe('Projects');
    expect(items[1]?.getAttribute('aria-roledescription')).toBe('slide');
    expect(items[1]?.getAttribute('aria-label')).toBe('2 sur 3');
    expect(prev?.getAttribute('aria-label')).toBe('Diapositive précédente');
    expect(next?.getAttribute('aria-label')).toBe('Diapositive suivante');
  });

  it('disables the buttons at the ends', async () => {
    const start: Awaited<ReturnType<typeof setup>> = await setup(0);
    expect(start.prev?.disabled).toBe(true);
    expect(start.next?.disabled).toBe(false);
    const end: Awaited<ReturnType<typeof setup>> = await setup(600);
    expect(end.prev?.disabled).toBe(false);
    expect(end.next?.disabled).toBe(true);
  });

  it('moves by one slide with the buttons and the arrow keys', async () => {
    const { root, scrollBy, prev, next } = await setup(300);
    next?.click();
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
    prev?.click();
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -300, behavior: 'smooth' });
    const event: KeyboardEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      cancelable: true,
    });
    root.dispatchEvent(event);
    expect(scrollBy).toHaveBeenCalledTimes(3);
    expect(event.defaultPrevented).toBe(true);
  });
});
