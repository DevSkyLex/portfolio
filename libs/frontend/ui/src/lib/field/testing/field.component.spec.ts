import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { type FieldTree, form, FormField, required } from '@angular/forms/signals';
import { FieldComponent } from '@internal/ui/lib/field/field.component';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
import { InputOtpComponent } from '@internal/ui/lib/input-otp/input-otp.component';
import type { InputSize } from '@internal/ui/lib/input/constants/input.variants';
import { TextareaDirective } from '@internal/ui/lib/textarea/textarea.directive';

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

/**
 * Class ControlsHostComponent
 * @class ControlsHostComponent
 *
 * @description
 * Test host projecting catalogue controls bound with Signal Forms into fields that share one error,
 * plus a control outside any field.
 */
@Component({
  imports: [FieldComponent, FormField, InputDirective, InputOtpComponent, TextareaDirective],
  template: `
    <ui-field label="Nom" controlId="name" hint="Votre nom." [size]="size()" [error]="error()">
      <input uiInput id="name" [formField]="model.name" />
    </ui-field>
    <ui-field label="Message" controlId="message" [error]="error()">
      <textarea uiTextarea id="message" [formField]="model.message"></textarea>
    </ui-field>
    <ui-field label="Code" controlId="code" [error]="error()">
      <ui-input-otp controlId="code" ariaLabel="Code" [formField]="model.code" />
    </ui-field>
    <input uiInput id="outside" [attr.aria-invalid]="outside() ? 'true' : null" />
  `,
})
class ControlsHostComponent {
  // #region Properties
  /**
   * Property error
   * @readonly
   *
   * @description
   * Message shown by every field of the host.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property size
   * @readonly
   *
   * @description
   * Size of the first field.
   *
   * @type {WritableSignal<InputSize>}
   */
  public readonly size: WritableSignal<InputSize> = signal<InputSize>('md');

  /**
   * Property outside
   * @readonly
   *
   * @description
   * Invalid state bound by the template on the control outside any field.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly outside: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Signal Forms tree of the projected controls; the name is required so that it is invalid from the
   * start, before any message shows.
   *
   * @type {FieldTree<{ name: string; message: string; code: string }>}
   */
  protected readonly model: FieldTree<{ name: string; message: string; code: string }> = form(
    signal({ name: '', message: '', code: '' }),
    (path) => {
      required(path.name);
    },
  );
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

  it('marks its projected Signal Forms controls invalid exactly while it shows an error', async () => {
    const fixture: ComponentFixture<ControlsHostComponent> =
      TestBed.createComponent(ControlsHostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const invalid = (id: string): string | null =>
      root.querySelector(`#${id}`)?.getAttribute('aria-invalid') ?? null;
    // A required, empty name is invalid for Signal Forms, but no message shows yet.
    expect(['name', 'message', 'code'].map(invalid)).toEqual([null, null, null]);

    fixture.componentInstance.error.set('Corrigez ce champ.');
    await fixture.whenStable();
    expect(['name', 'message', 'code'].map(invalid)).toEqual(['true', 'true', 'true']);
    expect(root.querySelector('#name')?.className).toContain(
      'aria-invalid:not-focus:border-danger',
    );

    fixture.componentInstance.error.set(null);
    await fixture.whenStable();
    expect(['name', 'message', 'code'].map(invalid)).toEqual([null, null, null]);
  });

  it('leaves a control outside any field to its own aria-invalid binding', async () => {
    const fixture: ComponentFixture<ControlsHostComponent> =
      TestBed.createComponent(ControlsHostComponent);
    fixture.componentInstance.outside.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#outside')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('sets the dense type at size sm: 13 px label, 12 px hint and error', async () => {
    const fixture: ComponentFixture<ControlsHostComponent> =
      TestBed.createComponent(ControlsHostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('label[for="name"]')?.className).toContain('text-[15px]/5');
    expect(root.querySelector('#name-hint')?.className).toContain('text-sm');

    fixture.componentInstance.size.set('sm');
    await fixture.whenStable();
    expect(root.querySelector('label[for="name"]')?.className).toContain('text-[13px]/5');
    expect(root.querySelector('#name-hint')?.className).toContain('text-[12px]/4');
    fixture.componentInstance.error.set('Corrigez ce champ.');
    await fixture.whenStable();
    expect(root.querySelector('#name-error')?.className).toContain('text-[12px]/4');
  });
});
