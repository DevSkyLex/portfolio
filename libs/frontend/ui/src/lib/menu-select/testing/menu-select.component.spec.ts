import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  MenuSelectComponent,
  MenuSelectIconDirective,
} from '@internal/ui/lib/menu-select/menu-select.component';
import type { MenuSelectOption } from '@internal/ui/lib/menu-select/models/menu-select/menu-select-option.interface';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders the menu select with a controlled value and projected option icon template for interaction tests.
 */
@Component({
  imports: [MenuSelectComponent, MenuSelectIconDirective],
  template: `
    <ui-menu-select label="Thème" placement="top" size="sm" [options]="options" [(value)]="value">
      <ng-template uiMenuSelectIcon let-option
        ><i class="icon">{{ option.value }}</i></ng-template
      >
    </ui-menu-select>
    <button id="outside" type="button">Ailleurs</button>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property options
   * @readonly
   *
   * @description
   * Ordered theme choices used by selection, language and active-option assertions.
   *
   * @type {readonly MenuSelectOption[]}
   */
  public readonly options: readonly MenuSelectOption[] = [
    { value: 'system', label: 'Système' },
    { value: 'dark', label: 'Sombre' },
    { value: 'light', label: 'Clair', lang: 'fr' },
  ];

  /**
   * Property value
   * @readonly
   *
   * @description
   * Writable selection signal initialized to the dark option.
   *
   * @type {WritableSignal<string>}
   */
  public readonly value: WritableSignal<string> = signal<string>('dark');
  // #endregion
}

/**
 * Class DefaultsHostComponent
 * @class DefaultsHostComponent
 *
 * @description
 * Renders the menu select with omitted placement and size inputs to exercise defaults and unknown model fallback.
 */
@Component({
  imports: [MenuSelectComponent],
  template: `
    <ui-menu-select label="Langue" [options]="options()" [(value)]="value" />
    <button id="outside" type="button">Ailleurs</button>
  `,
})
class DefaultsHostComponent {
  // #region Properties
  /**
   * Property options
   * @readonly
   *
   * @description
   * Writable list of language choices that can be emptied during the empty-list interaction case.
   *
   * @type {WritableSignal<readonly MenuSelectOption[]>}
   */
  public readonly options: WritableSignal<readonly MenuSelectOption<string>[]> = signal<
    readonly MenuSelectOption[]
  >([
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ]);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Writable selection initialized to a value absent from the options to verify the first-option display fallback.
   *
   * @type {WritableSignal<string>}
   */
  public readonly value: WritableSignal<string> = signal<string>('de');
  // #endregion
}

/**
 * Function get
 *
 * @description
 * Queries a required element and fails immediately with the selector when the test template lacks it.
 *
 * @template T - Element subtype expected from the selector.
 * @param {ParentNode} root - Template subtree searched for the element.
 * @param {string} selector - CSS selector identifying the required node.
 * @returns {T} Matching element.
 * @throws {Error} When the selector finds no element.
 */
const get = <T extends Element>(root: ParentNode, selector: string): T => {
  const element: T | null = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};

/**
 * Function key
 *
 * @description
 * Dispatches a bubbling, cancelable keyboard event to a menu-select test target.
 *
 * @param {Element} target - Trigger or listbox receiving the event.
 * @param {string} name - Keyboard key value.
 * @returns {void} Sends the synthetic keydown event.
 */
const key = (target: Element, name: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
  );
};

/**
 * Function setup
 *
 * @description
 * Creates the interactive host fixture and returns its trigger, listbox and current option query.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; root: HTMLElement; button: HTMLButtonElement; list: HTMLElement; options: () => HTMLElement[] }>} Stable rendered menu-select test harness.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  root: HTMLElement;
  button: HTMLButtonElement;
  list: HTMLElement;
  options: () => HTMLElement[];
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  const button: HTMLButtonElement = get<HTMLButtonElement>(root, 'ui-menu-select button');
  const list: HTMLElement = get<HTMLElement>(root, '[role="listbox"]');
  const options = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[role="option"]')];
  return { fixture, root, button, list, options };
}

describe('MenuSelectComponent', () => {
  it('shows the chosen option with its icon and names itself through a hidden label', async () => {
    const { root, button } = await setup();
    expect(button.textContent).toContain('Sombre');
    expect(button.querySelector('.icon')?.textContent).toBe('dark');
    const [labelId] = (button.getAttribute('aria-labelledby') ?? '').split(' ');
    expect(root.querySelector(`#${labelId}`)?.textContent).toBe('Thème');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on click with the focus on the list and the chosen option active', async () => {
    const { fixture, root, button, list, options } = await setup();
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('ui-menu-select')?.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(list);
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[1]?.id);
    expect(options()[1]?.getAttribute('aria-selected')).toBe('true');
    expect(options()[2]?.getAttribute('lang')).toBe('fr');
  });

  it('moves with the arrows (wrapping), chooses with Enter and gives the focus back', async () => {
    const { fixture, button, list, options } = await setup();
    key(button, 'ArrowDown');
    await fixture.whenStable();
    key(list, 'ArrowDown');
    key(list, 'ArrowDown');
    await fixture.whenStable();
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[0]?.id);
    key(list, 'End');
    key(list, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('light');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('closes on Escape without choosing, and on a press outside', async () => {
    const { fixture, root, button, list } = await setup();
    button.click();
    await fixture.whenStable();
    key(list, 'Home');
    key(list, 'Escape');
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('dark');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    await fixture.whenStable();
    get(root, '#outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('chooses an option on click', async () => {
    const { fixture, button, options } = await setup();
    button.click();
    await fixture.whenStable();
    options()[0]?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('system');
    expect(button.textContent).toContain('Système');
  });

  it('opens with ArrowUp, ignores other keys on the button and closes on a second click', async () => {
    const { fixture, button, list, options } = await setup();
    key(button, 'a');
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    key(button, 'ArrowUp');
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');

    // Already open: the arrows belong to the list.
    key(button, 'ArrowDown');
    await fixture.whenStable();
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[1]?.id);
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('moves up with ArrowUp and lets Tab leave without taking the focus back', async () => {
    const { fixture, button, list, options } = await setup();
    button.click();
    await fixture.whenStable();
    key(list, 'ArrowUp');
    await fixture.whenStable();
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[0]?.id);
    key(list, 'Tab');
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(button);
    key(list, 'Tab');
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.value()).toBe('dark');
  });

  it('follows the pointer over the options and ignores the space between them', async () => {
    const { fixture, root, button, list, options } = await setup();
    button.click();
    await fixture.whenStable();
    options()[2]?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await fixture.whenStable();
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[2]?.id);
    expect(options()[2]?.hasAttribute('data-active')).toBe(true);
    options()[2]?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    list.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await fixture.whenStable();
    expect(list.getAttribute('aria-activedescendant')).toBe(options()[2]?.id);

    list.click();
    get(root, 'ui-menu-select').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.value()).toBe('dark');
  });

  it('fades the list in without unrolling it when the visitor prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    const frame = (): Promise<unknown> => new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const { fixture, root, button, list } = await setup();
      button.click();
      await fixture.whenStable();
      await frame();
      await frame();
      expect(
        get<HTMLElement>(root, '[role="listbox"] > [role="none"]').hasAttribute('data-on'),
      ).toBe(true);
      expect(Number(list.style.opacity)).toBeGreaterThan(0);
      expect(list.style.clipPath).toBe('');
      expect(list.style.translate).toBe('');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  describe('defaults', () => {
    /**
     * Function defaults
     *
     * @description
     * Creates the defaults host fixture and returns its trigger and listbox for omitted-input assertions.
     *
     * @returns {Promise<{ fixture: ComponentFixture<DefaultsHostComponent>; root: HTMLElement; button: HTMLButtonElement; list: HTMLElement }>} Stable defaults fixture handles.
     */
    async function defaults(): Promise<{
      fixture: ComponentFixture<DefaultsHostComponent>;
      root: HTMLElement;
      button: HTMLButtonElement;
      list: HTMLElement;
    }> {
      const fixture: ComponentFixture<DefaultsHostComponent> =
        TestBed.createComponent(DefaultsHostComponent);
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      return {
        fixture,
        root,
        button: get<HTMLButtonElement>(root, 'ui-menu-select button'),
        list: get<HTMLElement>(root, '[role="listbox"]'),
      };
    }

    it('shows the first option for an unknown value, medium-sized and unrolling below', async () => {
      const { root, button, list } = await defaults();
      expect(button.textContent).toContain('Français');
      expect(button.className).toContain('h-11');
      expect(list.className).toContain('top-[calc(100%+4px)]');
      expect(get(root, '[role="option"]').className).toContain('min-h-10');
    });

    it('opens an empty menu without an active option', async () => {
      const { fixture, button, list } = await defaults();
      fixture.componentInstance.options.set([]);
      await fixture.whenStable();
      button.click();
      await fixture.whenStable();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(list.hasAttribute('aria-activedescendant')).toBe(false);
      key(list, 'Enter');
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe('de');
    });
  });
});
