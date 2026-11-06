import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AspectRatioDirective } from '@internal/ui/lib/aspect-ratio/aspect-ratio.directive';
import { parseAspectRatio } from '@internal/ui/lib/aspect-ratio/utils/aspect-ratio/aspect-ratio.utils';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host that binds a mutable ratio to the directive and renders an image child.
 */
@Component({
  imports: [AspectRatioDirective],
  template: `<div uiAspectRatio [ratio]="ratio()"><img src="cover.png" alt="" /></div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property ratio
   * @readonly
   *
   * @description
   * Initial wide ratio changed by the host-binding test to verify reactive style updates.
   *
   * @type {WritableSignal<number | string>}
   */
  public readonly ratio: WritableSignal<string | number> = signal<number | string>('16/9');
  // #endregion
}

/** Reads both numeric and width/height CSSOM serializations of the same ratio. */
function hostAspectRatio(element: HTMLElement): number {
  const [width, height = '1']: string[] = element.style.aspectRatio.split('/');
  return Number(width) / Number(height);
}

describe('AspectRatioDirective', () => {
  it('reads numbers and width/height strings', () => {
    expect(parseAspectRatio('16/9')).toBeCloseTo(16 / 9);
    expect(parseAspectRatio('4 / 3')).toBeCloseTo(4 / 3);
    expect(parseAspectRatio(2)).toBe(2);
    expect(parseAspectRatio('abc')).toBe(1);
    expect(parseAspectRatio(0)).toBe(1);
  });

  it('sets the aspect ratio on the host and follows the input', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const box: HTMLElement = fixture.nativeElement.querySelector('[data-slot="aspect-ratio"]');
    expect(hostAspectRatio(box)).toBeCloseTo(16 / 9);
    fixture.componentInstance.ratio.set(1);
    await fixture.whenStable();
    expect(hostAspectRatio(box)).toBe(1);
  });
});
