import type { AutoFocusTarget } from '@angular/cdk/dialog';
import type { Injector } from '@angular/core';

/**
 * Interface DialogOptions
 * @interface DialogOptions
 *
 * @description
 * Optional content, accessibility and behavior settings shared by dialog, alert-dialog and sheet
 * panel services.
 *
 * @template D - Data value made available to the dialog content.
 */
export interface DialogOptions<D = unknown> {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Value supplied to the content through the CDK dialog data token.
   *
   * @type {D | undefined}
   */
  readonly data?: D | undefined;

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional panel classes merged with the selected dialog variant.
   *
   * @type {string | undefined}
   */
  readonly class?: string | undefined;

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name used when the content does not register a title element.
   *
   * @type {string | undefined}
   */
  readonly ariaLabel?: string | undefined;

  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * Accessible name of the panel's built-in close button.
   *
   * @type {string | undefined}
   */
  readonly closeLabel?: string | undefined;

  /**
   * Property showClose
   * @readonly
   *
   * @description
   * Whether the panel renders its built-in close button.
   *
   * @type {boolean | undefined}
   */
  readonly showClose?: boolean | undefined;

  /**
   * Property closeOnBackdropClick
   * @readonly
   *
   * @description
   * Whether activating the modal backdrop closes the panel.
   *
   * @type {boolean | undefined}
   */
  readonly closeOnBackdropClick?: boolean | undefined;

  /**
   * Property closeOnEscape
   * @readonly
   *
   * @description
   * Whether an unmodified Escape key closes the panel.
   *
   * @type {boolean | undefined}
   */
  readonly closeOnEscape?: boolean | undefined;

  /**
   * Property autoFocus
   * @readonly
   *
   * @description
   * CDK focus target applied when the panel opens.
   *
   * @type {AutoFocusTarget | string | boolean | undefined}
   */
  readonly autoFocus?: AutoFocusTarget | string | boolean | undefined;

  /**
   * Property restoreFocus
   * @readonly
   *
   * @description
   * CDK focus restoration behavior when the panel closes.
   *
   * @type {boolean | string | HTMLElement | undefined}
   */
  readonly restoreFocus?: boolean | string | HTMLElement | undefined;

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Parent injector used to resolve content providers and directionality.
   *
   * @type {Injector | undefined}
   */
  readonly injector?: Injector | undefined;

  /**
   * Property id
   * @readonly
   *
   * @description
   * Optional id assigned to the CDK dialog reference and rendered container.
   *
   * @type {string | undefined}
   */
  readonly id?: string | undefined;
  // #endregion
}
