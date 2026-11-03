import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, disabled, form, type FieldTree } from '@angular/forms/signals';
import { CheckboxComponent } from '@internal/ui/lib/checkbox/checkbox.component';

/**
 * Component FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds a checkbox to a Signal Forms field and toggles the field's disabled state through a host
 * signal.
 */
@Component({
  imports: [CheckboxComponent, FormField],
  template: `<label for="terms">Terms</label>
    <ui-checkbox controlId="terms" [formField]="terms.accepted" />`,
})
class FormHostComponent {
  // #region Properties
  /**
   * Property locked
   * @readonly
   *
   * @description
   * Signal controlling whether the form field is disabled.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly locked: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property model
   * @readonly
   *
   * @description
   * State backing the form model value checked by the synchronization test.
   *
   * @type {WritableSignal<{ accepted: boolean }>}
   */
  public readonly model: WritableSignal<{ accepted: boolean }> = signal<{ accepted: boolean }>({
    accepted: false,
  });

  /**
   * Property terms
   * @readonly
   *
   * @description
   * Signal Forms group whose accepted field is bound to the rendered checkbox.
   */
  public readonly terms: FieldTree<{ accepted: boolean }, string | number, 'writable'> = form(
    this.model,
    (path) => {
      disabled(path.accepted, () => this.locked());
    },
  );
  // #endregion
}

/**
 * Component MixedHostComponent
 * @class MixedHostComponent
 *
 * @description
 * Renders a checkbox with a mutable checked value and an initial mixed state to verify native
 * indeterminate behavior.
 */
@Component({
  imports: [CheckboxComponent],
  template: `<ui-checkbox ariaLabel="All" [(checked)]="checked" [(indeterminate)]="mixed" />`,
})
class MixedHostComponent {
  // #region Properties
  /**
   * Property checked
   * @readonly
   *
   * @description
   * Checked value updated by the user's native input interaction.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly checked: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property mixed
   * @readonly
   *
   * @description
   * Initial indeterminate state expected to clear when the input is toggled.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly mixed: WritableSignal<boolean> = signal<boolean>(true);
  // #endregion
}

describe('CheckboxComponent', () => {
  it('syncs with a Signal Forms field, both ways, including the disabled state', async () => {
    const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.id).toBe('terms');

    fixture.nativeElement.querySelector('label').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().accepted).toBe(true);
    expect(fixture.nativeElement.querySelector('ng-icon')).not.toBeNull();

    fixture.componentInstance.model.set({ accepted: false });
    fixture.componentInstance.locked.set(true);
    await fixture.whenStable();
    expect(input.checked).toBe(false);
    expect(input.disabled).toBe(true);
  });

  it('exposes the mixed state and clears it on toggle', async () => {
    const fixture: ComponentFixture<MixedHostComponent> =
      TestBed.createComponent(MixedHostComponent);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute('aria-label')).toBe('All');

    input.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.mixed()).toBe(false);
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(input.indeterminate).toBe(false);
  });
});
