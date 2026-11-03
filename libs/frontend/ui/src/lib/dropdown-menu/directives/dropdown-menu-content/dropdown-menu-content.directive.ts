import { CdkMenu } from '@angular/cdk/menu';
import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { menuPanelVariants } from '@internal/ui/lib/menu-panel/constants/menu-panel.variants';

/**
 * Class DropdownMenuContentDirective
 * @class DropdownMenuContentDirective
 *
 * @description
 * Turns the trigger's root panel into a CDK menu and applies the shared non-scrolling menu surface.
 */
@Directive({
  selector: '[uiDropdownMenuContent]',
  hostDirectives: [CdkMenu],
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-content' },
})
export class DropdownMenuContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared menu panel treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared menu surface classes combined with caller-provided styles.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuPanelVariants(), this.class()),
  );
  // #endregion
}

/**
 * Class DropdownMenuSubContentDirective
 * @class DropdownMenuSubContentDirective
 *
 * @description
 * Applies the shared panel surface to the nested CDK menu opened by a submenu trigger.
 */
@Directive({
  selector: '[uiDropdownMenuSubContent]',
  hostDirectives: [CdkMenu],
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-sub-content' },
})
export class DropdownMenuSubContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared submenu panel treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared menu surface classes combined with caller-provided styles.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuPanelVariants(), this.class()),
  );
  // #endregion
}
