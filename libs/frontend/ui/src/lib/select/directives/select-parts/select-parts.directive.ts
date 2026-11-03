import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  type InputSignal,
  type Signal,
  Directive,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  menuLabelClasses,
  menuSeparatorClasses,
} from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';

/**
 * Directive SelectLabelDirective
 * @class SelectLabelDirective
 *
 * @description
 * Supplies a stable id and themed heading styles for a select option group label.
 */
@Directive({
  selector: '[uiSelectLabel]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'select-label' },
})
export class SelectLabelDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the shared menu label styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique id referenced by the containing option group's `aria-labelledby` attribute.
   *
   * @type {string}
   */
  public readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-select-label-');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Label styles merged with the caller's additional classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(menuLabelClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive SelectGroupDirective
 * @class SelectGroupDirective
 *
 * @description
 * Exposes the projected select label so the host group can reference its generated id accessibly.
 */
@Directive({
  selector: '[uiSelectGroup]',
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'label()?.id ?? null',
    'data-slot': 'select-group',
  },
})
export class SelectGroupDirective {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional projected label directive whose id names this group for assistive technology.
   *
   * @type {Signal<SelectLabelDirective | undefined>}
   */
  protected readonly label: Signal<SelectLabelDirective | undefined> =
    contentChild<SelectLabelDirective>(SelectLabelDirective);
  // #endregion
}

/**
 * Directive SelectSeparatorDirective
 * @class SelectSeparatorDirective
 *
 * @description
 * Renders a decorative divider between select groups and hides it from the accessibility tree.
 */
@Directive({
  selector: '[uiSelectSeparator]',
  host: { 'aria-hidden': 'true', '[class]': 'classes()', 'data-slot': 'select-separator' },
})
export class SelectSeparatorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the shared menu separator styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Separator styles merged with the caller's additional classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(menuSeparatorClasses, this.class()),
  );
  // #endregion
}
