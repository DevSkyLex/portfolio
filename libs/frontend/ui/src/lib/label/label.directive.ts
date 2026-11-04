import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Directive LabelDirective
 * @class LabelDirective
 *
 * @description
 * Styles a form label and dims it when a preceding disabled peer control matches or its enclosing group is disabled.
 */
@Directive({
  selector: 'label[uiLabel]',
  host: { '[class]': 'classes()', 'data-slot': 'label' },
})
export class LabelDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the label typography and disabled states.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host class string applying label spacing, typography and peer/group disabled styling.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex items-baseline gap-2 text-control text-fg select-none',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
      this.class(),
    ),
  );
  // #endregion
}
