import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  TabsContentDirective,
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
} from '@internal/ui/lib/tabs/tabs.directive';
import type { TabsActivation } from '@internal/ui/lib/tabs/models/tabs/tabs-activation.type';
import type { TabsOrientation } from '@internal/ui/lib/tabs/models/tabs/tabs-orientation.type';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds mutable selection, activation and orientation to a tab set with one disabled trigger.
 */
@Component({
  imports: [TabsDirective, TabsListDirective, TabsTriggerDirective, TabsContentDirective],
  template: `<div
    uiTabs
    [(value)]="value"
    [activation]="activation()"
    [orientation]="orientation()"
  >
    <div uiTabsList aria-label="Sections">
      <button uiTabsTrigger="one">One</button>
      <button uiTabsTrigger="two" disabled>Two</button>
      <button uiTabsTrigger="three">Three</button>
    </div>
    <div uiTabsContent="one">First</div>
    <div uiTabsContent="two">Second</div>
    <div uiTabsContent="three">Third</div>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Selected tab value asserted after keyboard and pointer interactions.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly value: WritableSignal<string | null> = signal<string | null>('one');

  /**
   * Property activation
   * @readonly
   *
   * @description
   * Activation mode changed to verify automatic and manual keyboard selection.
   *
   * @type {WritableSignal<TabsActivation>}
   */
  public readonly activation: WritableSignal<TabsActivation> = signal<TabsActivation>('automatic');

  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Tab layout direction changed to verify vertical arrow navigation.
   *
   * @type {WritableSignal<TabsOrientation>}
   */
  public readonly orientation: WritableSignal<TabsOrientation> =
    signal<TabsOrientation>('horizontal');
  // #endregion
}

/**
 * Constant KEY_CODES
 *
 * @description
 * Legacy key codes supplied because the CDK key manager reads `keyCode` on synthetic events.
 *
 * @type {Record<string, number>}
 */
const KEY_CODES: Record<string, number> = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Home: 36,
  End: 35,
};

/**
 * Function press
 *
 * @description
 * Dispatches a bubbling key event with the legacy code required by the CDK key manager.
 *
 * @param {Element | undefined} target - Tab trigger receiving the event.
 * @param {string} key - Keyboard key name.
 * @returns {void}
 */
function press(target: Element | undefined, key: string): void {
  target?.dispatchEvent(
    new KeyboardEvent('keydown', { key, keyCode: KEY_CODES[key] ?? 0, bubbles: true }),
  );
}

/**
 * Function setup
 *
 * @description
 * Creates and stabilizes the tab fixture and returns its triggers, panels and host model.
 *
 * @returns Fixture, tab buttons, panels and component instance.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  tabs: HTMLButtonElement[];
  panels: HTMLElement[];
  host: HostComponent;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const tabs: HTMLButtonElement[] = Array.from(
    element.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const panels: HTMLElement[] = Array.from(
    element.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
  );
  return { fixture, tabs, panels, host: fixture.componentInstance };
}

describe('Tabs', (): void => {
  it('wires tabs to panels and shows only the selected panel', async (): Promise<void> => {
    const { tabs, panels } = await setup();
    const [one, two] = tabs;
    expect(one?.getAttribute('aria-selected')).toBe('true');
    expect(one?.getAttribute('aria-controls')).toBe(panels[0]?.id);
    expect(panels[0]?.getAttribute('aria-labelledby')).toBe(one?.id);
    expect(one?.tabIndex).toBe(0);
    expect(two?.tabIndex).toBe(-1);
    expect(panels[0]?.hidden).toBe(false);
    expect(panels[2]?.hidden).toBe(true);
  });

  it('selects on focus with automatic activation, skipping disabled tabs', async (): Promise<void> => {
    const { fixture, tabs, panels, host } = await setup();
    const [one, , three] = tabs;
    one?.focus();
    press(one, 'ArrowRight');
    await fixture.whenStable();
    expect(document.activeElement).toBe(three);
    expect(host.value()).toBe('three');
    expect(three?.tabIndex).toBe(0);
    expect(panels[2]?.hidden).toBe(false);
    press(three, 'Home');
    await fixture.whenStable();
    expect(host.value()).toBe('one');
  });

  it('only moves focus with manual activation', async (): Promise<void> => {
    const { fixture, tabs, host } = await setup();
    host.activation.set('manual');
    await fixture.whenStable();
    const [one, , three] = tabs;
    one?.focus();
    press(one, 'End');
    await fixture.whenStable();
    expect(document.activeElement).toBe(three);
    expect(host.value()).toBe('one');
    expect(three?.tabIndex).toBe(0);
    three?.click();
    await fixture.whenStable();
    expect(host.value()).toBe('three');
  });

  it('uses the vertical arrows in vertical orientation', async (): Promise<void> => {
    const { fixture, tabs, host } = await setup();
    host.orientation.set('vertical');
    await fixture.whenStable();
    const list: HTMLElement = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    tabs[0]?.focus();
    press(tabs[0], 'ArrowRight');
    await fixture.whenStable();
    expect(host.value()).toBe('one');
    press(tabs[0], 'ArrowDown');
    await fixture.whenStable();
    expect(host.value()).toBe('three');
  });
});
