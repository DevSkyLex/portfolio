import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import {
  Directive,
  type ElementRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { lucideCalendar } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { POSITIONS } from '@internal/ui/lib/date-picker/constants/date-picker.constants';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';
import { MonthCalendarComponent } from '@internal/ui/lib/month-calendar/month-calendar.component';

/**
 * Class MonthPopoverBase
 * @class MonthPopoverBase
 *
 * @description
 * Trigger and dialog behaviour shared by `ui-month-picker` and `ui-period-picker`, as in
 * `ui-date-picker`: a field-styled button opens a focus-trapped dialog holding a
 * `ui-month-calendar`; Escape and an outside click close it, and focus returns to the trigger
 * unless the user moved it elsewhere. The invalid state shows once the control is touched or when
 * the enclosing `ui-field` shows an error, like `ui-tags-input`.
 */
@Directive()
export abstract class MonthPopoverBase {
  // #region Properties
  /**
   * Property disabled
   *
   * @description
   * Prevents opening the dialog.
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property readonly
   *
   * @description
   * Keeps the trigger focusable and showing the value, without opening the dialog.
   */
  public readonly readonly: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property invalid
   *
   * @description
   * Validation state; Signal Forms binds it, and it shows once the control is touched.
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property touched
   *
   * @description
   * Whether the control was left once; Signal Forms binds it. Unbound, `invalid` shows at once.
   */
  public readonly touched: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property required
   *
   * @description
   * Required state, exposed as `aria-required` on the trigger.
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property triggerId
   *
   * @description
   * Id of the trigger, for an external label, and base of the dialog id.
   */
  public readonly triggerId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-month-popover-'),
  );

  /**
   * Property describedBy
   *
   * @description
   * Ids of the texts describing the trigger.
   */
  public readonly describedBy: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabelledby
   *
   * @description
   * Ids naming the trigger, for a label that is not a `<label for>`; listing the trigger's own id
   * after the label's keeps the value in the name (« Période Mars – juin 2023 »).
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property size
   *
   * @description
   * Field size of the trigger.
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property class
   *
   * @description
   * Caller classes merged on the host.
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property triggerClass
   *
   * @description
   * Caller classes merged on the trigger button (height, radius, text size).
   */
  public readonly triggerClass: InputSignal<string> = input<string>('');

  /**
   * Property touch
   *
   * @description
   * Emits when the user leaves the closed trigger or closes the dialog.
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   *
   * @description
   * Calendar icon of the trigger, the one of `ui-date-picker`.
   */
  protected readonly icons: { readonly calendar: typeof lucideCalendar } = {
    calendar: lucideCalendar,
  } as const;

  /**
   * Property positions
   *
   * @description
   * Overlay placements of the dialog, shared with `ui-date-picker`.
   */
  protected readonly positions: ConnectedPosition[] = POSITIONS;

  /**
   * Property open
   *
   * @description
   * Whether the dialog is attached.
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property dialogId
   *
   * @description
   * Id of the dialog, referenced by the trigger while it is open.
   */
  protected readonly dialogId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-dialog`,
  );

  /**
   * Property locale
   *
   * @description
   * Application locale of the displayed value.
   */
  protected readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property showInvalid
   *
   * @description
   * Invalid state as displayed: invalid and touched, or the error shown by the enclosing `ui-field`.
   */
  protected readonly showInvalid: Signal<boolean> = computed<boolean>(
    (): boolean => (this.invalid() && this.touched()) || !!this.fieldHost?.invalid(),
  );

  /**
   * Property classes
   *
   * @description
   * Full-width block host with caller classes.
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('block w-full', this.class()),
  );

  /**
   * Property triggerClasses
   *
   * @description
   * Field look of the trigger, accent border while open, faint text while empty.
   */
  protected readonly triggerClasses: Signal<string> = computed<string>(() =>
    cn(
      inputVariants({ size: this.size() }),
      'inline-flex cursor-pointer items-center justify-between gap-3 text-left',
      this.open() && 'border-accent/55',
      this.empty() && 'text-fg-faint',
      this.triggerClass(),
    ),
  );

  /**
   * Property trigger
   *
   * @description
   * Trigger button, focused back on close and checked by outside clicks.
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Property calendar
   *
   * @description
   * Grid of the dialog, focused once attached.
   */
  private readonly calendar: Signal<MonthCalendarComponent | undefined> =
    viewChild<MonthCalendarComponent>(MonthCalendarComponent);

  /**
   * Property fieldHost
   *
   * @description
   * Enclosing `ui-field`, whose shown error also marks the trigger invalid.
   */
  private readonly fieldHost: FieldHost | null = inject<FieldHost>(FIELD_HOST, { optional: true });

  /**
   * Property document
   *
   * @description
   * Document whose active element decides the focus restoration.
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property injector
   *
   * @description
   * Injector of the post-render focus moves.
   */
  private readonly injector: Injector = inject<Injector>(Injector);
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Focuses the trigger, so forms and fields can return focus to the control.
   *
   * @param {FocusOptions} options - Native focus options.
   *
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /**
   * Method empty
   * @method empty
   *
   * @description
   * Whether the control has no value, which shows the placeholder.
   *
   * @returns {boolean} Whether it is empty.
   */
  protected abstract empty(): boolean;

  /**
   * Method onOpen
   * @method onOpen
   *
   * @description
   * Resets the dialog state before it opens; nothing by default.
   *
   * @returns {void}
   */
  protected onOpen(): void {
    // Nothing to reset by default.
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Closes an open dialog with focus restoration, or opens it when the control is editable.
   *
   * @returns {void}
   */
  protected toggle(): void {
    if (this.open()) {
      this.close(true);
    } else if (!this.disabled() && !this.readonly()) {
      this.onOpen();
      this.open.set(true);
    }
  }

  /**
   * Method onAttach
   * @method onAttach
   *
   * @description
   * Moves focus into the grid once the dialog has rendered.
   *
   * @returns {void}
   */
  protected onAttach(): void {
    afterNextRender(() => this.calendar()?.focus(), { injector: this.injector });
  }

  /**
   * Method onOverlayKeydown
   * @method onOverlayKeydown
   *
   * @description
   * Closes the dialog on an unmodified Escape.
   *
   * @param {KeyboardEvent} event - Key pressed in the dialog.
   *
   * @returns {void}
   */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    this.close(true);
  }

  /**
   * Method onOutsideClick
   * @method onOutsideClick
   *
   * @description
   * Closes the dialog without restoring focus when the click lands outside the trigger.
   *
   * @param {MouseEvent} event - Click outside the dialog.
   *
   * @returns {void}
   */
  protected onOutsideClick(event: MouseEvent): void {
    // The trigger's own click toggles the dialog.
    if (this.trigger().nativeElement.contains(event.target as Node | null)) return;
    this.close(false);
  }

  /**
   * Method onTriggerBlur
   * @method onTriggerBlur
   *
   * @description
   * Marks the control touched when focus leaves the closed trigger.
   *
   * @returns {void}
   */
  protected onTriggerBlur(): void {
    if (!this.open()) this.touch.emit();
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the dialog, marks the control touched and restores focus to the trigger when asked, or
   * when focus fell back to the body.
   *
   * @param {boolean} restoreFocus - Whether focus returns to the trigger.
   *
   * @returns {void}
   */
  protected close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.touch.emit();
    afterNextRender(
      () => {
        const active: Element | null = this.document.activeElement;
        if (restoreFocus || !active || active === this.document.body) this.focus();
      },
      { injector: this.injector },
    );
  }
  // #endregion
}
