import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MenubarImports } from '@internal/ui/lib/menubar/constants/menubar.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders two CDK-backed menus in a menubar for roving-focus and adjacent-menu assertions.
 */
@Component({
  imports: [MenubarImports],
  template: `
    <div uiMenubar>
      <button [uiMenubarTrigger]="file">Fichier</button>
      <button [uiMenubarTrigger]="edit">Édition</button>
    </div>
    <ng-template #file>
      <div uiDropdownMenuContent><button uiDropdownMenuItem>Nouveau</button></div>
    </ng-template>
    <ng-template #edit>
      <div uiDropdownMenuContent><button uiDropdownMenuItem>Annuler</button></div>
    </ng-template>
  `,
})
class HostComponent {}

/**
 * Constant KEY_CODES
 *
 * @description
 * Legacy numeric key codes assigned to synthetic events for CDK keyboard handling.
 *
 * @type {Record<string, number>}
 */
const KEY_CODES: Record<string, number> = { ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40 };

/**
 * Function key
 *
 * @description
 * Dispatches a bubbling keyboard event with its legacy keyCode populated for CDK menu tests.
 *
 * @param {Element} target - Element receiving the event.
 * @param {string} name - Key value and numeric key-code lookup key.
 * @returns {void} Dispatches a cancelable keydown event.
 */
const key = (target: Element, name: string): void => {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'keyCode', { value: KEY_CODES[name] });
  target.dispatchEvent(event);
};

/**
 * Function nth
 *
 * @description
 * Returns the item at an index and fails the test with that index when it is absent.
 *
 * @template T - Element type stored by the array-like collection.
 * @param {ArrayLike<T>} items - Indexed item collection.
 * @param {number} index - Required item position.
 * @returns {T} Item at the requested position.
 * @throws {Error} When no item exists at the requested index.
 */
const nth = <T>(items: ArrayLike<T>, index: number): T => {
  const item: T | undefined = items[index];
  if (item === undefined) throw new Error(`No item ${index}`);
  return item;
};

describe('Menubar', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.remove());

  it('enters on the first trigger and roves between the triggers with the arrows', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const bar: HTMLElement = fixture.nativeElement.querySelector('[uiMenubar]');
    const buttons: NodeListOf<HTMLButtonElement> =
      bar.querySelectorAll<HTMLButtonElement>('button');
    const [file, edit] = [nth(buttons, 0), nth(buttons, 1)];
    expect(bar.getAttribute('role')).toBe('menubar');
    expect(file.getAttribute('role')).toBe('menuitem');
    expect(file.getAttribute('aria-haspopup')).toBe('menu');

    // Tabbing into the bar lands on its first trigger.
    bar.focus();
    expect(document.activeElement).toBe(file);
    key(file, 'ArrowRight');
    expect(document.activeElement).toBe(edit);
    key(edit, 'ArrowRight');
    expect(document.activeElement).toBe(file);
  });

  it('opens the neighbouring menu with the arrows once a menu is open', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const buttons: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('[uiMenubar] button');
    const [file, edit] = [nth(buttons, 0), nth(buttons, 1)];
    file.focus();
    key(file, 'ArrowDown');
    await fixture.whenStable();
    expect(file.getAttribute('aria-expanded')).toBe('true');
    const row: HTMLElement = nth(
      document.querySelectorAll<HTMLElement>('[role="menu"] [role="menuitem"]'),
      0,
    );
    expect(document.activeElement).toBe(row);

    key(row, 'ArrowRight');
    await fixture.whenStable();
    expect(edit.getAttribute('aria-expanded')).toBe('true');
    expect(file.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="menu"]')?.textContent).toContain('Annuler');
  });
});
