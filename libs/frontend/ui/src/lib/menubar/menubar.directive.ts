import { CdkMenuBar, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Directive, computed, inject, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { panelPositions } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';

/**
 * Directive MenubarDirective
 * @class MenubarDirective
 *
 * @description
 * Adds CDK menu-bar roving focus and the portfolio's horizontal menubar styling to a host element.
 */
@Directive({
  selector: '[uiMenubar]',
  hostDirectives: [CdkMenuBar],
  host: { '[class]': 'classes()', 'data-slot': 'menubar' },
})
export class MenubarDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the horizontal bar appearance.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Horizontal bordered bar classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'inline-flex h-11 items-center gap-1 rounded-field border border-line bg-void p-1',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive MenubarTriggerDirective
 * @class MenubarTriggerDirective
 *
 * @description
 * Combines CDK menu trigger and menu item behavior for one menubar entry and positions its dropdown panel.
 */
@Directive({
  selector: '[uiMenubarTrigger]',
  hostDirectives: [
    {
      directive: CdkMenuTrigger,
      inputs: ['cdkMenuTriggerFor: uiMenubarTrigger', 'cdkMenuTriggerData: uiMenubarTriggerData'],
      outputs: ['cdkMenuOpened: opened', 'cdkMenuClosed: closed'],
    },
    { directive: CdkMenuItem, inputs: ['cdkMenuItemDisabled: disabled'] },
  ],
  host: { '[class]': 'classes()', 'data-slot': 'menubar-trigger' },
})
export class MenubarTriggerDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional trigger classes merged with menubar hover, focus and expanded states.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Trigger classes for the CDK-controlled menu button and its interaction states.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'inline-flex h-full items-center rounded-option px-3 text-control whitespace-nowrap text-star-muted outline-none select-none',
      'transition-[background-color,color] duration-150 ease-orbit motion-reduce:transition-none',
      'hover:bg-star/5 hover:text-star focus-visible:bg-star/5 focus-visible:text-star aria-expanded:bg-star/5 aria-expanded:text-star',
      'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal/55',
      'aria-disabled:pointer-events-none aria-disabled:opacity-50',
      this.class(),
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets the CDK trigger's preferred and fallback overlay positions to the shared dropdown placement rules.
   */
  public constructor() {
    inject<CdkMenuTrigger>(CdkMenuTrigger, { self: true }).menuPosition = panelPositions();
  }
  // #endregion
}
