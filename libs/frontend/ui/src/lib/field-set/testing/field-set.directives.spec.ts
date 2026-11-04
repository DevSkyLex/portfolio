import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  FieldDescriptionDirective,
  FieldErrorDirective,
  FieldGroupDirective,
  FieldLegendDirective,
  FieldSeparatorDirective,
  FieldSetDirective,
} from '@internal/ui/lib/field-set/field-set.directives';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture composes a disabled fieldset with legend, description, grouped controls, error and
 * separator directives.
 */
@Component({
  imports: [
    FieldSetDirective,
    FieldLegendDirective,
    FieldGroupDirective,
    FieldDescriptionDirective,
    FieldErrorDirective,
    FieldSeparatorDirective,
  ],
  template: `<fieldset uiFieldSet disabled>
    <legend uiFieldLegend variant="label">Address</legend>
    <p uiFieldDescription>Where we ship.</p>
    <div uiFieldGroup>
      <input aria-label="Street" />
      <div uiFieldSeparator>or</div>
      <p uiFieldError>Required</p>
    </div>
  </fieldset>`,
})
class HostComponent {}

describe('FieldSetDirective', () => {
  it('groups fields under a legend with announced errors and a separator', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    /**
     * Function find
     *
     * @description
     * Selects a rendered fixture element by CSS selector for the directive assertions.
     *
     * @param {string} selector - Selector queried inside the test host.
     * @returns {HTMLElement} Cast result; no runtime check occurs, so a missing selector returns null.
     */
    const find = (selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
    const fieldset: HTMLFieldSetElement = find('fieldset') as HTMLFieldSetElement;
    expect(fieldset.getAttribute('data-slot')).toBe('field-set');
    expect(find('input').matches(':disabled')).toBe(true);
    expect(find('legend').className).toContain('text-sm');
    expect(find('[data-slot="field-description"]').className).toContain('text-fg-faint');
    expect(find('[data-slot="field-error"]').getAttribute('role')).toBe('alert');
    const separator: HTMLElement = find('[data-slot="field-separator"]');
    expect(separator.getAttribute('role')).toBe('separator');
    expect(find('[data-slot="field-group"]').className).toContain('gap-6');
  });
});
