import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressComponent } from '@internal/ui/lib/progress/progress.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Exposes writable value and maximum signals to the progress component fixture.
 */
@Component({
  imports: [ProgressComponent],
  template: `<ui-progress [value]="value()" [max]="max()" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Progress amount changed by the spec to cover determinate and indeterminate states.
   *
   * @type {WritableSignal<number | null>}
   */
  public readonly value: WritableSignal<number | null> = signal<number | null>(40);

  /**
   * Property max
   * @readonly
   *
   * @description
   * Upper progress bound used to verify value clamping.
   *
   * @type {WritableSignal<number>}
   */
  public readonly max: WritableSignal<number> = signal<number>(200);
  // #endregion
}

describe('ProgressComponent', (): void => {
  it('exposes a named progress bar with clamped values', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const bar: HTMLElement = fixture.nativeElement.querySelector('ui-progress');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-label')).toBe('Progression');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('200');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.dataset['state']).toBe('loading');
    const indicator: HTMLElement | null = bar.querySelector<HTMLElement>(
      '[data-slot="progress-indicator"]',
    );
    expect(indicator?.style.transform).toBe('scaleX(0.2)');

    fixture.componentInstance.value.set(500);
    await fixture.whenStable();
    expect(bar.getAttribute('aria-valuenow')).toBe('200');
    expect(bar.dataset['state']).toBe('complete');
  });

  it('leaves aria-valuenow out while indeterminate', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(null);
    await fixture.whenStable();
    const bar: HTMLElement = fixture.nativeElement.querySelector('ui-progress');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.dataset['state']).toBe('indeterminate');
    const indicator: HTMLElement | null = bar.querySelector<HTMLElement>(
      '[data-slot="progress-indicator"]',
    );
    expect(indicator?.className).toContain('animate-[pulse');
  });
});
