import { CdkMenuTrigger } from '@angular/cdk/menu';
import { Directive, effect, inject, input, type InputSignal } from '@angular/core';
import { panelPositions } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';

/**
 * Class DropdownMenuTriggerDirective
 * @class DropdownMenuTriggerDirective
 *
 * @description
 * Adapts the CDK menu trigger to the dropdown panel's shared positions and opens its template from
 * pointer or keyboard interaction.
 */
@Directive({
  selector: '[uiDropdownMenuTrigger]',
  hostDirectives: [
    {
      directive: CdkMenuTrigger,
      inputs: [
        'cdkMenuTriggerFor: uiDropdownMenuTrigger',
        'cdkMenuTriggerData: uiDropdownMenuTriggerData',
      ],
      outputs: ['cdkMenuOpened: opened', 'cdkMenuClosed: closed'],
    },
  ],
})
export class DropdownMenuTriggerDirective {
  // #region Properties
  /**
   * Property align
   * @readonly
   *
   * @description
   * Trigger edge used to align the panel when it opens below or flips above.
   *
   * @type {InputSignal<'start' | 'end'>}
   */
  public readonly align: InputSignal<'start' | 'end'> = input<'start' | 'end'>('start');
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Updates the CDK menu position when the alignment input changes.
   */
  public constructor() {
    const trigger: CdkMenuTrigger = inject<CdkMenuTrigger>(CdkMenuTrigger, { self: true });
    effect(() => {
      trigger.menuPosition = panelPositions(this.align());
    });
  }
  // #endregion
}
