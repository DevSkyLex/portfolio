import { type Signal, type WritableSignal, Component, computed, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { SidebarControl } from '@internal/ui/lib/sidebar/models/sidebar/sidebar-control.interface';
import { SidebarTriggerComponent } from '@internal/ui/lib/sidebar/sidebar.component';
import { SIDEBAR_CONTROL } from '@internal/ui/lib/sidebar/tokens/sidebar-control/sidebar-control.token';

/**
 * Class FakeSidebarControl
 * @class FakeSidebarControl
 *
 * @description
 * Application-owned sidebar state, as a layout with its own sidebar provides it.
 */
class FakeSidebarControl implements SidebarControl {
  // #region Properties
  /**
   * Property open
   * @readonly
   *
   * @description
   * Writable expanded state toggled by the trigger.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly open: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Expanded state read by the trigger.
   *
   * @type {Signal<boolean>}
   */
  public readonly expanded: Signal<boolean> = computed<boolean>((): boolean => this.open());

  /**
   * Property available
   * @readonly
   *
   * @description
   * Whether the layout lets the sidebar collapse.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly available: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property controls
   * @readonly
   *
   * @description
   * Id of the controlled sidebar.
   *
   * @type {Signal<string | null>}
   */
  public readonly controls: Signal<string | null> = signal<string | null>('app-sidebar');

  /**
   * Property shortcut
   * @readonly
   *
   * @description
   * Single-key toggle shortcut of the layout.
   *
   * @type {Signal<readonly string[]>}
   */
  public readonly shortcut: Signal<readonly string[]> = signal<readonly string[]>(['[']);
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Flips the expanded state.
   */
  public toggle(): void {
    this.open.update((open: boolean): boolean => !open);
  }
  // #endregion
}

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Places the trigger in a page bar, as a routed page below its layout does.
 */
@Component({
  imports: [SidebarTriggerComponent],
  template: `<header class="flex gap-3">
    <ui-sidebar-trigger class="-ml-2" /><span>Page</span>
  </header>`,
})
class HostComponent {}

/**
 * Function render
 *
 * @description
 * Renders the host with or without an application sidebar control.
 *
 * @param {FakeSidebarControl | null} control - Control provided under `SIDEBAR_CONTROL`, if any.
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; host: HTMLElement }>} Fixture and trigger host.
 */
async function render(
  control: FakeSidebarControl | null,
): Promise<{ fixture: ComponentFixture<HostComponent>; host: HTMLElement }> {
  TestBed.configureTestingModule({
    providers: control ? [{ provide: SIDEBAR_CONTROL, useValue: control }] : [],
  });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const host: HTMLElement = (fixture.nativeElement as HTMLElement).querySelector(
    'ui-sidebar-trigger',
  ) as HTMLElement;
  return { fixture, host };
}

describe('SidebarTriggerComponent', (): void => {
  it('toggles an application sidebar and names the action of each state', async (): Promise<void> => {
    const control: FakeSidebarControl = new FakeSidebarControl();
    const { fixture, host } = await render(control);
    const button: HTMLButtonElement = host.querySelector('button') as HTMLButtonElement;
    expect(host.className).toContain('inline-flex');
    expect(host.className).toContain('-ml-2');
    expect(button.getAttribute('aria-label')).toBe('Réduire la barre latérale');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe('app-sidebar');
    expect(button.getAttribute('aria-keyshortcuts')).toBe('[');
    expect(button.className).toContain('size-8');

    button.click();
    await fixture.whenStable();
    expect(control.open()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Déployer la barre latérale');

    button.click();
    await fixture.whenStable();
    expect(control.open()).toBe(true);
  });

  it('leaves the layout while the toggle is unavailable', async (): Promise<void> => {
    const control: FakeSidebarControl = new FakeSidebarControl();
    const { fixture, host } = await render(control);
    control.available.set(false);
    await fixture.whenStable();
    expect(host.querySelector('button')).toBeNull();
    expect(host.className).toContain('hidden');
    expect(host.className).not.toContain('inline-flex');

    control.available.set(true);
    await fixture.whenStable();
    expect(host.querySelector('button')).not.toBeNull();
  });

  it('renders nothing outside any sidebar provider', async (): Promise<void> => {
    const { host } = await render(null);
    expect(host.querySelector('button')).toBeNull();
    expect(host.className).toContain('hidden');
  });
});
