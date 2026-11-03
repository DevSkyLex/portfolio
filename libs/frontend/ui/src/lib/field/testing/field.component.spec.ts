import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FieldComponent } from '@internal/ui/lib/field/field.component';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test host binds a mutable validation message to the field's error input.
 */
@Component({
  imports: [FieldComponent],
  template: `<ui-field label="E-mail" controlId="email" [required]="true" [error]="error()">
    <input id="email" />
  </ui-field>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property error
   * @readonly
   *
   * @description
   * Validation message switched by the test to verify the error and its accessible id.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);
  // #endregion
}

describe('FieldComponent', () => {
  it('links the label to the control and marks required fields', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    expect(label.htmlFor).toBe('email');
    expect(label.querySelector('.text-danger-ink')?.textContent).toBe('*');
  });

  it('shows the error with an id usable by aria-describedby', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.error.set('Invalid address');
    await fixture.whenStable();
    const error: HTMLElement = fixture.nativeElement.querySelector('#email-error');
    expect(error.textContent).toBe('Invalid address');
    expect(error.getAttribute('role')).toBe('alert');
  });
});
