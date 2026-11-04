import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, disabled, form, validate, type FieldTree } from '@angular/forms/signals';
import { FieldComponent } from '@internal/ui/lib/field/field.component';
import { TagsInputComponent } from '@internal/ui/lib/tags-input/tags-input.component';
import { tagsInputVariants } from '@internal/ui/lib/tags-input/constants/tags-input.variants';

/**
 * Interface TagsModel
 *
 * @description
 * Form model of the hosts.
 */
interface TagsModel {
  techs: readonly string[];
  locked: boolean;
}

/**
 * Component FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds the tags input to a Signal Form inside a `ui-field`, with a limit of three lowercase tags.
 */
@Component({
  imports: [TagsInputComponent, FieldComponent, FormField],
  template: `
    <ui-field label="Technos" controlId="techs" [error]="error()">
      <ui-tags-input
        controlId="techs"
        placeholder="angular, typescript"
        ariaLabel="Technos"
        ariaDescribedby="techs-hint"
        [maxTags]="3"
        [maxTagLength]="8"
        [normalize]="lower"
        [formField]="tags.techs"
      />
    </ui-field>
    <button type="button" id="after">Après</button>
  `,
})
class FormHostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Source model of the form.
   *
   * @type {WritableSignal<TagsModel>}
   */
  public readonly model: WritableSignal<TagsModel> = signal<TagsModel>({
    techs: ['angular'],
    locked: false,
  });

  /**
   * Property tags
   * @readonly
   *
   * @description
   * Form tree: no `php` tag, disabled while `locked`.
   *
   * @type {FieldTree<TagsModel>}
   */
  public readonly tags: FieldTree<TagsModel, string | number, 'writable'> = form(
    this.model,
    (path) => {
      validate(path.techs, ({ value }) =>
        value().includes('php') ? { kind: 'php', message: 'Pas de PHP.' } : null,
      );
      disabled(path.techs, ({ valueOf }) => valueOf(path.locked));
    },
  );

  /**
   * Property error
   * @readonly
   *
   * @description
   * Message shown by the field.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property lower
   * @readonly
   *
   * @description
   * Normalizer of the tags.
   *
   * @type {(raw: string) => string}
   */
  public readonly lower: (raw: string) => string = (raw: string): string =>
    raw.trim().toLowerCase();
  // #endregion
}

/**
 * Component ModelHostComponent
 * @class ModelHostComponent
 *
 * @description
 * Binds the tags input with two-way binding and the default rules.
 */
@Component({
  imports: [TagsInputComponent],
  template: `<ui-tags-input
    size="sm"
    mono
    form="outer"
    [(value)]="tags"
    [disabled]="locked()"
    [ariaInvalid]="flagged()"
  />`,
})
class ModelHostComponent {
  // #region Properties
  /**
   * Property tags
   * @readonly
   *
   * @description
   * Bound tags.
   *
   * @type {WritableSignal<readonly string[]>}
   */
  public readonly tags: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property locked
   * @readonly
   *
   * @description
   * Disabled state.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly locked: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property flagged
   * @readonly
   *
   * @description
   * Explicit invalid state.
   *
   * @type {WritableSignal<boolean | undefined>}
   */
  public readonly flagged: WritableSignal<boolean | undefined> = signal<boolean | undefined>(
    undefined,
  );
  // #endregion
}

/**
 * Function key
 *
 * @description
 * Dispatches a cancelable keydown on an element.
 *
 * @param {Element} target - Element receiving the key.
 * @param {string} name - Key value.
 *
 * @returns {KeyboardEvent} The dispatched event.
 */
