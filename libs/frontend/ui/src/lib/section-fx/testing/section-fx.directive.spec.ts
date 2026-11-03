import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionFxDirective } from '@internal/ui/lib/section-fx/section-fx.directive';
import {
  sectionProgress,
  smoothstep,
} from '@internal/ui/lib/section-fx/utils/section-fx/section-fx.utils';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Minimal section host used to observe the section effect's scroll-linked state.
 */
@Component({
  imports: [SectionFxDirective],
  template: `<section uiSectionFx></section>`,
})
class HostComponent {}

describe('section transitions', (): void => {
  it('smooths and clamps the progress', (): void => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(2)).toBe(1);
  });

  it('enters while the top crosses the bottom 55 % of the screen', (): void => {
    expect(sectionProgress({ top: 900, bottom: 1800 }, 900).in).toBe(0);
    expect(sectionProgress({ top: 900 - 0.55 * 900, bottom: 1400 }, 900).in).toBeCloseTo(1);
    expect(sectionProgress({ top: 0, bottom: 900 }, 900).in).toBe(1);
  });

  it('leaves while the bottom rises above 40 % of the screen', (): void => {
    expect(sectionProgress({ top: -400, bottom: 360 }, 900).out).toBe(0);
    expect(sectionProgress({ top: -800, bottom: 180 }, 900).out).toBeCloseTo(0.5);
    expect(sectionProgress({ top: -900, bottom: 0 }, 900).out).toBe(1);
  });
});

describe('SectionFxDirective', (): void => {
  let height: number;

  beforeEach((): void => {
    height = 6000;
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(
      (): number => height,
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: window.innerHeight,
    } as DOMRect);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('drives --in and --out while the page scrolls, and lets go when it no longer does', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const section: HTMLElement = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.hasAttribute('data-secfx')).toBe(true);
    expect(section.style.getPropertyValue('--in')).toBe('1.000');
    expect(section.style.getPropertyValue('--out')).toBe('0.000');
    height = window.innerHeight;
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve: (value: unknown) => void): number =>
      requestAnimationFrame(resolve),
    );
    expect(section.hasAttribute('data-secfx')).toBe(false);
    expect(section.style.getPropertyValue('--in')).toBe('');
    fixture.destroy();
  });

  it('stays put with reduced motion', async (): Promise<void> => {
    vi.stubGlobal('matchMedia', (): { matches: boolean } => ({ matches: true }));
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section').hasAttribute('data-secfx')).toBe(false);
  });
});
