import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ToggleGroupDirective,
  ToggleGroupItemDirective,
} from '@internal/ui/lib/toggle-group/toggle-group.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host binding the toggle group mode and selected values to writable signals.
 */
@Component({
  imports: [ToggleGroupDirective, ToggleGroupItemDirective],
  template: `<div
    uiToggleGroup
    aria-label="Align"
    [type]="type()"
    [required]="required()"
    [(value)]="value"
  >
    <button uiToggleGroupItem value="left">L</button>
    <button uiToggleGroupItem value="center">C</button>
    <button uiToggleGroupItem value="right">R</button>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Selection mode bound to the group, allowing tests to exercise both single and multiple selection.
   *
   * @type {WritableSignal<'single' | 'multiple'>}
   */
  public readonly type: WritableSignal<'single' | 'multiple'> = signal<'single' | 'multiple'>(
    'single',
  );

  public readonly required: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Selected group value, either one string, a list of strings, or no current selection.
   *
   * @type {WritableSignal<string | readonly string[] | null>}
   */
  public readonly value: WritableSignal<string | readonly string[] | null> = signal<
    string | readonly string[] | null
  >(null);
  // #endregion
}

/**
 * Constant KEY_CODES
 * @constant
 *
 * @description
 * Legacy key codes supplied alongside key names because the CDK key manager reads `keyCode` in this test environment.
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
 * @function keydown
 *
 * @description
 * Dispatches a bubbling, cancelable keyboard event with both modern key and legacy key-code values.
 *
 * @param {HTMLElement} target - Element receiving the keyboard event.
 * @param {string} key - Keyboard key name used to populate the event.
 * @returns {void}
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

describe('ToggleGroupDirective', (): void => {
  /**
   * Function setup
   * @function setup
   *
   * @description
   * Creates the toggle group host, waits for it to stabilize and returns the three rendered buttons.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; buttons: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement] }>}
   * Stable fixture and ordered button handles for keyboard and selection assertions.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    buttons: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const buttons: [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
    return { fixture, buttons };
  }

  it('keeps one pressed value in single mode and lets it be cleared', async (): Promise<void> => {
    const { fixture, buttons } = await setup();
    buttons[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('center');
    expect(
      buttons.map((button: HTMLButtonElement): string | null =>
        button.getAttribute('aria-pressed'),
      ),
    ).toEqual(['false', 'true', 'false']);
    buttons[2].click();
    expect(fixture.componentInstance.value()).toBe('right');
    buttons[2].click();
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('never clears a required single selection', async (): Promise<void> => {
    const { fixture, buttons } = await setup();
    fixture.componentInstance.required.set(true);
    await fixture.whenStable();
    buttons[0].click();
    buttons[0].click();
    expect(fixture.componentInstance.value()).toBe('left');
    buttons[1].click();
    expect(fixture.componentInstance.value()).toBe('center');
  });

  it('collects the pressed values in multiple mode', async (): Promise<void> => {
    const { fixture, buttons } = await setup();
    fixture.componentInstance.type.set('multiple');
    await fixture.whenStable();
    buttons[0].click();
    buttons[2].click();
    expect(fixture.componentInstance.value()).toEqual(['left', 'right']);
    buttons[0].click();
    expect(fixture.componentInstance.value()).toEqual(['right']);
  });

  it('roves the single tab stop with the arrow keys without pressing', async (): Promise<void> => {
    const { fixture, buttons } = await setup();
    expect(buttons.map((button: HTMLButtonElement): number => button.tabIndex)).toEqual([
      0, -1, -1,
    ]);
    buttons[0].focus();
    keydown(buttons[0], 'ArrowLeft');
    await fixture.whenStable();
    expect(document.activeElement).toBe(buttons[2]);
    expect(buttons.map((button: HTMLButtonElement): number => button.tabIndex)).toEqual([
      -1, -1, 0,
    ]);
    keydown(buttons[2], 'Home');
    expect(document.activeElement).toBe(buttons[0]);
    expect(fixture.componentInstance.value()).toBeNull();
  });
});
