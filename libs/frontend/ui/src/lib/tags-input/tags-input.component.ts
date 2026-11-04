import { _IdGenerator } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { BadgeDirective } from '@internal/ui/lib/badge/badge.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import { TAGS_INPUT_ANNOUNCEMENTS } from '@internal/ui/lib/tags-input/constants/tags-input.constants';
import {
  type TagsInputSize,
  tagsInputVariants,
} from '@internal/ui/lib/tags-input/constants/tags-input.variants';
import type { TagsInputAnnouncements } from '@internal/ui/lib/tags-input/models/tags-input-announcements.interface';

/**
 * Function optionalNumber
 *
 * @description
 * Attribute transform of the optional limits: an empty or absent value means no limit.
 *
 * @param {unknown} value - Bound or attribute value.
 *
 * @returns {number | undefined} The limit, or `undefined`.
 */
function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const limit: number = Number(value);
  return Number.isFinite(limit) ? limit : undefined;
}

/**
 * Component TagsInputComponent
 * @class TagsInputComponent
 *
 * @description
 * Edits a list of short strings as tags ("chips input"): each value is an outlined `uiBadge` with a
 * remove button, followed by a borderless text input that takes the remaining width of the wrapping
 * box. Binds through Signal Forms (`FormValueControl<readonly string[]>`) or the `value` model.
 *
 * Keyboard: Enter or a separator key (`,` and `;` by default) commits the typed text, and leaving the
 * control (Tab, a click outside) commits it too; a paste holding a separator is split into tags.
 * Backspace in the empty input moves the focus to the last tag (the highlight), a second Backspace
 * removes it. On a tag, Backspace or Delete removes it and the focus moves to the tag taking its place,
 * or to the input after the last one; ArrowLeft / ArrowRight and Home / End move between the tags and
 * the input; Escape clears the typed text. The control is one tab stop: the tags are reached with the
 * arrows. Refused text (empty, a duplicate, past `maxTags`) stays in the input; a duplicate flashes the
 * existing tag. Additions, removals and refusals are announced in a polite live region.
 *
 * Inside a `ui-field`, the text input carries `aria-invalid` while the field shows its error.
 *
 * ```html
 * <ui-tags-input controlId="techs" size="sm" mono [maxTags]="12" [formField]="form.techs" />
 * ```
 */
