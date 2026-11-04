import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type ItemMediaVariant,
  itemMediaVariants,
} from '@internal/ui/lib/item/constants/item-media.variants';
import {
  type ItemSize,
  type ItemVariant,
  itemVariants,
} from '@internal/ui/lib/item/constants/item.variants';

/**
 * Directive ItemGroupDirective
 * @class ItemGroupDirective
 *
 * @description
 * Marks a group as a semantic list; descendant `div[uiItem]` directives that resolve this provider expose list-item roles.
 */
@Directive({
  selector: '[uiItemGroup]',
  host: { '[class]': 'classes()', role: 'list', 'data-slot': 'item-group' },
})
export class ItemGroupDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the group layout classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host classes defining a vertical list group and its Tailwind group name.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('group/item-group flex flex-col', this.class()),
  );
  // #endregion
}

/**
 * Directive ItemDirective
 * @class ItemDirective
 *
 * @description
 * Styles a media, content and action row, assigning list-item semantics only to `div` rows inside a group.
 */
@Directive({
  selector: '[uiItem]',
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'listItem ? "listitem" : null',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    'data-slot': 'item',
  },
})
export class ItemDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Selects the row background and border treatment.
   *
   * @type {InputSignal<ItemVariant>}
   */
  public readonly variant: InputSignal<ItemVariant> = input<ItemVariant>('default');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Selects the row's compact or default spacing.
   *
   * @type {InputSignal<ItemSize>}
   */
  public readonly size: InputSignal<ItemSize> = input<ItemSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes appended after variant classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property listItem
   * @readonly
   *
   * @description
   * Indicates that this element is a `div` nested in an item group and should receive the listitem role.
   *
   * @type {boolean}
   */
  protected readonly listItem: boolean =
    inject<ItemGroupDirective>(ItemGroupDirective, { optional: true }) !== null &&
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'DIV';

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges the selected row variant and size classes with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(itemVariants({ variant: this.variant(), size: this.size() }), this.class()),
  );
  // #endregion
}

/**
 * Directive ItemMediaDirective
 * @class ItemMediaDirective
 *
 * @description
 * Styles the leading visual of an item row as plain content, an icon tile or an image.
 */
@Directive({
  selector: '[uiItemMedia]',
  host: { '[class]': 'classes()', '[attr.data-variant]': 'variant()', 'data-slot': 'item-media' },
})
export class ItemMediaDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Selects transparent, icon-sized or image-sized media styling.
   *
   * @type {InputSignal<ItemMediaVariant>}
   */
  public readonly variant: InputSignal<ItemMediaVariant> = input<ItemMediaVariant>('default');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the selected media styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged media variant and caller class string.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(itemMediaVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Directive ItemContentDirective
 * @class ItemContentDirective
 *
 * @description
 * Provides the flexible text column between item media and actions.
 */
@Directive({
  selector: '[uiItemContent]',
  host: { '[class]': 'classes()', 'data-slot': 'item-content' },
})
export class ItemContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the flexible content column layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Styles the flexible content column and its adjacent content behavior.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none', this.class()),
  );
  // #endregion
}

/**
 * Directive ItemTitleDirective
 * @class ItemTitleDirective
 *
 * @description
 * Applies the primary title typography and inline alignment for an item row.
 */
@Directive({
  selector: '[uiItemTitle]',
  host: { '[class]': 'classes()', 'data-slot': 'item-title' },
})
export class ItemTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the title typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Aligns title text and optional inline icons within the item row.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex w-fit items-center gap-2 text-control text-fg', this.class()),
  );
  // #endregion
}

/**
 * Directive ItemDescriptionDirective
 * @class ItemDescriptionDirective
 *
 * @description
 * Styles supporting item copy with a two-line clamp and accessible link affordance.
 */
@Directive({
  selector: '[uiItemDescription]',
  host: { '[class]': 'classes()', 'data-slot': 'item-description' },
})
export class ItemDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the secondary description styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Styles muted supporting copy with a two-line clamp and underlined nested links.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'line-clamp-2 text-small text-balance text-fg-muted [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-fg',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive ItemActionsDirective
 * @class ItemActionsDirective
 *
 * @description
 * Aligns related buttons or other item actions in a horizontal group.
 */
@Directive({
  selector: '[uiItemActions]',
  host: { '[class]': 'classes()', 'data-slot': 'item-actions' },
})
export class ItemActionsDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the action alignment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Places row actions in a horizontal centered group.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex items-center gap-2', this.class()),
  );
  // #endregion
}

/**
 * Directive ItemHeaderDirective
 * @class ItemHeaderDirective
 *
 * @description
 * Provides a full-width row header for metadata such as a label or date.
 */
@Directive({
  selector: '[uiItemHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'item-header' },
})
export class ItemHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the header layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Spans the item row and distributes header content along the line.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex basis-full items-center justify-between gap-2', this.class()),
  );
  // #endregion
}

/**
 * Directive ItemFooterDirective
 * @class ItemFooterDirective
 *
 * @description
 * Provides a full-width footer row for item metadata or secondary actions.
 */
@Directive({
  selector: '[uiItemFooter]',
  host: { '[class]': 'classes()', 'data-slot': 'item-footer' },
})
export class ItemFooterDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the footer layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Spans the item row and distributes footer content along the line.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex basis-full items-center justify-between gap-2', this.class()),
  );
  // #endregion
}

/**
 * Directive ItemSeparatorDirective
 * @class ItemSeparatorDirective
 *
 * @description
 * Renders a decorative horizontal rule between item rows with no semantic separator role.
 */
@Directive({
  selector: '[uiItemSeparator]',
  host: { '[class]': 'classes()', role: 'none', 'data-slot': 'item-separator' },
})
export class ItemSeparatorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the separator appearance.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Creates the thin decorative line with spacing around it.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('my-0 h-px w-full shrink-0 border-0 bg-border/60', this.class()),
  );
  // #endregion
}
