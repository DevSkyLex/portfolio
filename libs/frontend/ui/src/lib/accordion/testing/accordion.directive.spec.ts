import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  AccordionContentComponent,
  AccordionDirective,
  AccordionIconComponent,
  AccordionItemDirective,
  AccordionTriggerDirective,
} from '@internal/ui/lib/accordion/accordion.directive';
import type { AccordionType } from '@internal/ui/lib/accordion/models/accordion/accordion-type.type';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host exposes selection settings and four ordered items, with the third item disabled, to
 * exercise ARIA state and keyboard navigation.
 */
@Component({
  imports: [
    AccordionDirective,
    AccordionItemDirective,
    AccordionTriggerDirective,
    AccordionIconComponent,
    AccordionContentComponent,
  ],
  template: `<div uiAccordion [type]="type()" [collapsible]="collapsible()" [(value)]="open">
    @for (item of items; track item) {
      <div uiAccordionItem [value]="item" [disabled]="item === 'c'">
        <h3>
          <button uiAccordionTrigger>{{ item }} <ui-accordion-icon /></button>
        </h3>
        <ui-accordion-content>Body {{ item }}</ui-accordion-content>
      </div>
    }
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * Ordered item identifiers used by the rendered accordion fixture.
   *
   * @type {string[]}
   */
  public readonly items: string[] = ['a', 'b', 'c', 'd'];

  /**
   * Property type
   * @readonly
   *
   * @description
   * Selection mode bound to the accordion root.
   *
   * @type {WritableSignal<AccordionType>}
   */
  public readonly type: WritableSignal<AccordionType> = signal<AccordionType>('single');

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * Controls whether the selected item can close when activated again.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly collapsible: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property open
   * @readonly
   *
   * @description
   * Two-way-bound selected item identifiers, initialized with the first item open.
   *
   * @type {WritableSignal<readonly string[]>}
   */
  public readonly open: WritableSignal<readonly string[]> = signal<readonly string[]>(['a']);
  // #endregion
}

/**
 * Constant KEY_CODES
 *
 * @description
 * Legacy key codes supplied because the CDK key manager reads `keyCode` from synthetic keyboard
 * events in this test environment.
 *
 * @type {Record<string, number>}
 */
const KEY_CODES: Record<string, number> = { ArrowDown: 40, ArrowUp: 38, Home: 36, End: 35 };

/**
 * Function press
 *
 * @description
 * Dispatches a bubbling keydown event with both the key name and the legacy code expected by the
 * CDK manager.
 *
 * @param {HTMLElement | undefined} target - Element receiving the event; omitted targets do nothing.
 * @param {string} key - Key name from the supported navigation set.
 *
 * @returns {void}
 */
function press(target: HTMLElement | undefined, key: string): void {
  target?.dispatchEvent(
    new KeyboardEvent('keydown', { key, keyCode: KEY_CODES[key] ?? 0, bubbles: true }),
  );
}

/**
 * Function setup
 *
 * @description
 * Creates the fixture, waits for Angular stability, and returns the rendered triggers, panels, and
 * host state used by the accordion behavior tests.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; triggers: HTMLButtonElement[]; panels: HTMLElement[]; host: HostComponent }>}
 * Stable fixture handles and host model.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  triggers: HTMLButtonElement[];
  panels: HTMLElement[];
  host: HostComponent;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const triggers: HTMLButtonElement[] = Array.from(
    element.querySelectorAll<HTMLButtonElement>('button'),
  );
  const panels: HTMLElement[] = Array.from(
    element.querySelectorAll<HTMLElement>('ui-accordion-content'),
  );
  return { fixture, triggers, panels, host: fixture.componentInstance };
}

describe('Accordion', () => {
  it('links each header to its region and reflects the open state', async () => {
    const { triggers, panels } = await setup();
    const [first, second] = triggers;
    expect(first?.getAttribute('aria-expanded')).toBe('true');
    expect(second?.getAttribute('aria-expanded')).toBe('false');
    expect(first?.getAttribute('aria-controls')).toBe(panels[0]?.id);
    expect(panels[0]?.getAttribute('aria-labelledby')).toBe(first?.id);
    expect(panels[0]?.getAttribute('role')).toBe('region');
    expect(panels[1]?.getAttribute('data-state')).toBe('closed');
  });

  it('opens one item at a time in single mode', async () => {
    const { fixture, triggers, host } = await setup();
    triggers[1]?.click();
    await fixture.whenStable();
    expect(host.open()).toEqual(['b']);
    expect(triggers[0]?.getAttribute('aria-expanded')).toBe('false');
    triggers[1]?.click();
    await fixture.whenStable();
    expect(host.open()).toEqual([]);
  });

  it('keeps the open item locked when not collapsible', async () => {
    const { fixture, triggers, host } = await setup();
    host.collapsible.set(false);
    await fixture.whenStable();
    expect(triggers[0]?.getAttribute('aria-disabled')).toBe('true');
    triggers[0]?.click();
    await fixture.whenStable();
    expect(host.open()).toEqual(['a']);
  });

  it('opens several items in multiple mode', async () => {
    const { fixture, triggers, host } = await setup();
    host.type.set('multiple');
    await fixture.whenStable();
    triggers[1]?.click();
    await fixture.whenStable();
    expect(host.open()).toEqual(['a', 'b']);
  });

  it('moves focus between headers with the arrow keys, skipping disabled ones', async () => {
    const { triggers } = await setup();
    const [a, b, c, d] = triggers;
    expect(c?.disabled).toBe(true);
    a?.focus();
    press(a, 'ArrowDown');
    expect(document.activeElement).toBe(b);
    press(b, 'ArrowDown');
    expect(document.activeElement).toBe(d);
    press(d, 'Home');
    expect(document.activeElement).toBe(a);
    press(a, 'End');
    expect(document.activeElement).toBe(d);
  });
});
