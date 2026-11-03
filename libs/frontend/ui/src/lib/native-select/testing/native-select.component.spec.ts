import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type FieldTree, FormField, form } from '@angular/forms/signals';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
import { NativeSelectComponent } from '@internal/ui/lib/native-select/native-select.component';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a form-bound native select inside the wrapper for projection and selection assertions.
 */
@Component({
  imports: [NativeSelectComponent, InputDirective, FormField],
  template: `<ui-native-select class="max-w-xs">
    <select uiInput aria-label="Subject" [formField]="contact.subject">
      <option value="job">Job</option>
      <option value="other">Other</option>
    </select>
  </ui-native-select>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Signal model backing the selected contact subject in the test form.
   *
   * @type {WritableSignal<{ subject: string }>}
   */
  public readonly model: WritableSignal<{ subject: string }> = signal<{ subject: string }>({
    subject: 'job',
  });

  /**
   * Property contact
   * @readonly
   *
   * @description
   * Signal form exposing the subject field to the projected select control.
   *
   * @type {FieldTree<{ subject: string }>}
   */
  public readonly contact: FieldTree<{ subject: string }, string | number, 'writable'> = form(
    this.model,
  );
  // #endregion
}

describe('NativeSelectComponent', (): void => {
  it('projects the native select next to a decorative chevron', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement.querySelector('ui-native-select');
    const select: HTMLSelectElement = host.querySelector('select') as HTMLSelectElement;
    expect(host.getAttribute('data-slot')).toBe('native-select');
    expect(host.className).toContain('max-w-xs');
    expect(select.className).toContain('appearance-none');
    expect(host.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');

    select.value = 'other';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.model().subject).toBe('other');
  });
});
