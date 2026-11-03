import { CdkMenuItemRadio } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck, lucideChevronRight, lucideCircle } from '@ng-icons/lucide';
import { menuIndicatorClasses } from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';

/**
 * Class DropdownMenuItemIndicatorComponent
 * @class DropdownMenuItemIndicatorComponent
 *
 * @description
 * Renders an aria-hidden check or radio dot for a selected dropdown-menu option, using the CDK item
 * directive to choose the indicator shape.
 */
@Component({
  selector: 'ui-dropdown-menu-item-indicator',
  imports: [NgIcon],
  template: `
    @if (radio) {
      <ng-icon class="[&_svg]:fill-current" [svg]="icons.dot" size="8" aria-hidden="true" />
    } @else {
      <ng-icon [svg]="icons.check" size="16" aria-hidden="true" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: `${menuIndicatorClasses} invisible group-aria-checked:visible`,
    'aria-hidden': 'true',
    'data-slot': 'dropdown-menu-item-indicator',
  },
})
export class DropdownMenuItemIndicatorComponent {
  // #region Properties
  /**
   * Property icons
   * @readonly
   *
   * @description
   * Checkmark and radio-dot definitions rendered by the indicator template.
   *
   * @type {{ readonly check: typeof lucideCheck; readonly dot: typeof lucideCircle }}
   */
  protected readonly icons: {
    readonly check: typeof lucideCheck;
    readonly dot: typeof lucideCircle;
  } = { check: lucideCheck, dot: lucideCircle } as const;

  /**
   * Property radio
   * @readonly
   *
   * @description
   * Whether this indicator is inside a CDK radio item and should show a dot instead of a checkmark.
   *
   * @type {boolean}
   */
  protected readonly radio: boolean =
    inject<CdkMenuItemRadio>(CdkMenuItemRadio, { optional: true }) !== null;
  // #endregion
}

/**
 * Class DropdownMenuSubIndicatorComponent
 * @class DropdownMenuSubIndicatorComponent
 *
 * @description
 * Renders a decorative chevron at the end of a submenu trigger, mirrored for right-to-left text.
 */
@Component({
  selector: 'ui-dropdown-menu-sub-indicator',
  imports: [NgIcon],
  template: `<ng-icon [svg]="icons.chevron" size="16" aria-hidden="true" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ml-auto flex text-star-faint rtl:-scale-x-100',
    'aria-hidden': 'true',
    'data-slot': 'dropdown-menu-sub-indicator',
  },
})
export class DropdownMenuSubIndicatorComponent {
  // #region Properties
  /**
   * Property icons
   * @readonly
   *
   * @description
   * Chevron definition used by the submenu indicator template.
   *
   * @type {{ readonly chevron: typeof lucideChevronRight }}
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronRight } = {
    chevron: lucideChevronRight,
  } as const;
  // #endregion
}
