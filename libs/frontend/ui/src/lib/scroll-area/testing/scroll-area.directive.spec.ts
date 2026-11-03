import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollAreaDirective } from '@internal/ui/lib/scroll-area/scroll-area.directive';
import type { ScrollAreaOrientation } from '@internal/ui/lib/scroll-area/constants/scroll-area.variants';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host binding a labelled scroll area to configurable label and orientation signals.
 */
@Component({
  imports: [ScrollAreaDirective],
  template: `<div uiScrollArea [label]="label()" [orientation]="orientation()" class="h-72">
    Long content
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name supplied to the scroll area, or undefined for the unnamed-region case.
   *
   * @type {WritableSignal<string | undefined>}
   */
  public readonly label: WritableSignal<string | undefined> = signal<string | undefined>(
    'Changelog',
  );

  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Scroll axis passed to the directive in each rendering scenario.
   *
   * @type {WritableSignal<ScrollAreaOrientation>}
   */
  public readonly orientation: WritableSignal<ScrollAreaOrientation> =
    signal<ScrollAreaOrientation>('vertical');
  // #endregion
}

describe('ScrollAreaDirective', (): void => {
  it('is a focusable, labelled region with the themed scrollbar', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const area: HTMLElement = fixture.nativeElement.querySelector('[uiScrollArea]');
    expect(area.tabIndex).toBe(0);
    expect(area.getAttribute('role')).toBe('region');
    expect(area.getAttribute('aria-label')).toBe('Changelog');
    expect(area.className).toContain('[scrollbar-width:thin]');
    expect(area.className).toContain('overflow-y-auto');
    expect(area.className).toContain('h-72');
  });

  it('drops the region role without a name and scrolls horizontally on demand', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set(undefined);
    fixture.componentInstance.orientation.set('horizontal');
    await fixture.whenStable();
    const area: HTMLElement = fixture.nativeElement.querySelector('[uiScrollArea]');
    expect(area.hasAttribute('role')).toBe(false);
    expect(area.className).toContain('overflow-x-auto');
    expect(area.className).not.toContain('overflow-y-auto');
  });
});
