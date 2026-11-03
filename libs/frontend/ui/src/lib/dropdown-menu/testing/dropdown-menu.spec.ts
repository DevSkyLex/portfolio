import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DropdownMenuImports } from '@internal/ui/lib/dropdown-menu/constants/dropdown-menu.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture combines action rows, a checkbox row and mutually exclusive theme radio items.
 */
@Component({
  imports: [DropdownMenuImports],
  template: `
    <button type="button" [uiDropdownMenuTrigger]="menu">Actions</button>
    <ng-template #menu>
      <div uiDropdownMenuContent>
        <span uiDropdownMenuLabel>Fichier</span>
        <button uiDropdownMenuItem (triggered)="last.set('copy')">
          Copier <span uiDropdownMenuShortcut>⌘C</span>
        </button>
        <button uiDropdownMenuItem variant="danger" (triggered)="last.set('delete')">
          Supprimer
        </button>
        <div uiDropdownMenuSeparator></div>
        <button uiDropdownMenuCheckboxItem [(checked)]="grid">
          <ui-dropdown-menu-item-indicator /> Grille
        </button>
        <div uiDropdownMenuRadioGroup [(value)]="theme">
          <button uiDropdownMenuRadioItem value="dark">
            <ui-dropdown-menu-item-indicator /> Sombre
          </button>
          <button uiDropdownMenuRadioItem value="light">
            <ui-dropdown-menu-item-indicator /> Clair
          </button>
        </div>
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
   * Last action label emitted by an activated regular menu row.
   *
   * @type {WritableSignal<string>}
   */
  public readonly last: WritableSignal<string> = signal<string>('');

  /**
   * Property grid
   * @readonly
   *
   * @description
   * Two-way state bound to the checkbox item for the grid preference.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly grid: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property theme
   * @readonly
   *
   * @description
   * Selected theme shared by the radio group in the menu.
   *
   * @type {WritableSignal<string>}
   */
  public readonly theme: WritableSignal<string> = signal<string>('dark');
  // #endregion
}

/**
 * Class InsetHostComponent
 * @class InsetHostComponent
 *
 * @description
 * Test fixture compares menu and submenu rows with indicator spacing enabled and disabled.
 */
@Component({
  imports: [DropdownMenuImports],
  template: `
    <button type="button" [uiDropdownMenuTrigger]="menu">Affichage</button>
    <ng-template #menu>
      <div uiDropdownMenuContent>
        <button uiDropdownMenuItem inset>Zoom</button>
        <button uiDropdownMenuItem [inset]="false">Plein écran</button>
        <button [uiDropdownMenuSubTrigger]="sub" inset>Partager</button>
        <button [uiDropdownMenuSubTrigger]="sub" [inset]="false">Exporter</button>
      </div>
    </ng-template>
    <ng-template #sub>
      <div uiDropdownMenuContent><button uiDropdownMenuItem>Lien</button></div>
    </ng-template>
  `,
})
class InsetHostComponent {}

/**
 * Constant KEY_CODES
 *
 * @description
 * Legacy key-code values required by the CDK menu keyboard handler in dispatched test events.
 *
 * @type {Record<string, number>}
 */
const KEY_CODES: Record<string, number> = { ArrowDown: 40, ArrowUp: 38, Escape: 27, Enter: 13 };

/**
 * Function key
 *
 * @description
 * Dispatches a bubbling keyboard event with the legacy keyCode consumed by the CDK menu.
 *
 * @param {Element} target - Element receiving the event.
 * @param {string} name - Keyboard key to dispatch.
 * @returns {void} Completes after dispatching the configured keyboard event.
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
 * Returns an indexed item from an array-like collection and fails the test when it is absent.
 *
 * @template T - Item type stored by the collection.
 * @param {ArrayLike<T>} items - Indexed collection.
 * @param {number} index - Zero-based item position.
 * @returns {T} Item at the requested position.
 */
const nth = <T>(items: ArrayLike<T>, index: number): T => {
  const item: T | undefined = items[index];
  if (item === undefined) throw new Error(`No item ${index}`);
  return item;
};

describe('DropdownMenu', () => {
  /**
   * Function open
   *
   * @description
   * Creates a stable menu fixture, activates its trigger and returns the attached menu for assertions.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; trigger: HTMLButtonElement; menu: HTMLElement | null }>} Fixture, trigger and overlay menu.
   */
  async function open(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    trigger: HTMLButtonElement;
    menu: HTMLElement | null;
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.click();
    await fixture.whenStable();
    const menu: HTMLElement | null = document.querySelector<HTMLElement>('[role="menu"]');
    return { fixture, trigger, menu };
  }

  afterEach(() => document.querySelector('.cdk-overlay-container')?.remove());

  it('opens the menu from the trigger and exposes the expanded state', async () => {
    const { trigger, menu } = await open();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu?.getAttribute('data-slot')).toBe('dropdown-menu-content');
    expect(menu?.querySelectorAll('[role="menuitem"]').length).toBe(2);
    expect(menu?.querySelector('[data-variant="danger"]')?.className).toContain('text-danger-ink');
  });

  it('runs an item and closes the menu', async () => {
    const { fixture, trigger, menu } = await open();
    menu?.querySelector<HTMLElement>('[role="menuitem"]')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.last()).toBe('copy');
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens from the keyboard, moves the focus with the arrows and closes on Escape', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.focus();
    key(trigger, 'ArrowDown');
    await fixture.whenStable();
    const items: NodeListOf<HTMLElement> =
      document.querySelectorAll<HTMLElement>('[role^="menuitem"]');
    expect(document.activeElement).toBe(nth(items, 0));
    key(nth(items, 0), 'ArrowDown');
    expect(document.activeElement).toBe(nth(items, 1));
    key(nth(items, 1), 'Escape');
    await fixture.whenStable();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('toggles a checkbox row and checks one radio row of the group', async () => {
    const { fixture, menu } = await open();
    const checkbox: HTMLElement | null | undefined = menu?.querySelector<HTMLElement>(
      '[role="menuitemcheckbox"]',
    );
    const radios: never[] | NodeListOf<HTMLElement> =
      menu?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [];
    expect(checkbox?.getAttribute('aria-checked')).toBe('false');
    expect(nth(radios, 0).getAttribute('aria-checked')).toBe('true');

    checkbox?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.grid()).toBe(true);

    fixture.debugElement.query((el) => el.name === 'button').nativeElement.click();
    await fixture.whenStable();
    nth(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'), 1).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.theme()).toBe('light');

    fixture.debugElement.query((el) => el.name === 'button').nativeElement.click();
    await fixture.whenStable();
    const reopened: NodeListOf<HTMLElement> =
      document.querySelectorAll<HTMLElement>('[role^="menuitem"]');
    expect(nth(reopened, 2).getAttribute('aria-checked')).toBe('true');
    expect(nth(reopened, 3).getAttribute('aria-checked')).toBe('false');
    expect(nth(reopened, 4).getAttribute('aria-checked')).toBe('true');
  });

  it('leaves room for an indicator on the rows marked inset only', async () => {
    const fixture: ComponentFixture<InsetHostComponent> =
      TestBed.createComponent(InsetHostComponent);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    const rows: HTMLElement[] = [
      ...document.querySelectorAll<HTMLElement>('[role="menu"] [role="menuitem"]'),
    ];
    expect(rows.map((row) => [row.textContent?.trim(), row.classList.contains('pl-8')])).toEqual([
      ['Zoom', true],
      ['Plein écran', false],
      ['Partager', true],
      ['Exporter', false],
    ]);
    expect(rows[2]?.getAttribute('data-slot')).toBe('dropdown-menu-sub-trigger');
  });
});