@Component({
  selector: 'ui-tags-input',
  imports: [BadgeDirective, NgIcon],
  templateUrl: './tags-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-invalid]': 'showInvalid() || null',
    '[attr.data-disabled]': 'disabled() || null',
    'data-slot': 'tags-input',
    '(click)': 'onHostClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class TagsInputComponent implements FormValueControl<readonly string[]> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Current tags, exposed as a model signal for Signal Forms and two-way binding.
   *
   * @type {ModelSignal<readonly string[]>}
   */
  public readonly value: ModelSignal<readonly string[]> = model<readonly string[]>([]);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables the text input and hides the remove buttons.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Validation state bound by Signal Forms; shown once the control is touched.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property touched
   * @readonly
   *
   * @description
   * Whether the control was left once. Signal Forms binds it, so an invalid list turns red after the
   * field is left or the form submitted; unbound, `invalid` shows at once.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly touched: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property required
   * @readonly
   *
   * @description
   * Exposes the required state as `aria-required` on the text input.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property name
   * @readonly
   *
   * @description
   * Native name of the text input; an empty value is omitted.
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input<string>('');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Box size: `sm` 32 px (dense admin forms), `md` 36 px (default, the height of `uiInput size="sm"`).
   *
   * @type {InputSignal<TagsInputSize>}
   */
  public readonly size: InputSignal<TagsInputSize> = input<TagsInputSize>('md');

  /**
   * Property mono
   * @readonly
   *
   * @description
   * Sets the tags and the typed text in Geist Mono at 12 px, for keys and identifiers.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly mono: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Placeholder of the text input, shown only while the list is empty.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>('');

  /**
   * Property separators
   * @readonly
   *
   * @description
   * Characters that commit the typed text when typed and split a pasted text; a pasted line break
   * always splits.
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly separators: InputSignal<readonly string[]> = input<readonly string[]>([',', ';']);

  /**
   * Property maxTags
   * @readonly
   *
   * @description
   * Largest number of tags; a tag past it is refused and announced. No limit by default.
   *
   * @type {InputSignalWithTransform<number | undefined, unknown>}
   */
  public readonly maxTags: InputSignalWithTransform<number | undefined, unknown> = input<
    number | undefined,
    unknown
  >(undefined, { transform: optionalNumber });

  /**
   * Property maxTagLength
   * @readonly
   *
   * @description
   * Longest tag in characters, applied as the input's `maxlength` and to pasted tags. Not named
   * `maxLength`: Signal Forms binds that input from a `maxLength()` rule, which bounds the list.
   *
   * @type {InputSignalWithTransform<number | undefined, unknown>}
   */
  public readonly maxTagLength: InputSignalWithTransform<number | undefined, unknown> = input<
    number | undefined,
    unknown
  >(undefined, { transform: optionalNumber });

  /**
   * Property normalize
   * @readonly
   *
   * @description
   * Turns the typed text into the stored tag, before the empty and duplicate checks; trims by default.
   *
   * @type {InputSignal<(raw: string) => string>}
   */
  public readonly normalize: InputSignal<(raw: string) => string> = input<(raw: string) => string>(
    (raw: string): string => raw.trim(),
  );

  /**
   * Property caseSensitive
   * @readonly
   *
   * @description
   * Whether tags differing only by case are distinct; by default `Angular` duplicates `angular`.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly caseSensitive: InputSignalWithTransform<boolean, unknown> = input<
    boolean,
    unknown
  >(false, { transform: booleanAttribute });

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Id of the text input, the target of a label's `for`; generated once per application by default.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input<string>(
    inject<_IdGenerator>(_IdGenerator).getId('ui-tags-input-'),
  );

  /**
   * Property form
   * @readonly
   *
   * @description
   * Id of a `<form>` the text input belongs to when it sits outside it, so that Enter in the empty
   * input still submits that form.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly form: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name of the list of tags.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.tags-input.list:Valeurs saisies`,
  );

  /**
   * Property ariaLabelledby
   * @readonly
   *
   * @description
   * Id of a visible label of the text input, for a control without a label `for`.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Ids of the hint or error describing the text input.
   *
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | null | undefined> = input<string | null>();

  /**
   * Property ariaInvalid
   * @readonly
   *
   * @description
   * Displayed invalid state, overriding the touched rule, for a control outside a `ui-field` whose
   * message shows on other conditions (server field errors).
   *
   * @type {InputSignal<boolean | undefined>}
   */
  public readonly ariaInvalid: InputSignal<boolean | undefined> = input<boolean>();

  /**
   * Property removeLabel
   * @readonly
   *
   * @description
   * Verb before the tag in the remove button's name ("Retirer codeigniter").
   *
   * @type {InputSignal<string>}
   */
  public readonly removeLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.tags-input.remove:Retirer`,
  );

  /**
   * Property announcements
   * @readonly
   *
   * @description
   * Live-region messages for additions, removals and refusals.
   *
   * @type {InputSignal<TagsInputAnnouncements>}
   */
  public readonly announcements: InputSignal<TagsInputAnnouncements> =
    input<TagsInputAnnouncements>(TAGS_INPUT_ANNOUNCEMENTS);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged onto the box.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the focus leaves the control, so a form control can be marked touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property field
   * @readonly
   *
   * @description
   * Enclosing `ui-field`, if any.
   *
   * @type {FieldHost | null}
   */
  private readonly field: FieldHost | null = inject<FieldHost>(FIELD_HOST, { optional: true });

  /**
   * Property showInvalid
   * @readonly
   *
   * @description
   * Invalid state as displayed: `ariaInvalid` when bound, else invalid and touched, or the error
   * shown by the enclosing `ui-field`.
   *
   * @type {Signal<boolean>}
   */
  public readonly showInvalid: Signal<boolean> = computed<boolean>(
    () => this.ariaInvalid() ?? ((this.invalid() && this.touched()) || !!this.field?.invalid()),
  );

  /**
   * Property announcement
   * @readonly
   *
   * @description
   * Last message of the live region.
   *
   * @type {WritableSignal<string>}
   */
  protected readonly announcement: WritableSignal<string> = signal<string>('');

  /**
   * Property flashed
   * @readonly
   *
   * @description
   * Index of the tag briefly marked after a duplicate was refused.
   *
   * @type {WritableSignal<number | null>}
   */
  protected readonly flashed: WritableSignal<number | null> = signal<number | null>(null);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Remove icon of the tags.
   *
   * @type {{ readonly remove: typeof lucideX }}
   */
  protected readonly icons: { readonly remove: typeof lucideX } = { remove: lucideX } as const;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Box variant merged with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(tagsInputVariants({ size: this.size() }), this.class()),
  );

  /**
   * Property tagClasses
   * @readonly
   *
   * @description
   * Badge overrides: room for the trailing button, the highlight while its button has the keyboard
   * focus, the mono face, and the D43 nesting radius at `sm` (6 px box, 5 px gap: `2xs`).
   *
   * @type {Signal<string>}
   */
  protected readonly tagClasses: Signal<string> = computed<string>(() =>
    cn(
      'max-w-full bg-surface-hover pe-0.5 has-focus-visible:bg-surface-selected data-invalid:border-danger',
      this.disabled() && 'pe-2',
      this.mono() && 'font-mono',
      this.size() === 'sm' && 'rounded-xs',
    ),
  );

  /**
   * Property inputClasses
   * @readonly
   *
   * @description
   * Borderless text input taking the rest of the row, wrapping below 80 px.
   *
   * @type {Signal<string>}
   */
  protected readonly inputClasses: Signal<string> = computed<string>(() =>
    cn(
      'h-5 w-20 min-w-0 grow bg-transparent px-1.5 text-fg outline-none placeholder:text-fg-faint disabled:cursor-not-allowed',
      this.mono() && 'font-mono text-[12px]',
    ),
  );

  /**
   * Property control
   * @readonly
   *
   * @description
   * Text input.
   *
   * @type {Signal<ElementRef<HTMLInputElement>>}
   */
  private readonly control: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

  /**
   * Property host
   * @readonly
   *
   * @description
   * Box element, which holds the remove buttons.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the deferred focus after a removal.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property flashTimer
   *
   * @description
   * Timer ending the duplicate mark, cleared with the component.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  private flashTimer: ReturnType<typeof setTimeout> | undefined;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears the duplicate mark timer on destroy.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy((): void => clearTimeout(this.flashTimer));
  }
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves the focus to the text input.
   *
   * @param {FocusOptions} [options] - Native focus options.
   *
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Method onInputKeydown
   * @method onInputKeydown
   *
   * @description
   * Commits on Enter or a separator, highlights the last tag on Backspace in the empty input, reaches
   * the tags with ArrowLeft at the start of the text and clears the text on Escape. Enter in the empty
   * input keeps its native behaviour (the form's implicit submission).
   *
   * @param {KeyboardEvent} event - Key event of the text input.
   *
   * @returns {void}
   */
  protected onInputKeydown(event: KeyboardEvent): void {
    const element: HTMLInputElement = event.target as HTMLInputElement;
    if (event.isComposing) return;
    const atStart: boolean = element.selectionStart === 0 && element.selectionEnd === 0;
    if (event.key === 'Enter' && element.value !== '') {
      event.preventDefault();
      this.commitDraft();
    } else if (this.separators().includes(event.key)) {
      event.preventDefault();
      this.commitDraft();
    } else if (
      (event.key === 'Backspace' && element.value === '') ||
      (event.key === 'ArrowLeft' && atStart)
    ) {
      if (this.value().length === 0) return;
      event.preventDefault();
      this.focusTag(this.value().length - 1);
    } else if (event.key === 'Escape' && element.value !== '') {
      // Handled here, so an enclosing sheet or dialog stays open.
      event.preventDefault();
      event.stopPropagation();
      element.value = '';
    }
  }

  /**
   * Method onInput
   * @method onInput
   *
   * @description
   * Commits the segments before a separator that reached the text without a key event (an IME, a
   * drop); the text after the last separator stays typed.
   *
   * @param {Event} event - Input event of the text input.
   *
   * @returns {void}
   */
  protected onInput(event: Event): void {
    const element: HTMLInputElement = event.target as HTMLInputElement;
    const segments: string[] = this.split(element.value);
    if (segments.length < 2) return;
    const rest: string = segments.pop() ?? '';
    for (const segment of segments) this.add(segment);
    element.value = rest;
  }

  /**
   * Method onPaste
   * @method onPaste
   *
   * @description
   * Splits a pasted text holding a separator or a line break into tags, the typed text first; a text
   * without one is pasted natively.
   *
   * @param {ClipboardEvent} event - Paste event of the text input.
   *
   * @returns {void}
   */
  protected onPaste(event: ClipboardEvent): void {
    const element: HTMLInputElement = event.target as HTMLInputElement;
    const pasted: string = event.clipboardData?.getData('text') ?? '';
    const segments: string[] = this.split(element.value + pasted);
    if (segments.length < 2) return;
    event.preventDefault();
    for (const segment of segments) this.add(segment);
    element.value = '';
  }

  /**
   * Method onTagKeydown
   * @method onTagKeydown
   *
   * @description
   * Keyboard of a focused tag (its remove button): removal, moves between the tags and the input, and
   * a printable key sent to the input.
   *
   * @param {KeyboardEvent} event - Key event of the remove button.
   * @param {number} index - Position of the tag.
   *
   * @returns {void}
   */
  protected onTagKeydown(event: KeyboardEvent, index: number): void {
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        this.remove(index);
        this.focusTag(index, true);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this.focusTag(Math.max(0, index - 1));
        return;
      case 'ArrowRight':
        event.preventDefault();
        this.focusTag(index + 1);
        return;
      case 'Home':
        event.preventDefault();
        this.focusTag(0);
        return;
      case 'End':
      case 'Escape':
        event.preventDefault();
        this.focus();
        return;
      default:
        // The character then lands in the input, focused before the key's default action.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          this.focus();
        }
    }
  }

  /**
   * Method onRemoveClick
   * @method onRemoveClick
   *
   * @description
   * Removes a tag clicked with the pointer and returns the focus to the input.
   *
   * @param {number} index - Position of the tag.
   *
   * @returns {void}
   */
  protected onRemoveClick(index: number): void {
    this.remove(index);
    this.focus();
  }

  /**
   * Method onHostClick
   * @method onHostClick
   *
   * @description
   * Focuses the input when the empty part of the box is clicked.
   *
   * @param {MouseEvent} event - Click on the box.
   *
   * @returns {void}
   */
  protected onHostClick(event: MouseEvent): void {
    if (event.target === this.host && !this.disabled()) this.focus();
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * When the focus leaves the control (not when it moves between the input and the tags), commits
   * the typed text and reports the touch.
   *
   * @param {FocusEvent} event - Focus-out event bubbling to the box.
   *
   * @returns {void}
   */
  protected onFocusOut(event: FocusEvent): void {
    const next: EventTarget | null = event.relatedTarget;
    if (next instanceof Node && this.host.contains(next)) return;
    this.commitDraft();
    this.touch.emit();
  }

  /**
   * Method commitDraft
   * @method commitDraft
   *
   * @description
   * Adds the typed text as a tag and clears it when accepted; refused text stays.
   *
   * @returns {void}
   */
  private commitDraft(): void {
    const element: HTMLInputElement = this.control().nativeElement;
    if (element.value === '') return;
    if (this.add(element.value)) element.value = '';
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Normalizes a raw segment, cuts it to `maxTagLength`, then appends it unless it is empty, a
   * duplicate (the existing tag flashes) or past `maxTags`; refusals are announced.
   *
   * @param {string} raw - Typed or pasted segment.
   *
   * @returns {boolean} Whether the segment was added; an empty one counts as consumed.
   */
  private add(raw: string): boolean {
    const length: number | undefined = this.maxTagLength();
    const tag: string = this.normalize()(raw).slice(0, length);
    if (tag === '') return true;
    const tags: readonly string[] = this.value();
    const key: (value: string) => string = this.caseSensitive()
      ? (value: string): string => value
      : (value: string): string => value.toLocaleLowerCase();
    const existing: number = tags.findIndex((value: string): boolean => key(value) === key(tag));
    if (existing >= 0) {
      this.flash(existing);
      this.announcement.set(this.announcements().duplicate(tags[existing] ?? tag));
      return false;
    }
    const max: number | undefined = this.maxTags();
    if (max !== undefined && tags.length >= max) {
      this.announcement.set(this.announcements().limit(max));
      return false;
    }
    this.value.set([...tags, tag]);
    this.announcement.set(this.announcements().added(tag));
    return true;
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes the tag at a position and announces it.
   *
   * @param {number} index - Position of the tag.
   *
   * @returns {void}
   */
  private remove(index: number): void {
    const tag: string | undefined = this.value()[index];
    if (tag === undefined || this.disabled()) return;
    this.value.set(
      this.value().filter((_: string, position: number): boolean => position !== index),
    );
    this.announcement.set(this.announcements().removed(tag));
  }

  /**
   * Method focusTag
   * @method focusTag
   *
   * @description
   * Focuses the remove button of a tag, or the input past the last tag.
   *
   * @param {number} index - Position of the tag.
   * @param {boolean} [afterRender] - Waits for the next render, after a removal changed the list.
   *
   * @returns {void}
   */
  private focusTag(index: number, afterRender: boolean = false): void {
    const move: () => void = (): void => {
      const target: HTMLButtonElement | undefined = this.host.querySelectorAll<HTMLButtonElement>(
        '[data-slot="tags-input-remove"]',
      )[index];
      if (target) target.focus();
      else this.focus();
    };
    if (afterRender) afterNextRender(move, { injector: this.injector });
    else move();
  }

  /**
   * Method flash
   * @method flash
   *
   * @description
   * Marks a tag with the danger border for one second.
   *
   * @param {number} index - Position of the tag.
   *
   * @returns {void}
   */
  private flash(index: number): void {
    clearTimeout(this.flashTimer);
    this.flashed.set(index);
    this.flashTimer = setTimeout((): void => this.flashed.set(null), 1000);
  }

  /**
   * Method split
   * @method split
   *
   * @description
   * Cuts a text at every separator and line break.
   *
   * @param {string} text - Typed or pasted text.
   *
   * @returns {string[]} Segments, the last one possibly empty.
   */
  private split(text: string): string[] {
    let segments: string[] = text.split(/\r?\n/);
    for (const separator of this.separators()) {
      segments = segments.flatMap((segment: string): string[] => segment.split(separator));
    }
    return segments;
  }
  // #endregion
}
