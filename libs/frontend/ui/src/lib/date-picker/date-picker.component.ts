import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injector,
  LOCALE_ID,
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
import { lucideCalendar } from '@ng-icons/lucide';
import { CalendarComponent } from '@internal/ui/lib/calendar/calendar.component';
import type { Weekday } from '@internal/ui/lib/calendar/models/calendar/weekday.type';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';
import { POSITIONS } from '@internal/ui/lib/date-picker/constants/date-picker.constants';

/**
 * Class DatePickerComponent
 * @class DatePickerComponent
 *
 * @description
 * Signal Forms date control whose field-styled trigger opens an accessible calendar dialog in a CDK
 * overlay. Escape and outside interaction close the dialog while focus restoration respects a user's
 * subsequent focus movement.
 */
@Component({
  selector: 'ui-date-picker',
  imports: [CalendarComponent, CdkConnectedOverlay, CdkOverlayOrigin, CdkTrapFocus, NgIcon],
  templateUrl: './date-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'date-picker',
    '[attr.data-state]': 'open() ? "open" : "closed"',
  },
})
export class DatePickerComponent implements FormValueControl<Date | null> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Selected date bound to the Signal Forms control contract.
   *
   * @type {ModelSignal<Date | null>}
   */
  public readonly value: ModelSignal<Date | null> = model<Date | null>(null);

  /**
   * Property min
   * @readonly
   *
   * @description
   * Earliest selectable date, inclusive, when a lower bound is configured.
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly min: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property max
   * @readonly
   *
   * @description
   * Latest selectable date, inclusive, when an upper bound is configured.
   *
   * @type {InputSignal<Date | undefined>}
   */
  public readonly max: InputSignal<Date | undefined> = input<Date | undefined>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables opening and interaction with the picker; accepts a native empty boolean attribute.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property readonly
   * @readonly
   *
   * @description
   * Prevents choosing a new date while retaining a focusable trigger that displays the current value.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly readonly: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Form validity state forwarded to the rendered field trigger.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property dateDisabled
   * @readonly
   *
   * @description
   * Optional predicate for dates unavailable beyond the configured minimum and maximum.
   *
   * @type {InputSignal<((date: Date) => boolean) | undefined>}
   */
  public readonly dateDisabled: InputSignal<((date: Date) => boolean) | undefined> =
    input<(date: Date) => boolean>();

  /**
   * Property weekStartsOn
   * @readonly
   *
   * @description
   * Optional weekday used as the first column in the embedded calendar.
   *
   * @type {InputSignal<Weekday | undefined>}
   */
  public readonly weekStartsOn: InputSignal<Weekday | undefined> = input<Weekday>();

  /**
   * Property format
   * @readonly
   *
   * @description
   * Locale-aware date formatting options for the value displayed by the trigger.
   *
   * @type {InputSignal<Intl.DateTimeFormatOptions>}
   */
  public readonly format: InputSignal<Intl.DateTimeFormatOptions> =
    input<Intl.DateTimeFormatOptions>({ dateStyle: 'long' });

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Localized trigger text displayed when no date has been selected.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.datePicker.placeholder:Choisir une date`,
  );

  /**
   * Property dialogLabel
   * @readonly
   *
   * @description
   * Accessible name applied to the calendar dialog.
   *
   * @type {InputSignal<string>}
   */
  public readonly dialogLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.datePicker.dialog:Choisir une date`,
  );

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * Trigger identifier used by an external label and as the basis for the dialog id.
   *
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-date-picker-'),
  );

  /**
   * Property describedBy
   * @readonly
   *
   * @description
   * Optional id list of descriptive text associated with the trigger.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly describedBy: InputSignal<string | undefined> = input<string>();

  /**
   * Property size
   * @readonly
   *
   * @description
   * Shared input size variant applied to the date trigger.
   *
   * @type {InputSignal<InputSize>}
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional wrapper classes merged with the full-width picker layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the user leaves the closed trigger or completes and closes a picker interaction.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Calendar icon definition used by the trigger template.
   *
   * @type {{ readonly calendar: typeof lucideCalendar }}
   */
  protected readonly icons: { readonly calendar: typeof lucideCalendar } = {
    calendar: lucideCalendar,
  } as const;

  /**
   * Property positions
   * @readonly
   *
   * @description
   * Preferred CDK overlay placements for the calendar dialog.
   *
   * @type {ConnectedPosition[]}
   */
  protected readonly positions: ConnectedPosition[] = POSITIONS;

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the calendar overlay is currently attached.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property dialogId
   * @readonly
   *
   * @description
   * Dialog identifier derived from the trigger id for accessible trigger relationships.
   *
   * @type {Signal<string>}
   */
  protected readonly dialogId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-dialog`,
  );

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Required trigger button reference used for focus and outside-click checks.
   *
   * @type {Signal<ElementRef<HTMLButtonElement>>}
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Property calendar
   * @readonly
   *
   * @description
   * Optional embedded calendar instance focused after the overlay is attached.
   *
   * @type {Signal<CalendarComponent | undefined>}
   */
  private readonly calendar: Signal<CalendarComponent | undefined> =
    viewChild<CalendarComponent>(CalendarComponent);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Application locale used to format the selected date.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Owner document used to inspect active focus when the overlay closes.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Parent injection context used to schedule render callbacks for focus management.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property formatter
   * @readonly
   *
   * @description
   * Date formatter recreated when the locale or format options change.
   *
   * @type {Signal<Intl.DateTimeFormat>}
   */
  private readonly formatter: Signal<Intl.DateTimeFormat> = computed<Intl.DateTimeFormat>(
    () => new Intl.DateTimeFormat(this.locale, this.format()),
  );

  /**
   * Property display
   * @readonly
   *
   * @description
   * Localized selected date text, falling back to the configured placeholder.
   *
   * @type {Signal<string>}
   */
  protected readonly display: Signal<string> = computed<string>(() => {
    const value: Date | null = this.value();
    return value ? this.formatter().format(value) : this.placeholder();
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Full-width block layout combined with caller-provided wrapper classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('block w-full', this.class()),
  );

  /**
   * Property triggerClasses
   * @readonly
   *
   * @description
   * Shared input appearance with open-state border and placeholder text treatment.
   *
   * @type {Signal<string>}
   */
  protected readonly triggerClasses: Signal<string> = computed<string>(() =>
    cn(
      inputVariants({ size: this.size() }),
      'inline-flex cursor-pointer items-center justify-between gap-3 text-left',
      this.open() && 'border-accent/55',
      !this.value() && 'text-fg-faint',
    ),
  );
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Focuses the trigger button so form and field integrations can return focus to the control.
   *
   * @param {FocusOptions} options - Optional browser focus behavior.
   * @returns {void} Completes after forwarding focus to the trigger button.
   */
  public focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Closes an open calendar with focus restoration or opens it when the control is editable.
   *
   * @returns {void} Completes after updating the overlay open state when permitted.
   */
  protected toggle(): void {
    if (this.open()) this.close(true);
    else if (!this.disabled() && !this.readonly()) this.open.set(true);
  }

  /**
   * Method onAttach
   * @method onAttach
   *
   * @description
   * Moves focus into the calendar after the overlay has rendered.
   *
   * @returns {void} Completes after scheduling the post-render focus callback.
   */
  protected onAttach(): void {
    afterNextRender(() => this.calendar()?.focus(), { injector: this.injector });
  }

  /**
   * Method select
   * @method select
   *
   * @description
   * Publishes the chosen date through the form value and closes the dialog with focus restoration.
   *
   * @param {Date} date - Selected calendar date.
   * @returns {void} Completes after publishing the selected value and closing the dialog.
   */
  protected select(date: Date): void {
    this.value.set(date);
    this.close(true);
  }

  /**
   * Method onOverlayKeydown
   * @method onOverlayKeydown
   *
   * @description
   * Closes the dialog on an unmodified Escape key while leaving modified shortcuts untouched.
   *
   * @param {KeyboardEvent} event - Key event emitted from the overlay.
   * @returns {void} Completes after closing on an unmodified Escape key when applicable.
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
   * Closes the overlay without restoring trigger focus when the pointer target is outside the trigger.
   *
   * @param {MouseEvent} event - Outside-click event from the connected overlay.
   * @returns {void} Completes after closing for clicks outside the trigger.
   */
  protected onOutsideClick(event: MouseEvent): void {
    // The trigger's own click toggles the popup.
    if (this.trigger().nativeElement.contains(event.target as Node | null)) return;
    this.close(false);
  }

  /**
   * Method onTriggerBlur
   * @method onTriggerBlur
   *
   * @description
   * Marks the control touched when focus leaves the trigger while the calendar is closed.
   *
   * @returns {void} Completes after emitting touch when the picker is closed.
   */
  protected onTriggerBlur(): void {
    if (!this.open()) this.touch.emit();
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes an open popup, marks the control touched, and restores trigger focus only when requested
   * or when focus has fallen back to the document body.
   *
   * @param {boolean} restoreFocus - Whether to return focus to the trigger after rendering.
   * @returns {void} Completes after scheduling focus restoration when the overlay was open.
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
