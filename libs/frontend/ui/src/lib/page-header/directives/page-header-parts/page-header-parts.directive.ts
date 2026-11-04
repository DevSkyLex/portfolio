import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Directive PageHeaderTitleDirective
 * @class PageHeaderTitleDirective
 *
 * @description
 * The page's heading inside `ui-page-header`, usually its one `h1`; a count or a badge may follow
 * the text on the same baseline.
 */
@Directive({
  selector: '[uiPageHeaderTitle]',
  host: { '[class]': 'classes()', 'data-slot': 'page-header-title' },
})
export class PageHeaderTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the title type.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * 20 px semibold title that wraps long words instead of overflowing.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'flex min-w-0 flex-wrap items-baseline gap-x-2 text-[20px]/7 font-semibold tracking-[-0.01em] wrap-break-word text-fg',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive PageHeaderMetaDirective
 * @class PageHeaderMetaDirective
 *
 * @description
 * Line under the title: a short description or details such as a status badge, a version, a slug.
 */
@Directive({
  selector: '[uiPageHeaderMeta]',
  host: { '[class]': 'classes()', 'data-slot': 'page-header-meta' },
})
export class PageHeaderMetaDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the meta line.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Muted 13 px line whose items wrap. A line led by an icon keeps one row, so that its text wraps
   * beside the icon rather than leaving it alone, and the icon aligns with the first text line.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]/5 text-fg-muted',
      'has-[>ng-icon:first-child]:flex-nowrap has-[>ng-icon:first-child]:items-start [&>ng-icon:first-child]:mt-0.5',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive PageHeaderActionsDirective
 * @class PageHeaderActionsDirective
 *
 * @description
 * Group of the page's actions (buttons, menus, sheet triggers), on the right of the title or under
 * it once the band is narrow. Content actions belong here rather than in the navigation bar.
 */
@Directive({
  selector: '[uiPageHeaderActions]',
  host: { '[class]': 'classes()', 'data-slot': 'page-header-actions' },
})
export class PageHeaderActionsDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the actions row.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Wrapping row of actions, its first line level with the title's.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex min-h-7 flex-wrap items-center gap-1.5', this.class()),
  );
  // #endregion
}

/**
 * Directive PageHeaderTabsDirective
 * @class PageHeaderTabsDirective
 *
 * @description
 * Holds the page's `uiTabsList` under the title row, aligned with the title. The list drops its own
 * hairline so that the selected underline rests on the band's.
 */
@Directive({
  selector: '[uiPageHeaderTabs]',
  host: { '[class]': 'classes()', 'data-slot': 'page-header-tabs' },
})
export class PageHeaderTabsDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the tabs row.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Inset row of tabs without a second hairline.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex min-w-0 px-6 @max-[640px]:px-4 [&_[data-slot=tabs-list]]:border-b-0', this.class()),
  );
  // #endregion
}
