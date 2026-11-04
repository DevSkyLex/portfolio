import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { SelectionBarComponent } from '@internal/ui/lib/selection-bar/selection-bar.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * A checkbox outside the bar, a search field, and the bar with one projected action that empties the
 * selection like a successful bulk action.
 */
@Component({
  imports: [SelectionBarComponent],
  template: `
    <input type="checkbox" aria-label="Ligne 1" />
    <input type="search" aria-label="Recherche" />
    <button type="button" #fallback>Repli</button>
    <ui-selection-bar
      label="Actions sur la sélection"
      clearLabel="Effacer la sélection"
      [clearHint]="['Échap']"
      [count]="count()"
      [countLabel]="countLabel"
      [returnFocus]="fallback"
      (cleared)="count.set(0); clears = clears + 1"
    >
      <button type="button" data-action (click)="count.set(0)">Publier</button>
    </ui-selection-bar>
  `,
})
class HostComponent {
  public readonly count: WritableSignal<number> = signal<number>(0);
  public clears: number = 0;
  public readonly countLabel: (count: number) => string = (count: number): string =>
    count < 2 ? `${count} sélectionné` : `${count} sélectionnés`;
}

/** Handles returned by `setup`. */
interface Harness {
  readonly fixture: ComponentFixture<HostComponent>;
  readonly host: HostComponent;
  readonly root: HTMLElement;
  readonly stable: () => Promise<void>;
  readonly panel: () => HTMLElement | null;
}

/**
 * Function setup
 *
 * @description
 * Renders the host attached to the document, so that focus moves are real.
 *
 * @returns {Promise<Harness>} Fixture handles.
 */
async function setup(): Promise<Harness> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  return {
    fixture,
    host: fixture.componentInstance,
    root,
    stable: async (): Promise<void> => fixture.whenStable(),
    panel: (): HTMLElement | null => root.querySelector('[data-slot="selection-bar-panel"]'),
  };
}

/**
 * Function escape
 *
 * @description
 * Dispatches a bubbling Escape keydown from an element.
 *
 * @param {Element} from - Event target.
 * @returns {KeyboardEvent} The event, to read `defaultPrevented`.
 */
function escape(from: Element): KeyboardEvent {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  from.dispatchEvent(event);
  return event;
}

describe('SelectionBarComponent', (): void => {
  afterEach((): void => {
    document.body.replaceChildren();
  });

  it('shows from one item: a named region, the plural count, the actions and the clear button', async (): Promise<void> => {
    const { root, host, stable, panel } = await setup();
    const bar: HTMLElement = root.querySelector('ui-selection-bar') as HTMLElement;
    expect(bar.getAttribute('data-slot')).toBe('selection-bar');
    // No height in the flow: sticky at the bottom, the panel rises above it, centred.
    expect(bar.className).toContain('sticky');
    expect(bar.className).toContain('h-0');
    expect(bar.className).toContain('justify-center');
    expect(panel()).toBeNull();
    expect(root.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('');

    host.count.set(1);
    await stable();
    expect(panel()?.getAttribute('role')).toBe('region');
    expect(panel()?.getAttribute('aria-label')).toBe('Actions sur la sélection');
    expect(panel()?.className).toContain('rounded-lg');
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '1 sélectionné',
    );
    expect(root.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('1 sélectionné');
    expect(panel()?.querySelector('[data-action]')?.textContent).toBe('Publier');

    host.count.set(3);
    await stable();
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '3 sélectionnés',
    );
    const clear: HTMLButtonElement = root.querySelector(
      '[data-slot="selection-bar-clear"]',
    ) as HTMLButtonElement;
    expect(clear.getAttribute('aria-label')).toBe('Effacer la sélection');
    expect(clear.getAttribute('aria-keyshortcuts')).toBe('Escape');
    clear.click();
    await stable();
    expect(host.clears).toBe(1);
    expect(panel()).toBeNull();
  });

  it('clears on Escape from the page or a checkbox, not from a text field or a handled key', async (): Promise<void> => {
    const { root, host, stable } = await setup();
    host.count.set(2);
    await stable();
    const search: HTMLInputElement = root.querySelector('input[type="search"]') as HTMLInputElement;
    expect(escape(search).defaultPrevented).toBe(false);
    const handled: KeyboardEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(host.clears).toBe(0);

    const checkbox: HTMLInputElement = root.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(escape(checkbox).defaultPrevented).toBe(true);
    await stable();
    expect(host.clears).toBe(1);
    expect(host.count()).toBe(0);
    // Nothing selected: Escape is left alone.
    expect(escape(document.body).defaultPrevented).toBe(false);
  });

  it('gives the focus back to where it came from when the selection empties from the bar', async (): Promise<void> => {
    const { root, host, stable } = await setup();
    const checkbox: HTMLInputElement = root.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.focus();
    host.count.set(1);
    await stable();
    const action: HTMLButtonElement = root.querySelector('[data-action]') as HTMLButtonElement;
    action.focus();
    action.click();
    await stable();
    expect(document.activeElement).toBe(checkbox);

    // The element the focus came from is gone: the fallback takes it.
    host.count.set(1);
    await stable();
    checkbox.focus();
    (root.querySelector('[data-action]') as HTMLButtonElement).focus();
    checkbox.remove();
    (root.querySelector('[data-action]') as HTMLButtonElement).click();
    await stable();
    expect(document.activeElement?.textContent).toBe('Repli');
  });

  it('still gives the focus back when a disabled action dropped it on the body', async (): Promise<void> => {
    const { root, host, stable } = await setup();
    const checkbox: HTMLInputElement = root.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.focus();
    host.count.set(2);
    await stable();
    const action: HTMLButtonElement = root.querySelector('[data-action]') as HTMLButtonElement;
    action.focus();
    // A running bulk action disables its button: the browser drops the focus on the body.
    action.blur();
    expect(document.activeElement).toBe(document.body);
    host.count.set(0);
    await stable();
    expect(document.activeElement).toBe(checkbox);
  });

  it('leaves the focus alone when it is outside the bar', async (): Promise<void> => {
    const { root, host, stable } = await setup();
    const search: HTMLInputElement = root.querySelector('input[type="search"]') as HTMLInputElement;
    host.count.set(1);
    await stable();
    search.focus();
    host.count.set(0);
    await stable();
    expect(document.activeElement).toBe(search);
  });
});
