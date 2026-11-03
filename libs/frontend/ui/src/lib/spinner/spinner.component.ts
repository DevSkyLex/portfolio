import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type SpinnerSize,
  spinnerVariants,
} from '@internal/ui/lib/spinner/constants/spinner.variants';

/**
 * Component SpinnerComponent
 * @class SpinnerComponent
 *
 * @description
 * Renders a loading ring and announces its label as a status message when the label is nonempty.
 * Set an empty label when a containing control already supplies the loading announcement.
 */
@Component({
  selector: 'ui-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'label() ? "status" : null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    'data-slot': 'spinner',
  },
  template: `@if (label()) {
    <span class="sr-only">{{ label() }}</span>
  }`,
})
export class SpinnerComponent {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Ring dimensions selected from the supported spinner variants.
   *
   * @type {InputSignal<SpinnerSize>}
   */
  public readonly size: InputSignal<SpinnerSize> = input<SpinnerSize>('sm');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible loading announcement; an empty label hides the spinner from assistive technology.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.spinner.label:Chargement`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the selected spinner size.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Spinner ring classes combining its size variant with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(spinnerVariants({ size: this.size() }), this.class()),
  );
  // #endregion
}
