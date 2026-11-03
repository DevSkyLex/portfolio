import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
  Directive,
  booleanAttribute,
  computed,
  input,
  model,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type ToggleSize,
  type ToggleVariant,
  toggleVariants,
} from '@internal/ui/lib/toggle/constants/toggle.variants';

/**
 * Directive ToggleDirective
 * @class ToggleDirective
 *
 * @description
 * Adds an accessible two-state pressed model and variant styling to a native button.
 */
@Directive({
  selector: 'button[uiToggle]',
  host: {
    type: 'button',
    'data-slot': 'toggle',
    '[class]': 'classes()',
    '[attr.aria-pressed]': 'pressed()',
    '[disabled]': 'disabled()',
    '(click)': 'toggle()',
  },
})
export class ToggleDirective {
  // #region Properties
  /**
   * Property pressed
   * @readonly
   *
   * @description
   * Two-way model for the button's pressed state and `aria-pressed` value.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly pressed: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether the button is disabled; the native boolean attribute form is normalized.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Visual treatment used by the button.
   *
   * @type {InputSignal<ToggleVariant>}
   */
  public readonly variant: InputSignal<ToggleVariant> = input<ToggleVariant>('default');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Button dimensions selected from the supported size variants.
   *
   * @type {InputSignal<ToggleSize>}
   */
  public readonly size: InputSignal<ToggleSize> = input<ToggleSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the pressed-state styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Toggle classes combining selected size, visual variant and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(toggleVariants({ variant: this.variant(), size: this.size() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Inverts the pressed state unless the native button is disabled.
   *
   * @returns {void} Updates the pressed model when enabled.
   */
  protected toggle(): void {
    if (!this.disabled()) {
      this.pressed.update((pressed: boolean): boolean => !pressed);
    }
  }
  // #endregion
}
