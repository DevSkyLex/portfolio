import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollProgressDirective } from '@internal/ui/lib/scroll-progress/scroll-progress.directive';
import {
  pageScrolls,
  scrollEntry,
  scrollProgress,
} from '@internal/ui/lib/scroll-progress/utils/scroll-progress/scroll-progress.utils';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Minimal host exposing one element to the scroll progress directive for browser lifecycle tests.
 */
@Component({
  imports: [ScrollProgressDirective],
  template: `<div uiScrollProgress></div>`,
})
class HostComponent {}

describe('ScrollProgressDirective', (): void => {
  it('measures the crossing of the screen and the entry', (): void => {
    expect(scrollProgress({ top: 900, height: 600 }, 900)).toBe(0);
    expect(scrollProgress({ top: 150, height: 600 }, 900)).toBe(0.5);
    expect(scrollProgress({ top: -600, height: 600 }, 900)).toBe(1);
    expect(scrollEntry({ top: 900 }, 900)).toBe(0);
    expect(scrollEntry({ top: 900 - 0.45 * 900 }, 900)).toBeCloseTo(1);
    expect(scrollEntry({ top: -100 }, 900)).toBe(1);
  });

  it('only drives a page that really scrolls', (): void => {
    expect(pageScrolls(900, 0)).toBe(false);
    expect(pageScrolls(900, 1200)).toBe(false);
    expect(pageScrolls(900, 3000)).toBe(true);
  });

  describe('in a page', (): void => {
    let height: number;

    beforeEach((): void => {
      height = 6000;
      vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(
        (): number => height,
      );
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top: window.innerHeight,
        height: 400,
      } as DOMRect);
    });

    afterEach((): void => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    const render = async (): Promise<HTMLElement> => {
      const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
      await fixture.whenStable();
      return fixture.nativeElement.querySelector('div') as HTMLElement;
    };

    it('sets --p and --e on the element, and removes them when the page stops scrolling', async (): Promise<void> => {
      const element: HTMLElement = await render();
      expect(element.style.getPropertyValue('--p')).toBe('0.0000');
      expect(element.style.getPropertyValue('--e')).toBe('0.0000');
      height = 100;
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve: (value: unknown) => void): number =>
        requestAnimationFrame(resolve),
      );
      expect(element.style.getPropertyValue('--p')).toBe('');
    });

    it('leaves the resting state with reduced motion', async (): Promise<void> => {
      vi.stubGlobal('matchMedia', (): { matches: boolean } => ({ matches: true }));
      const element: HTMLElement = await render();
      expect(element.style.getPropertyValue('--p')).toBe('');
    });
  });
});
