import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, required, type FieldTree } from '@angular/forms/signals';
import {
  InputOtpComponent,
  InputOtpGroupDirective,
  InputOtpSeparatorComponent,
  InputOtpSlotComponent,
} from '@internal/ui/lib/input-otp/input-otp.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a four-character OTP control to a Signal Form model and exposes completion for integration assertions.
 */
@Component({
  imports: [
    InputOtpComponent,
    InputOtpGroupDirective,
    InputOtpSeparatorComponent,
    InputOtpSlotComponent,
    FormField,
  ],
  template: `<ui-input-otp
    [length]="4"
    [formField]="login.code"
    (completed)="completed.set($event)"
  >
    <div uiInputOtpGroup>
      <ui-input-otp-slot [index]="0" />
      <ui-input-otp-slot [index]="1" />
    </div>
    <ui-input-otp-separator />
    <div uiInputOtpGroup>
      <ui-input-otp-slot [index]="2" />
      <ui-input-otp-slot [index]="3" />
    </div>
  </ui-input-otp>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Mutable source model connected to the OTP field through the Signal Forms API.
   *
   * @type {WritableSignal<{ code: string }>}
   */
  public readonly model: WritableSignal<{ code: string }> = signal<{ code: string }>({ code: '' });

  /**
   * Property login
   * @readonly
   *
   * @description
   * Form tree exposing the required `code` field bound to the OTP component.
   *
   * @type {FieldTree<{ code: string }>}
   */
  public readonly login: FieldTree<{ code: string }, string | number, 'writable'> = form(
    this.model,
    (path) => required(path.code),
  );

  /**
   * Property completed
   * @readonly
   *
   * @description
   * Captures the completed code emitted by the host control for assertions.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly completed: WritableSignal<string | null> = signal<string | null>(null);
  // #endregion
}

describe('InputOtpComponent', () => {
  /**
   * Function setup
   *
   * @description
   * Creates the integration host and returns its native input and projected visual slots after Angular stabilizes.
   *
   * @returns {Promise<{ fixture: import('@angular/core/testing').ComponentFixture<HostComponent>, input: HTMLInputElement, slots: HTMLElement[] }>}
   * Stable fixture elements used by each OTP interaction case.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    input: HTMLInputElement;
    slots: HTMLElement[];
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const slots: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('ui-input-otp-slot'),
    );
    return { fixture, input, slots };
  }

  it('is one native input made for one-time codes, with a French default name', async () => {
    const { input, slots } = await setup();
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.maxLength).toBe(4);
    expect(input.getAttribute('aria-label')).toBe('Code à usage unique');
    expect(slots.every((slot) => slot.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('drops rejected characters and draws each one in its slot', async () => {
    const { fixture, input, slots } = await setup();
    input.dispatchEvent(new Event('focus'));
    input.value = '1a2';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(input.value).toBe('12');
    expect(fixture.componentInstance.model().code).toBe('12');
    expect(slots.map((slot) => slot.textContent?.trim())).toEqual(['1', '2', '', '']);
    expect(slots.map((slot) => slot.hasAttribute('data-active'))).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it('accepts a pasted code with separators and reports completion', async () => {
    const { fixture, input } = await setup();
    const paste: ClipboardEvent = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => '98-76 5' },
    });
    input.dispatchEvent(paste);
    await fixture.whenStable();
    expect(paste.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.model().code).toBe('9876');
    expect(fixture.componentInstance.completed()).toBe('9876');
  });

  it('waits for the field to be left before showing an empty required code as invalid', async () => {
    const { fixture, input, slots } = await setup();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(slots[0]?.className).not.toContain('border-danger');
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(slots[0]?.className).toContain('border-danger');
  });
});
