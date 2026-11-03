import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { BUTTON_GROUP_IMPORTS } from '@internal/ui/lib/button-group/constants/button-group.imports';
import type { ButtonGroupOrientation } from '@internal/ui/lib/button-group/constants/button-group.variants';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Provides a signal-controlled button group with two buttons and a separator for orientation assertions.
 */
@Component({
  imports: [BUTTON_GROUP_IMPORTS, ButtonDirective],
  template: `<div uiButtonGroup aria-label="Affichage" [orientation]="orientation()">
    <button uiBtn variant="secondary">Grille</button>
    <div uiButtonGroupSeparator></div>
    <button uiBtn variant="secondary">Liste</button>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Group axis controlled by the test to verify the directive updates its layout and metadata.
   *
   * @type {WritableSignal<ButtonGroupOrientation>}
   */
  public readonly orientation: WritableSignal<ButtonGroupOrientation> =
    signal<ButtonGroupOrientation>('horizontal');
  // #endregion
}

describe('ButtonGroupDirective', () => {
  it('exposes a labelled group with its orientation', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const group: HTMLElement = fixture.nativeElement.querySelector('[data-slot="button-group"]');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Affichage');
    expect(group.dataset['orientation']).toBe('horizontal');
    expect(group.className).toContain('[&>*:not(:first-child)]:rounded-l-none');

    fixture.componentInstance.orientation.set('vertical');
    await fixture.whenStable();
    expect(group.dataset['orientation']).toBe('vertical');
    expect(group.className).toContain('flex-col');
    expect(group.className).not.toContain('[&>*:not(:first-child)]:rounded-l-none');
  });

  it('keeps the separator out of the accessibility tree', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const separator: HTMLElement = fixture.nativeElement.querySelector(
      '[data-slot="button-group-separator"]',
    );
    expect(separator.getAttribute('role')).toBe('none');
    expect(separator.className).toContain('w-px');
  });
});
