import type { PositionStrategy } from '@angular/cdk/overlay';
import type { DialogOptions } from '@internal/ui/lib/dialog/models/dialog/dialog-options.interface';

/**
 * Interface DialogPanelSetup
 * @interface DialogPanelSetup
 *
 * @description
 * Complete configuration needed to open a panel with its role, variant, geometry and optional
 * accessibility or behavior settings.
 *
 * @template D - Data value passed to the panel content.
 */
export interface DialogPanelSetup<D> extends DialogOptions<D> {
  // #region Properties
  /**
   * Property role
   * @readonly
   *
   * @description
   * Accessible dialog role selected by the concrete panel service.
   *
   * @type {'dialog' | 'alertdialog'}
   */
  readonly role: 'dialog' | 'alertdialog';

  /**
   * Property slot
   * @readonly
   *
   * @description
   * Data-slot value identifying this panel variant in the rendered DOM.
   *
   * @type {string}
   */
  readonly slot: string;

  /**
   * Property panelClass
   * @readonly
   *
   * @description
   * Complete class list applied to the visible dialog container.
   *
   * @type {string}
   */
  readonly panelClass: string;

  /**
   * Property positionStrategy
   * @readonly
   *
   * @description
   * Optional CDK overlay placement strategy for non-centered panel variants.
   *
   * @type {PositionStrategy | undefined}
   */
  readonly positionStrategy?: PositionStrategy | undefined;

  /**
   * Property width
   * @readonly
   *
   * @description
   * Optional explicit overlay width.
   *
   * @type {string | undefined}
   */
  readonly width?: string | undefined;

  /**
   * Property height
   * @readonly
   *
   * @description
   * Optional explicit overlay height.
   *
   * @type {string | undefined}
   */
  readonly height?: string | undefined;
  // #endregion
}