function key(target: Element, name: string): KeyboardEvent {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Function paste
 *
 * @description
 * Dispatches a cancelable paste carrying a text.
 *
 * @param {Element} target - Element receiving the paste.
 * @param {string} text - Clipboard text.
 *
 * @returns {ClipboardEvent} The dispatched event.
 */
function paste(target: Element, text: string): ClipboardEvent {
  const event: ClipboardEvent = new Event('paste', { cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', { value: { getData: (): string => text } });
  target.dispatchEvent(event);
  return event;
}

describe('TagsInputComponent', () => {
  /**
   * Function setupForm
   *
   * @description
   * Renders the form host.
   *
   * @returns {Promise<{ fixture: ComponentFixture<FormHostComponent>; host: HTMLElement; input: HTMLInputElement }>}
   * The fixture, the box and its text input.
   */
  async function setupForm(): Promise<{
    fixture: ComponentFixture<FormHostComponent>;
    host: HTMLElement;
    input: HTMLInputElement;
  }> {
    const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement.querySelector('ui-tags-input');
    const input: HTMLInputElement = host.querySelector('input') as HTMLInputElement;
    return { fixture, host, input };
  }

  /**
   * Function setupModel
   *
   * @description
   * Renders the two-way binding host.
   *
   * @returns {Promise<{ fixture: ComponentFixture<ModelHostComponent>; host: HTMLElement; input: HTMLInputElement }>}
   * The fixture, the box and its text input.
   */
  async function setupModel(): Promise<{
    fixture: ComponentFixture<ModelHostComponent>;
    host: HTMLElement;
    input: HTMLInputElement;
  }> {
    const fixture: ComponentFixture<ModelHostComponent> =
      TestBed.createComponent(ModelHostComponent);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement.querySelector('ui-tags-input');
    const input: HTMLInputElement = host.querySelector('input') as HTMLInputElement;
    return { fixture, host, input };
  }

  /**
   * Function type
   *
   * @description
   * Types a text in the input, then presses a key.
   *
   * @param {ComponentFixture<unknown>} fixture - Fixture to stabilize.
   * @param {HTMLInputElement} input - Text input.
   * @param {string} text - Typed text.
   * @param {string} [name] - Key pressed after it.
   *
   * @returns {Promise<KeyboardEvent>} The key event.
   */
  async function type(
    fixture: ComponentFixture<unknown>,
    input: HTMLInputElement,
    text: string,
    name: string = 'Enter',
  ): Promise<KeyboardEvent> {
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.setSelectionRange(text.length, text.length);
    const event: KeyboardEvent = key(input, name);
    await fixture.whenStable();
    return event;
  }

  /**
   * Function removeButtons
   *
   * @description
   * Remove buttons of the rendered tags.
   *
   * @param {HTMLElement} host - Box.
   *
   * @returns {HTMLButtonElement[]} The buttons in order.
   */
  function removeButtons(host: HTMLElement): HTMLButtonElement[] {
    return [...host.querySelectorAll<HTMLButtonElement>('[data-slot="tags-input-remove"]')];
  }

  afterEach((): void => {
    document.body.innerHTML = '';
  });

  it('draws the input box with a focus ring on the whole control', () => {
    const classes: string[] = tagsInputVariants({ size: 'sm' }).split(' ');
    expect(classes).toEqual(
      expect.arrayContaining([
        'min-h-8',
        'rounded-sm',
        'bg-surface-field',
        'border-border-field',
        'has-focus-visible:border-accent/55',
        'focus-within:outline-accent/12',
      ]),
    );
    expect(tagsInputVariants().split(' ')).toEqual(
      expect.arrayContaining(['min-h-9', 'rounded-md']),
    );
  });

  it('renders the value as a named list of badges with named remove buttons', async () => {
    const { host, input } = await setupForm();
    const list: HTMLElement | null = host.querySelector('[role="list"]');
    expect(list?.getAttribute('aria-label')).toBe('Technos');
    const items: HTMLElement[] = [...host.querySelectorAll<HTMLElement>('[role="listitem"]')];
    expect(items.map((item) => item.textContent?.trim())).toEqual(['angular']);
    expect(items[0]?.getAttribute('data-slot')).toBe('tags-input-tag');
    expect(items[0]?.className).toContain('border-border');
    expect(removeButtons(host)[0]?.getAttribute('aria-label')).toBe('Retirer angular');
    expect(removeButtons(host)[0]?.tabIndex).toBe(-1);
    expect(input.placeholder).toBe('');
    expect(input.getAttribute('aria-describedby')).toBe('techs-hint');
    expect(input.maxLength).toBe(8);
    expect(host.getAttribute('data-slot')).toBe('tags-input');
  });

  it('names the input through the field label and shows the placeholder only when empty', async () => {
    const { fixture, host, input } = await setupForm();
    const label: HTMLLabelElement | null = fixture.nativeElement.querySelector('label');
    expect(label?.htmlFor).toBe('techs');
    expect(input.id).toBe('techs');
    fixture.componentInstance.model.update((model) => ({ ...model, techs: [] }));
    await fixture.whenStable();
    expect(input.placeholder).toBe('angular, typescript');
    expect(host.querySelector('[role="list"]')).toBeNull();
  });

  it('commits on Enter and on a separator, normalized, and announces it', async () => {
    const { fixture, host, input } = await setupForm();
    const enter: KeyboardEvent = await type(fixture, input, '  NestJS ');
    expect(enter.defaultPrevented).toBe(true);
    const comma: KeyboardEvent = await type(fixture, input, 'rxjs', ',');
    expect(comma.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.model().techs).toEqual(['angular', 'nestjs', 'rxjs']);
    expect(input.value).toBe('');
    expect(host.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('rxjs ajouté');
  });

  it('keeps the native Enter of the empty input for the form submission', async () => {
    const { fixture, input } = await setupForm();
    const enter: KeyboardEvent = await type(fixture, input, '');
    expect(enter.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.model().techs).toEqual(['angular']);
  });

  it('ignores empty text and commits typed separators reaching the input without a key', async () => {
    const { fixture, input } = await setupForm();
    await type(fixture, input, '   ');
    expect(fixture.componentInstance.model().techs).toEqual(['angular']);
    input.value = 'docker;git';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.model().techs).toEqual(['angular', 'docker']);
    expect(input.value).toBe('git');
  });

  it('splits a pasted list and pastes a plain word natively', async () => {
    const { fixture, input } = await setupForm();
    fixture.componentInstance.model.update((model) => ({ ...model, techs: [] }));
    await fixture.whenStable();
    input.value = 'x';
    const list: ClipboardEvent = paste(input, 'a, b; c');
    await fixture.whenStable();
    expect(list.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.model().techs).toEqual(['xa', 'b', 'c']);
    expect(input.value).toBe('');
    const word: ClipboardEvent = paste(input, 'word');
    expect(word.defaultPrevented).toBe(false);
  });

  it('cuts pasted tags to the longest length', async () => {
    const { fixture, input } = await setupForm();
    paste(input, 'typescript\nvue');
    await fixture.whenStable();
    expect(fixture.componentInstance.model().techs).toEqual(['angular', 'typescri', 'vue']);
  });

  it('refuses a duplicate whatever its case, flashes the existing tag and keeps the text', async () => {
    const { fixture, host, input } = await setupForm();
    await type(fixture, input, 'ANGULAR');
    expect(fixture.componentInstance.model().techs).toEqual(['angular']);
    expect(input.value).toBe('ANGULAR');
    const tag: HTMLElement | null = host.querySelector('[role="listitem"]');
    expect(tag?.hasAttribute('data-invalid')).toBe(true);
    expect(host.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe(
      'angular est déjà dans la liste',
    );
    // The mark lasts one second; zoneless stabilization cannot run under fake timers.
    await new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, 1050);
    });
    await fixture.whenStable();
    expect(tag?.hasAttribute('data-invalid')).toBe(false);
  });

  it('refuses a tag past the limit and announces it', async () => {
    const { fixture, host, input } = await setupForm();
    await type(fixture, input, 'b');
    await type(fixture, input, 'c');
    await type(fixture, input, 'd');
    expect(fixture.componentInstance.model().techs).toEqual(['angular', 'b', 'c']);
    expect(input.value).toBe('d');
    expect(host.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe(
      '3 valeurs au maximum',
    );
  });

  it('highlights the last tag on a first Backspace and removes it on the second', async () => {
    const { fixture, host, input } = await setupForm();
    await type(fixture, input, 'rxjs');
    const first: KeyboardEvent = key(input, 'Backspace');
    expect(first.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(removeButtons(host)[1]);
    key(document.activeElement as Element, 'Backspace');
    await fixture.whenStable();
    expect(fixture.componentInstance.model().techs).toEqual(['angular']);
    expect(document.activeElement).toBe(input);
    expect(host.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('rxjs retiré');
  });

  it('moves between the tags and the input with the arrows, Home and End', async () => {
    const { fixture, host, input } = await setupForm();
    await type(fixture, input, 'rxjs');
    input.setSelectionRange(0, 0);
    key(input, 'ArrowLeft');
    const [first, second] = removeButtons(host);
    expect(document.activeElement).toBe(second);
    key(second as Element, 'ArrowLeft');
    expect(document.activeElement).toBe(first);
    key(first as Element, 'ArrowLeft');
    expect(document.activeElement).toBe(first);
    key(first as Element, 'ArrowRight');
    expect(document.activeElement).toBe(second);
    key(second as Element, 'ArrowRight');
    expect(document.activeElement).toBe(input);
    (second as HTMLElement).focus();
    key(second as Element, 'Home');
    expect(document.activeElement).toBe(first);
    key(first as Element, 'End');
    expect(document.activeElement).toBe(input);
    (first as HTMLElement).focus();
    key(first as Element, 'Escape');
    expect(document.activeElement).toBe(input);
    (first as HTMLElement).focus();
    key(first as Element, 'q');
    expect(document.activeElement).toBe(input);
  });

  it('keeps ArrowLeft inside typed text', async () => {
    const { fixture, input } = await setupForm();
    input.focus();
    input.value = 'ab';
    input.setSelectionRange(2, 2);
    const event: KeyboardEvent = key(input, 'ArrowLeft');
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('removes a focused tag with Delete and focuses the tag taking its place', async () => {
    const { fixture, host, input } = await setupForm();
    await type(fixture, input, 'rxjs');
    removeButtons(host)[0]?.focus();
    key(document.activeElement as Element, 'Delete');
    await fixture.whenStable();
    expect(fixture.componentInstance.model().techs).toEqual(['rxjs']);
    expect(document.activeElement).toBe(removeButtons(host)[0]);
  });

  it('removes a clicked tag and returns the focus to the input', async () => {
    const { fixture, host, input } = await setupForm();
    removeButtons(host)[0]?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().techs).toEqual([]);
    expect(document.activeElement).toBe(input);
  });

  it('clears the typed text on Escape without letting the key out', async () => {
    const { fixture, input } = await setupForm();
    const outside: (event: Event) => void = vi.fn();
    document.body.addEventListener('keydown', outside);
    const event: KeyboardEvent = await type(fixture, input, 'draft', 'Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    expect(outside).not.toHaveBeenCalled();
    key(input, 'Escape');
    expect(outside).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('keydown', outside);
  });

  it('commits the typed text and marks the field touched when the focus leaves', async () => {
    const { fixture, host, input } = await setupForm();
    expect(fixture.componentInstance.tags.techs().touched()).toBe(false);
    input.focus();
    input.value = 'php';
    input.dispatchEvent(new Event('input'));
    removeButtons(host)[0]?.focus();
    expect(fixture.componentInstance.tags.techs().touched()).toBe(false);
    (fixture.nativeElement.querySelector('#after') as HTMLButtonElement).focus();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().techs).toEqual(['angular', 'php']);
    expect(fixture.componentInstance.tags.techs().touched()).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.hasAttribute('data-invalid')).toBe(true);
  });

  it('reflects the field error on the input', async () => {
    const { fixture, host, input } = await setupForm();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    fixture.componentInstance.error.set('Erreur du serveur.');
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.className).toContain('data-invalid:border-danger');
  });

  it('disables the input and hides the remove buttons with the form rule', async () => {
    const { fixture, host, input } = await setupForm();
    fixture.componentInstance.model.update((model) => ({ ...model, locked: true }));
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
    expect(removeButtons(host)).toHaveLength(0);
    expect(host.hasAttribute('data-disabled')).toBe(true);
  });

  it('writes the two-way value, with the dense mono look and the form attribute', async () => {
    const { fixture, host, input } = await setupModel();
    expect(input.getAttribute('form')).toBe('outer');
    expect(host.className).toContain('min-h-8');
    expect(input.className).toContain('font-mono');
    await type(fixture, input, 'Angular');
    await type(fixture, input, 'angular');
    expect(fixture.componentInstance.tags()).toEqual(['Angular']);
    const tag: HTMLElement | null = host.querySelector('[role="listitem"]');
    expect(tag?.className).toContain('font-mono');
    expect(tag?.className).toContain('rounded-xs');
  });

  it('lets an explicit invalid state override the touched rule', async () => {
    const { fixture, input } = await setupModel();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    fixture.componentInstance.flagged.set(true);
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('focuses the input on a click in the empty part of the box, not when disabled', async () => {
    const { fixture, host, input } = await setupModel();
    host.click();
    expect(document.activeElement).toBe(input);
    input.blur();
    fixture.componentInstance.locked.set(true);
    fixture.componentInstance.tags.set(['a']);
    await fixture.whenStable();
    host.click();
    expect(document.activeElement).not.toBe(input);
    expect(host.querySelector('[role="listitem"]')?.className).toContain('pe-2');
  });
});
