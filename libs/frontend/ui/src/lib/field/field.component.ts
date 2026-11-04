import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import type { InputSize } from '@internal/ui/lib/input/constants/input.variants';

/**
 * Class FieldComponent
 * @class FieldComponent
 *
 * @description
 * Associates a label, required state, hint and validation message with a projected control. The
 * control id also determines the hint and error ids exposed for `aria-describedby`. While a message
 * shows, the projected catalogue controls (`uiInput`, `uiTextarea`, `uiInputGroupInput`, `ui-select`,
 * `ui-input-otp`, `ui-tags-input`) carry `aria-invalid="true"` through `FIELD_HOST`: callers bind `[error]` only.
 * `size="sm"` sets the dense admin type: 13 px label, 12 px hint and error.
 */
@Component({
  selector: 'ui-field',
  imports: [NgIcon],
  templateUrl: './field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2', 'data-slot': 'field' },
  providers: [{ provide: FIELD_HOST, useExisting: FieldComponent }],
})
export class FieldComponent implements FieldHost {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Visible label associated with the projected control.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Projected control id used to connect the label, hint and error relationships.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input.required<string>();

  /**
   * Property required
   * @readonly
   *
   * @description
   * Whether the label displays the required marker.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly required: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hint
   * @readonly
   *
   * @description
   * Optional supporting text rendered with the control's hint id.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly hint: InputSignal<string | undefined> = input<string>();

  /**
   * Property error
   * @readonly
   *
   * @description
   * Optional validation message rendered as an alert with the control's error id.
   *
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly error: InputSignal<string | null | undefined> = input<string | null>();

  /**
   * Property size
   * @readonly
   *
   * @description
   * Size variant of the projected control, used to align the label typography.
   *
   * @type {InputSignal<InputSize>}
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Alert icon definition shown beside validation errors.
   *
   * @type {{ readonly alert: typeof lucideCircleAlert }}
   */
  protected readonly icons: { readonly alert: typeof lucideCircleAlert } = {
    alert: lucideCircleAlert,
  } as const;

  /**
   * Property labelClasses
   * @readonly
   *
   * @description
   * Label text size matched to the projected control's input size.
   *
   * @type {Signal<string>}
   */
  protected readonly labelClasses: Signal<string> = computed<string>(
    () => ({ sm: 'text-[13px]/5', md: 'text-[15px]/5', lg: 'text-base/6' })[this.size()],
  );

  /**
   * Property messageClasses
   * @readonly
   *
   * @description
   * Hint and error text size: 12 px beside the dense `sm` controls, 14 px otherwise.
   *
   * @type {Signal<string>}
   */
  protected readonly messageClasses: Signal<string> = computed<string>(() =>
    this.size() === 'sm' ? 'text-[12px]/4' : 'text-sm',
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Whether a validation message shows, read by the projected controls for `aria-invalid`.
   *
   * @type {Signal<boolean>}
   */
  public readonly invalid: Signal<boolean> = computed<boolean>(() => !!this.error());
  // #endregion
}
