import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type FieldTree, FormField, form } from '@angular/forms/signals';
import { SwitchDirective } from '@internal/ui/lib/switch/switch.directive';
import { switchVariants } from '@internal/ui/lib/switch/constants/switch.variants';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host binds a native labelled switch to a Signal Forms field for checked-state assertions.
 */
@Component({
  imports: [SwitchDirective, FormField],
  template: `<label for="news">News</label>
    <!-- Named by its <label for>, like a native control. -->
    <!-- eslint-disable-next-line @angular-eslint/template/elements-content -->
    <button id="news" uiSwitch size="sm" [formField]="prefs.news"></button>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Backing model whose `news` field is changed by switch interactions.
   *
   * @type {WritableSignal<{ news: boolean }>}
   */
  public readonly model: WritableSignal<{ news: boolean }> = signal<{ news: boolean }>({
    news: false,
  });

  /**
   * Property prefs
   * @readonly
   *
   * @description
   * Signal Form tree bound to the switch under test.
   *
   * @type {FieldTree<{ news: boolean }>}
   */
  public readonly prefs: FieldTree<{ news: boolean }, string | number, 'writable'> = form(
    this.model,
  );
  // #endregion
}

describe('SwitchDirective', (): void => {
  it('takes the 2 px accent focus ring of buttons and links', (): void => {
    const classes: string = switchVariants();
    expect(classes.split(' ')).toEqual(
      expect.arrayContaining(['outline-2', 'focus-visible:outline-accent/55']),
    );
    expect(classes).not.toContain('outline-accent/12');
  });

  it('is a labelled switch that toggles its field', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.className).toContain('w-8');

    fixture.nativeElement.querySelector('label').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().news).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });
});
