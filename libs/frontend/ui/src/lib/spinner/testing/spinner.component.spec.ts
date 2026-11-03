import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SpinnerComponent } from '@internal/ui/lib/spinner/spinner.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies a mutable accessible label to exercise both announced and decorative spinner states.
 */
@Component({
  imports: [SpinnerComponent],
  template: `<ui-spinner [label]="label()" size="lg" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Loading text bound to the spinner and cleared by the decorative-state case.
   *
   * @type {WritableSignal<string>}
   */
  public readonly label: WritableSignal<string> = signal<string>('Chargement');
  // #endregion
}

describe('SpinnerComponent', (): void => {
  it('is a status with a hidden label by default', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const spinner: HTMLElement = fixture.nativeElement.querySelector('ui-spinner');
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.querySelector('.sr-only')?.textContent).toBe('Chargement');
    expect(spinner.className).toContain('size-6');
    expect(spinner.className).toContain('motion-reduce:animate-none');
  });

  it('turns decorative without a label', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set('');
    await fixture.whenStable();
    const spinner: HTMLElement = fixture.nativeElement.querySelector('ui-spinner');
    expect(spinner.hasAttribute('role')).toBe(false);
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
    expect(spinner.querySelector('.sr-only')).toBeNull();
  });
});
