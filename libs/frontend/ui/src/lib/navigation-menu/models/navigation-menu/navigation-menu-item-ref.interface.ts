import type { Signal, TemplateRef } from '@angular/core';

/**
 * Interface NavigationMenuItemRef
 * @interface NavigationMenuItemRef
 *
 * @description
 * Narrow view of one navigation item consumed by its trigger and viewport without importing the directive implementation.
 */
export interface NavigationMenuItemRef {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Stable item value used to select the open navigation entry.
   *
   * @type {Signal<string>}
   */
  readonly value: Signal<string>;

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * DOM ID assigned to the item's disclosure trigger.
   *
   * @type {string}
   */
  readonly triggerId: string;

  /**
   * Property contentId
   * @readonly
   *
   * @description
   * DOM ID assigned to the item's associated content panel.
   *
   * @type {string}
   */
  readonly contentId: string;

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether this item's value is the currently open navigation value.
   *
   * @type {Signal<boolean>}
   */
  readonly open: Signal<boolean>;

  /**
   * Property content
   * @readonly
   *
   * @description
   * Optional projected template shown by the navigation viewport while this item is open.
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  readonly content: Signal<TemplateRef<unknown> | undefined>;

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Optional native trigger element used to restore focus after Escape.
   *
   * @type {Signal<HTMLElement | undefined>}
   */
  readonly trigger: Signal<HTMLElement | undefined>;
  // #endregion
}
