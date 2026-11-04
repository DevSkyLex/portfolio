import { type InputSignal, type Signal, Directive, computed, input } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Directive TableContainerDirective
 * @class TableContainerDirective
 *
 * @description
 * Creates a named, keyboard-focusable scroll region for wide tables.
 */
@Directive({
  selector: '[uiTableContainer]',
  host: {
    '[class]': 'classes()',
    role: 'region',
    tabindex: '0',
    'data-slot': 'table-container',
  },
})
export class TableContainerDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the scroll-region styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Horizontal scrolling and visible keyboard focus classes for the region.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'relative w-full overflow-x-auto rounded-lg outline-4 outline-offset-0 outline-transparent focus-visible:outline-accent/12',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive TableDirective
 * @class TableDirective
 *
 * @description
 * Applies the catalogue table typography and full-width collapsed-border layout.
 */
@Directive({
  selector: 'table[uiTable]',
  host: { '[class]': 'classes()', 'data-slot': 'table' },
})
export class TableDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the table layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Full-width table classes with caption placement, collapsed borders and small text.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('w-full caption-bottom border-collapse text-small text-fg', this.class()),
  );
  // #endregion
}

/**
 * Directive TableHeaderDirective
 * @class TableHeaderDirective
 *
 * @description
 * Styles the table header section and separates its rows with a bottom border.
 */
@Directive({
  selector: 'thead[uiTableHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'table-header' },
})
export class TableHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the header row borders.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Bottom-border classes applied to header rows.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('[&_tr]:border-b [&_tr]:border-border', this.class()),
  );
  // #endregion
}

/**
 * Directive TableBodyDirective
 * @class TableBodyDirective
 *
 * @description
 * Removes the trailing border from the last body row.
 */
@Directive({
  selector: 'tbody[uiTableBody]',
  host: { '[class]': 'classes()', 'data-slot': 'table-body' },
})
export class TableBodyDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the final-row border rule.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Body row classes that suppress the border on the final row.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('[&_tr:last-child]:border-0', this.class()),
  );
  // #endregion
}

/**
 * Directive TableFooterDirective
 * @class TableFooterDirective
 *
 * @description
 * Applies the raised surface and top-border treatment to a table footer.
 */
@Directive({
  selector: 'tfoot[uiTableFooter]',
  host: { '[class]': 'classes()', 'data-slot': 'table-footer' },
})
export class TableFooterDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with footer styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Footer surface, weight and border classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('border-t border-border bg-surface-raised font-medium [&>tr]:last:border-b-0', this.class()),
  );
  // #endregion
}

/**
 * Directive TableRowDirective
 * @class TableRowDirective
 *
 * @description
 * Styles a table row and highlights it when its `data-state` is `selected`.
 */
@Directive({
  selector: 'tr[uiTableRow]',
  host: { '[class]': 'classes()', 'data-slot': 'table-row' },
})
export class TableRowDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the row state styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Row border and transition classes with hover and selected-state surfaces.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'border-b border-border/60 transition-colors duration-150 ease-orbit hover:bg-surface-raised/60 data-[state=selected]:bg-surface-raised motion-reduce:transition-none',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive TableHeadDirective
 * @class TableHeadDirective
 *
 * @description
 * Styles a table heading cell as an uppercase monospace label.
 */
@Directive({
  selector: 'th[uiTableHead]',
  host: { '[class]': 'classes()', 'data-slot': 'table-head' },
})
export class TableHeadDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the heading cell styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Header cell alignment, typography and checkbox-aware trailing padding classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'h-10 px-3 text-left align-middle font-mono text-label whitespace-nowrap text-fg-faint uppercase [&:has([role=checkbox])]:pr-0',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive TableCellDirective
 * @class TableCellDirective
 *
 * @description
 * Applies horizontal and vertical padding to a table data cell.
 */
@Directive({
  selector: 'td[uiTableCell]',
  host: { '[class]': 'classes()', 'data-slot': 'table-cell' },
})
export class TableCellDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the cell padding.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Cell padding and checkbox-aware trailing padding classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', this.class()),
  );
  // #endregion
}

/**
 * Directive TableCaptionDirective
 * @class TableCaptionDirective
 *
 * @description
 * Styles descriptive caption text below a table.
 */
@Directive({
  selector: 'caption[uiTableCaption]',
  host: { '[class]': 'classes()', 'data-slot': 'table-caption' },
})
export class TableCaptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the caption text treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Caption spacing and muted text classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('mt-4 text-small text-fg-muted', this.class()),
  );
  // #endregion
}
