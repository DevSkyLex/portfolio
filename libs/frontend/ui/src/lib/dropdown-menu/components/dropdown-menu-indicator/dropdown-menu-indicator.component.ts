import { CdkMenuItemRadio } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck, lucideChevronRight } from '@ng-icons/lucide';
import { menuIndicatorClasses } from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';

/**
 * Class DropdownMenuItemIndicatorComponent
 * @class DropdownMenuItemIndicatorComponent
 *
 * @description
 * Renders an aria-hidden check for a selected dropdown-menu option. A checkbox row keeps it in the
 * inset at the start; a radio row shows it at the end, like the options of `ui-menu-select` on the
 * public pages (owner review).
 */
@Component({
  selector: 'ui-dropdown-menu-item-indicator',
  imports: [NgIcon],
  template: `
    @if (radio) {
      <ng-icon [svg]="icons.check" size="16" strokeWidth="1.5" aria-hidden="true" />
    } @else {
      <ng-icon [svg]="icons.check" size="16" aria-hidden="true" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes',
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
   * Checkmark definition rendered by the indicator template.
   *
   * @type {{ readonly check: typeof lucideCheck }}
   */
  protected readonly icons: { readonly check: typeof lucideCheck } = {
    check: lucideCheck,
  } as const;

  /**
   * Property radio
   * @readonly
   *
   * @description
   * Whether this indicator is inside a CDK radio item, whose check sits at the end of the row.
   *
   * @type {boolean}
   */
  protected readonly radio: boolean =
    inject<CdkMenuItemRadio>(CdkMenuItemRadio, { optional: true }) !== null;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Start inset for a checkbox row; last flex item, pushed to the end, for a radio row.
   *
   * @type {string}
   */
  protected readonly classes: string = this.radio
    ? 'pointer-events-none order-last ms-auto flex size-4 items-center justify-center text-fg invisible group-aria-checked:visible'
    : `${menuIndicatorClasses} invisible group-aria-checked:visible`;
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
    class: 'ml-auto flex text-fg-faint rtl:-scale-x-100',
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
