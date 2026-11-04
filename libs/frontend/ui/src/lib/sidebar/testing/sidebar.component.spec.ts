import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SidebarComponent,
  SidebarTriggerComponent,
} from '@internal/ui/lib/sidebar/sidebar.component';
import {
  SidebarContentDirective,
  SidebarGroupDirective,
  SidebarGroupLabelDirective,
  SidebarInsetDirective,
  SidebarMenuBadgeDirective,
  SidebarMenuButtonDirective,
  SidebarMenuDirective,
  SidebarMenuItemDirective,
  SidebarProviderDirective,
  SidebarRailDirective,
} from '@internal/ui/lib/sidebar/sidebar.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders sidebar navigation, controls and main content around a writable desktop open state.
 */
@Component({
  imports: [
    SidebarProviderDirective,
    SidebarComponent,
    SidebarTriggerComponent,
    SidebarRailDirective,
    SidebarContentDirective,
    SidebarGroupDirective,
    SidebarGroupLabelDirective,
    SidebarMenuDirective,
    SidebarMenuItemDirective,
    SidebarMenuButtonDirective,
    SidebarMenuBadgeDirective,
    SidebarInsetDirective,
  ],
  template: `<div uiSidebarProvider [(open)]="open">
    <ui-sidebar collapsible="icon">
      <div uiSidebarContent>
        <div uiSidebarGroup aria-labelledby="nav-label">
          <div id="nav-label" uiSidebarGroupLabel>Navigation</div>
          <ul uiSidebarMenu>
            <li uiSidebarMenuItem>
              <a uiSidebarMenuButton href="/inbox" isActive><span>Inbox</span></a>
              <span uiSidebarMenuBadge>4</span>
            </li>
            <li uiSidebarMenuItem>
              <a uiSidebarMenuButton href="/drafts"><span>Drafts</span></a>
            </li>
          </ul>
        </div>
      </div>
      <button uiSidebarRail aria-label="Replier"></button>
    </ui-sidebar>
    <main uiSidebarInset><ui-sidebar-trigger /></main>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property open
   * @readonly
   *
   * @description
   * Desktop expanded state bound to the sidebar provider in the fixture.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly open: WritableSignal<boolean> = signal<boolean>(true);
  // #endregion
}

/**
 * Function breakpoints
 *
 * @description
 * Provides a controlled CDK breakpoint observer state for desktop or mobile sidebar behavior.
 *
 * @param {boolean} matches - Whether the fixture should use the mobile drawer breakpoint.
 * @returns Provider definition for the controlled breakpoint observer.
 */
function breakpoints(matches: boolean): {
  provide: typeof BreakpointObserver;
  useValue: {
    observe: () => {
      subscribe: (observer: { next: (value: BreakpointState) => void }) => {
        unsubscribe: () => undefined;
      };
    };
  };
} {
  const state: BreakpointState = { matches, breakpoints: {} };
  return {
    provide: BreakpointObserver,
    useValue: {
      observe: (): {
        subscribe: (observer: { next: (value: BreakpointState) => void }) => {
          unsubscribe: () => undefined;
        };
      } => ({
        subscribe: (observer: {
          next: (value: BreakpointState) => void;
        }): { unsubscribe: () => undefined } => {
          observer.next(state);
          return { unsubscribe: (): undefined => undefined };
        },
      }),
    },
  };
}

/**
 * Function setup
 *
 * @description
 * Configures the requested viewport mode, stabilizes the fixture and returns its sidebar controls.
 *
 * @param {boolean} mobile - Whether the controlled breakpoint should select mobile behavior.
 * @returns Fixture, sidebar elements and component instance used by the specs.
 */
async function setup(mobile: boolean): Promise<{
  fixture: ComponentFixture<HostComponent>;
  element: HTMLElement;
  sidebar: HTMLElement;
  trigger: HTMLButtonElement;
  host: HostComponent;
}> {
  TestBed.configureTestingModule({ providers: [breakpoints(mobile)] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const sidebar: HTMLElement = element.querySelector('ui-sidebar') as HTMLElement;
  const trigger: HTMLButtonElement = element.querySelector(
    'ui-sidebar-trigger button',
  ) as HTMLButtonElement;
  return { fixture, element, sidebar, trigger, host: fixture.componentInstance };
}

describe('Sidebar (desktop)', (): void => {
  it('collapses to icons from the trigger, the rail and Ctrl+B', async (): Promise<void> => {
    const { fixture, element, sidebar, trigger, host } = await setup(false);
    const container: Element | null = element.querySelector(
      `#${trigger.getAttribute('aria-controls')}`,
    );
    expect(container?.textContent).toContain('Inbox');
    expect(sidebar.getAttribute('data-state')).toBe('expanded');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-label')).toBe('Réduire la barre latérale');
    expect(trigger.getAttribute('aria-keyshortcuts')).toBe('Control+B');

    trigger.click();
    await fixture.whenStable();
    expect(host.open()).toBe(false);
    expect(sidebar.getAttribute('data-state')).toBe('collapsed');
    expect(sidebar.getAttribute('data-collapsible')).toBe('icon');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Déployer la barre latérale');

    (element.querySelector('[uiSidebarRail]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(host.open()).toBe(true);

    const shortcut: KeyboardEvent = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(shortcut);
    await fixture.whenStable();
    expect(shortcut.defaultPrevented).toBe(true);
    expect(host.open()).toBe(false);
  });

  it('marks the active menu entry as the current page', async (): Promise<void> => {
    const { element } = await setup(false);
    const [inbox, drafts] = Array.from(element.querySelectorAll('a[uiSidebarMenuButton]'));
    expect(inbox?.getAttribute('aria-current')).toBe('page');
    expect(inbox?.hasAttribute('data-active')).toBe(true);
    expect(drafts?.hasAttribute('aria-current')).toBe(false);
  });
});

describe('Sidebar (mobile)', (): void => {
  it('opens the content in a modal drawer and closes it with Escape', async (): Promise<void> => {
    const { fixture, trigger, host } = await setup(true);
    const drawer = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
    expect(drawer()).toBeNull();
    trigger.click();
    await fixture.whenStable();
    expect(host.open()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(drawer()?.getAttribute('aria-label')).toBe('Barre latérale');
    expect(drawer()?.textContent).toContain('Inbox');

    drawer()?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await fixture.whenStable();
    expect(drawer()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
