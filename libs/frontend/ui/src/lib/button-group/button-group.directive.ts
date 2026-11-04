import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type ButtonGroupOrientation,
  buttonGroupVariants,
} from '@internal/ui/lib/button-group/constants/button-group.variants';

/**
 * Directive ButtonGroupDirective
 * @class ButtonGroupDirective
 *
 * @description
 * Groups adjacent buttons, inputs or static group text. Nested groups retain spacing between the nested units.
 */
@Directive({
  selector: '[uiButtonGroup]',
  host: {
    '[class]': 'classes()',
    role: 'group',
    '[attr.data-orientation]': 'orientation()',
    'data-slot': 'button-group',
  },
})
export class ButtonGroupDirective {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Axis used to join child corners and advertise the group's orientation; defaults to horizontal.
   *
   * @type {InputSignal<ButtonGroupOrientation>}
   */
  public readonly orientation: InputSignal<ButtonGroupOrientation> =
    input<ButtonGroupOrientation>('horizontal');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the orientation-specific group recipe.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged recipe and caller classes applied to the group host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(buttonGroupVariants({ orientation: this.orientation() }), this.class()),
  );
  // #endregion
}

/**
 * Directive ButtonGroupTextDirective
 * @class ButtonGroupTextDirective
 *
 * @description
 * Styles static text or an icon that is visually attached to the grouped controls, such as a unit or prefix.
 */
@Directive({
  selector: '[uiButtonGroupText]',
  host: { '[class]': 'classes()', 'data-slot': 'button-group-text' },
})
export class ButtonGroupTextDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the static group-text surface.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the static text host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex items-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-control text-fg-muted',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive ButtonGroupSeparatorDirective
 * @class ButtonGroupSeparatorDirective
 *
 * @description
 * Adds a decorative rule between filled group controls; its default vertical axis separates a horizontal group.
 */
@Directive({
  selector: '[uiButtonGroupSeparator]',
  host: {
    '[class]': 'classes()',
    role: 'none',
    '[attr.data-orientation]': 'orientation()',
    'data-slot': 'button-group-separator',
  },
})
export class ButtonGroupSeparatorDirective {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Axis of the separator rule itself, defaulting to vertical for a horizontal group.
   *
   * @type {InputSignal<ButtonGroupOrientation>}
   */
  public readonly orientation: InputSignal<ButtonGroupOrientation> =
    input<ButtonGroupOrientation>('vertical');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the rule's geometry and surface color.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the decorative separator host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'relative z-20 shrink-0 self-stretch bg-border-field',
      this.orientation() === 'vertical' ? 'w-px' : 'h-px',
      this.class(),
    ),
  );
  // #endregion
}
