import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type FieldTree, FormField, form } from '@angular/forms/signals';
import {
  RadioGroupDirective,
  RadioGroupItemComponent,
} from '@internal/ui/lib/radio-group/radio-group.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds three radio options, including one disabled option, to a Signal Forms model.
 */
@Component({
  imports: [RadioGroupDirective, RadioGroupItemComponent, FormField],
  template: `<div uiRadioGroup aria-label="Plan" [formField]="plans.plan">
    <ui-radio-group-item value="free">Free</ui-radio-group-item>
    <ui-radio-group-item value="pro" [disabled]="true">Pro</ui-radio-group-item>
    <ui-radio-group-item value="team">Team</ui-radio-group-item>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Writable form value inspected after radio selection changes.
   *
   * @type {WritableSignal<{ plan: string | null }>}
   */
  public readonly model: WritableSignal<{ plan: string | null }> = signal<{ plan: string | null }>({
    plan: null,
  });

  /**
   * Property plans
   * @readonly
   *
   * @description
   * Signal Forms model bound to the fixture's radio group.
   *
   * @type {ReturnType<typeof form>}
   */
  public readonly plans: FieldTree<{ plan: string | null }, string | number, 'writable'> = form(
    this.model,
  );
  // #endregion
}

/**
 * Constant KEY_CODES
 *
 * @description
 * Legacy key codes supplied because the CDK key manager reads `keyCode` as well as `key`.
 *
 * @type {Record<string, number>}
 */
const KEY_CODES: Record<string, number> = {
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
};

/**
 * Function keydown
 *
 * @description
 * Dispatches a bubbling, cancelable keyboard event with the legacy key code expected by the CDK.
 *
 * @param {HTMLElement} target - Element receiving the keyboard event.
 * @param {string} key - Keyboard key name to dispatch.
 * @returns {void} Dispatches the event to the target.
 */
function keydown(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      keyCode: KEY_CODES[key] ?? 0,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('RadioGroupDirective', (): void => {
  /**
   * Function setup
   *
   * @description
   * Creates a stable fixture and returns its three radio controls in DOM order.
   *
   * @returns Fixture and typed radio control tuple.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    radios: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const radios: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement] = Array.from(
      fixture.nativeElement.querySelectorAll('[role="radio"]'),
    ) as [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
    return { fixture, radios };
  }

  it('keeps a single tab stop on the first enabled option until one is checked', async (): Promise<void> => {
    const { fixture, radios } = await setup();
    expect(fixture.nativeElement.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(radios.map((radio: HTMLButtonElement): number => radio.tabIndex)).toEqual([0, -1, -1]);

    radios[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().plan).toBe('team');
    expect(
      radios.map((radio: HTMLButtonElement): string | null => radio.getAttribute('aria-checked')),
    ).toEqual(['false', 'false', 'true']);
    expect(radios.map((radio: HTMLButtonElement): number => radio.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('moves the focus and the selection with the arrow keys, skipping disabled options', async (): Promise<void> => {
    const { fixture, radios } = await setup();
    radios[0].focus();
    keydown(radios[0], 'ArrowDown');
    await fixture.whenStable();
    expect(document.activeElement).toBe(radios[2]);
    expect(fixture.componentInstance.model().plan).toBe('team');

    keydown(radios[2], 'ArrowRight');
    await fixture.whenStable();
    expect(document.activeElement).toBe(radios[0]);
    expect(fixture.componentInstance.model().plan).toBe('free');
  });

  it('reflects a value written by the form', async (): Promise<void> => {
    const { fixture, radios } = await setup();
    fixture.componentInstance.model.set({ plan: 'free' });
    await fixture.whenStable();
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
  });
});
