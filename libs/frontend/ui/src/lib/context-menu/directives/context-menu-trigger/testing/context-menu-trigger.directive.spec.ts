import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ContextMenuImports } from '@internal/ui/lib/context-menu/constants/context-menu.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture providing a focusable trigger, dropdown panel and a signal that records row activation.
 */
@Component({
  imports: [ContextMenuImports],
  template: `
    <div tabindex="0" [uiContextMenuTrigger]="menu">Zone</div>
    <ng-template #menu>
      <div uiDropdownMenuContent>
        <button uiDropdownMenuItem (triggered)="last.set('back')">Retour</button>
        <button uiDropdownMenuItem (triggered)="last.set('reload')">Recharger</button>
      </div>
    </ng-template>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property last
   * @readonly
   *
   * @description
   * Label of the most recently activated menu row in the fixture.
   *
   * @type {WritableSignal<string>}
   */
  public readonly last: WritableSignal<string> = signal<string>('');
  // #endregion
}

describe('ContextMenuTriggerDirective', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.remove());

  /**
   * Function setup
   *
   * @description
   * Creates a stable fixture and returns the host element used to invoke the context menu.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; target: HTMLElement }>} Fixture and trigger host.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    target: HTMLElement;
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const target: HTMLElement = fixture.nativeElement.querySelector('[tabindex]');
    return { fixture, target };
  }

  it('opens on right click and runs the chosen row', async () => {
    const { fixture, target } = await setup();
    const event: MouseEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
    });
    target.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    const rows: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>(
      '[role="menu"] [role="menuitem"]',
    );
    expect(rows.length).toBe(2);
    (rows.item(1) as HTMLElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.last()).toBe('reload');
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('opens on Shift+F10 with the focus on the first row, and ignores the native echo', async () => {
    const { fixture, target } = await setup();
    target.focus();
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    const first: Element | null = document.querySelector('[role="menu"] [role="menuitem"]');
    expect(first).not.toBeNull();
    expect(document.activeElement).toBe(first);

    const echo: MouseEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    target.dispatchEvent(echo);
    expect(echo.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });
});
