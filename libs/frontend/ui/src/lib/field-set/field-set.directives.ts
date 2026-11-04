import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type FieldLegendVariant,
  fieldLegendVariants,
} from '@internal/ui/lib/field-set/constants/field-legend.variants';

/**
 * Class FieldSetDirective
 * @class FieldSetDirective
 *
 * @description
 * Styles a native fieldset so its legend and grouped controls follow the form layout.
 */
@Directive({
  selector: 'fieldset[uiFieldSet]',
  host: { '[class]': 'classes()', 'data-slot': 'field-set' },
})
export class FieldSetDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the native fieldset layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Borderless vertical fieldset layout combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('m-0 flex min-w-0 flex-col gap-6 border-0 p-0', this.class()),
  );
  // #endregion
}

/**
 * Class FieldLegendDirective
 * @class FieldLegendDirective
 *
 * @description
 * Applies the selected legend or label typography to a native fieldset legend.
 */
@Directive({
  selector: 'legend[uiFieldLegend]',
  host: { '[class]': 'classes()', 'data-slot': 'field-legend' },
})
export class FieldLegendDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Text role used to choose display-heading or field-label typography.
   *
   * @type {InputSignal<FieldLegendVariant>}
   */
  public readonly variant: InputSignal<FieldLegendVariant> = input<FieldLegendVariant>('legend');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected legend treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Selected legend variant and caller classes merged into the host style.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(fieldLegendVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Class FieldGroupDirective
 * @class FieldGroupDirective
 *
 * @description
 * Arranges related form controls in a full-width vertical stack with consistent spacing.
 */
@Directive({
  selector: '[uiFieldGroup]',
  host: { '[class]': 'classes()', 'data-slot': 'field-group' },
})
export class FieldGroupDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the field-group stack.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Full-width vertical field stack with caller classes merged on the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex w-full flex-col gap-6', this.class()),
  );
  // #endregion
}

/**
 * Class FieldDescriptionDirective
 * @class FieldDescriptionDirective
 *
 * @description
 * Styles supporting form text that can be referenced by a control's `aria-describedby` attribute.
 */
@Directive({
  selector: '[uiFieldDescription]',
  host: { '[class]': 'classes()', 'data-slot': 'field-description' },
})
export class FieldDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the supporting text style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Muted supporting text appearance combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('text-sm text-pretty text-fg-faint', this.class()),
  );
  // #endregion
}

/**
 * Class FieldErrorDirective
 * @class FieldErrorDirective
 *
 * @description
 * Marks form error text as an alert and applies the shared danger text color.
 */
@Directive({
  selector: '[uiFieldError]',
  host: { role: 'alert', '[class]': 'classes()', 'data-slot': 'field-error' },
})
export class FieldErrorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the error message style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Danger text treatment combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('text-sm text-danger-ink', this.class()),
  );
  // #endregion
}

/**
 * Class FieldSeparatorDirective
 * @class FieldSeparatorDirective
 *
 * @description
 * Draws a horizontal separator with optional projected text centered between its lines.
 */
@Directive({
  selector: '[uiFieldSeparator]',
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
    '[class]': 'classes()',
    'data-slot': 'field-separator',
  },
})
export class FieldSeparatorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the separator layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Horizontal line pseudo-elements and centered content spacing combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex items-center gap-3 text-sm text-fg-faint empty:gap-0',
      'before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border',
      this.class(),
    ),
  );
  // #endregion
}
