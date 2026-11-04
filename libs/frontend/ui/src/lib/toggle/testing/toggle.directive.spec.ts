import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ToggleDirective } from '@internal/ui/lib/toggle/toggle.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a native button's pressed state to a signal so the toggle's model and accessibility state can be observed.
 */
@Component({
  imports: [ToggleDirective],
  template: `<button uiToggle variant="outline" size="sm" aria-label="Bold" [(pressed)]="bold">
    B
  </button>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property bold
   * @readonly
   *
   * @description
   * Host model bound to the toggle's pressed state and updated after activation.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly bold: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion
}

describe('ToggleDirective', (): void => {
  it('toggles its pressed state and exposes it with aria-pressed', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.className).toContain('border-border');
    expect(button.className).toContain('h-9');

    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.bold()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});
