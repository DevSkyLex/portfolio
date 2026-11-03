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
import type { InputSize } from '@internal/ui/lib/input/constants/input.variants';

/**
 * Class FieldComponent
 * @class FieldComponent
 *
 * @description
 * Associates a label, required state, hint and validation message with a projected control. The
 * control id also determines the hint and error ids exposed for `aria-describedby`.
 */
@Component({
  selector: 'ui-field',
  imports: [NgIcon],
  templateUrl: './field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2', 'data-slot': 'field' },
})
export class FieldComponent {
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
    () => ({ sm: 'text-sm', md: 'text-[15px]/5', lg: 'text-base/6' })[this.size()],
  );
  // #endregion
}
