import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CommandImports } from '@internal/ui/lib/command/constants/command.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test host composing the palette parts and recording the label emitted by selected commands.
 */
@Component({
  imports: [CommandImports],
  template: `
    <ui-command>
      <ui-command-input />
      <div uiCommandList>
        <p uiCommandEmpty>Aucune commande</p>
        <ui-command-group heading="Pages">
          <div uiCommandItem (selected)="ran.set($event)">Accueil</div>
          <div uiCommandItem [keywords]="['écrire', 'mail']" (selected)="ran.set($event)">
            Contact <span uiCommandShortcut>⌘K</span>
          </div>
        </ui-command-group>
        <div uiCommandSeparator></div>
        <ui-command-group heading="Thème">
          <div uiCommandItem disabled>Système</div>
          <div uiCommandItem value="Mode clair" (selected)="ran.set($event)">Clair</div>
        </ui-command-group>
      </div>
    </ui-command>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property ran
   * @readonly
   *
   * @description
   * Last command label emitted by an item activation in the test template.
   *
   * @type {WritableSignal<string>}
   */
  public readonly ran: WritableSignal<string> = signal<string>('');
  // #endregion
}

/**
 * Function key
 *
 * @description
 * Dispatches a bubbling, cancelable keyboard event so the palette input handles the requested key.
 *
 * @param {Element} target - Element receiving the keyboard event.
 * @param {string} name - Keyboard key value to dispatch.
 */
const key = (target: Element, name: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
  );
};

describe('CommandComponent', () => {
  /**
   * Function setup
   *
   * @description
   * Creates the command host, waits for signal rendering, and returns its input, visible options and
   * a helper for dispatching search text.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; root: HTMLElement; field: HTMLInputElement; visible: () => (string | undefined)[]; search: (text: string) => Promise<void> }>} Stable fixture handles and search helpers.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    root: HTMLElement;
    field: HTMLInputElement;
    visible: () => (string | undefined)[];
    search: (text: string) => Promise<void>;
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const field: HTMLInputElement = root.querySelector('input') as HTMLInputElement;
    const visible = (): (string | undefined)[] =>
      Array.from(root.querySelectorAll<HTMLElement>('[role="option"]:not([hidden])')).map((item) =>
        item.firstChild?.textContent?.trim(),
      );
    const search = async (text: string): Promise<void> => {
      field.value = text;
      field.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, root, field, visible, search };
  }

  it('wires the search field to the listbox with the first command active', async () => {
    const { root, field } = await setup();
    const list: Element | null = root.querySelector('[role="listbox"]');
    const first: Element | null = root.querySelector('[role="option"]');
    expect(field.getAttribute('role')).toBe('combobox');
    expect(field.getAttribute('aria-controls')).toBe(list?.id);
    expect(field.getAttribute('aria-activedescendant')).toBe(first?.id);
    expect(first?.getAttribute('aria-selected')).toBe('true');
    expect(field.placeholder).toBe('Tapez une commande ou recherchez…');
    expect(root.querySelector('[role="group"]')?.getAttribute('aria-labelledby')).toBe(
      root.querySelector('[data-slot="command-group-heading"]')?.id,
    );
  });

  it('filters by text and keywords, hiding empty groups and separators', async () => {
    const { root, visible, search } = await setup();
    await search('ecrire');
    expect(visible()).toEqual(['Contact']);
    const groups: NodeListOf<Element> = root.querySelectorAll('ui-command-group');
    expect(groups.item(1).hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('[data-slot="command-separator"]')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(root.querySelector('[data-slot="command-empty"]')?.hasAttribute('hidden')).toBe(true);

    await search('zzz');
    expect(visible()).toEqual([]);
    expect(root.querySelector('[data-slot="command-empty"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('moves past disabled commands with the arrows and runs the active one on Enter', async () => {
    const { fixture, field } = await setup();
    key(field, 'ArrowDown');
    key(field, 'ArrowDown');
    await fixture.whenStable();
    const active: HTMLElement | null = document.getElementById(
      field.getAttribute('aria-activedescendant') ?? '',
    );
    expect(active?.textContent?.trim()).toBe('Clair');

    key(field, 'Enter');
    expect(fixture.componentInstance.ran()).toBe('Mode clair');

    key(field, 'ArrowUp');
    key(field, 'ArrowUp');
    key(field, 'Enter');
    expect(fixture.componentInstance.ran()).toBe('Accueil');
  });

  it('runs a command on click', async () => {
    const { fixture, root } = await setup();
    (root.querySelectorAll<HTMLElement>('[role="option"]').item(1) as HTMLElement).click();
    expect(fixture.componentInstance.ran()).toBe('Contact');
  });
});
