import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Directive KbdDirective
 * @class KbdDirective
 *
 * @description
 * Styles a native keyboard-key element with a compact monospace keycap treatment.
 */
@Directive({
  selector: 'kbd[uiKbd]',
  host: { '[class]': 'classes()', 'data-slot': 'kbd' },
})
export class KbdDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the keycap styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host class string for a non-interactive keyboard key.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'pointer-events-none inline-flex h-6 w-fit min-w-6 items-center justify-center gap-1 rounded-sm border border-line bg-void-raised px-1.5 font-mono text-[12px]/4 font-medium text-star-muted select-none',
      '[&_svg]:size-3',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive KbdGroupDirective
 * @class KbdGroupDirective
 *
 * @description
 * Styles the native `kbd` container for a displayed key combination.
 */
@Directive({
  selector: '[uiKbdGroup]',
  host: { '[class]': 'classes()', 'data-slot': 'kbd-group' },
})
export class KbdGroupDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the key-combination layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Compact monospace inline layout for the key combination and separators.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex items-center gap-1 font-mono text-[12px]/4 text-star-faint', this.class()),
  );
  // #endregion
}
