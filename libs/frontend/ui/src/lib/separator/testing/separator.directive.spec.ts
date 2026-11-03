import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SeparatorDirective } from '@internal/ui/lib/separator/separator.directive';
import type { SeparatorOrientation } from '@internal/ui/lib/separator/models/separator/separator-orientation.type';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Provides a signal-controlled separator host so its axis and decorative accessibility behavior can be changed in the fixture.
 */
@Component({
  imports: [SeparatorDirective],
  template: `<div uiSeparator [orientation]="orientation()" [decorative]="decorative()"></div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Axis supplied to the directive and changed by the semantic separator case.
   *
   * @type {WritableSignal<SeparatorOrientation>}
   */
  public readonly orientation: WritableSignal<SeparatorOrientation> =
    signal<SeparatorOrientation>('horizontal');

  /**
   * Property decorative
   * @readonly
   *
   * @description
   * Accessibility mode supplied to the directive; true keeps the rule decorative.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly decorative: WritableSignal<boolean> = signal<boolean>(true);
  // #endregion
}

describe('SeparatorDirective', (): void => {
  it('stays out of the accessibility tree when decorative', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const rule: HTMLElement = fixture.nativeElement.querySelector('[data-slot="separator"]');
    expect(rule.getAttribute('role')).toBe('none');
    expect(rule.hasAttribute('aria-orientation')).toBe(false);
    expect(rule.className).toContain('h-px');
  });

  it('becomes a separator with its orientation otherwise', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.decorative.set(false);
    fixture.componentInstance.orientation.set('vertical');
    await fixture.whenStable();
    const rule: HTMLElement = fixture.nativeElement.querySelector('[data-slot="separator"]');
    expect(rule.getAttribute('role')).toBe('separator');
    expect(rule.getAttribute('aria-orientation')).toBe('vertical');
    expect(rule.className).toContain('w-px');
  });
});
