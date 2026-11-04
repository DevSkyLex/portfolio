import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type EmptyMediaVariant,
  emptyMediaVariants,
} from '@internal/ui/lib/empty/constants/empty-media.variants';
import {
  type EmptyAppearance,
  type EmptyLayout,
  emptyVariants,
} from '@internal/ui/lib/empty/constants/empty.variants';

/**
 * Class EmptyDirective
 * @class EmptyDirective
 *
 * @description
 * Container of an empty collection or result (shadcn « Empty »): an optional icon tile, a title, a
 * description and actions, centred (the owner's exception to the admin's left-aligned text, D36 empty
 * state revision). Its `layout` follows its position (`emptyVariants`): `fill` when nothing follows it
 * in its page column, `inline` when something does, `panel` when it is the only content of a bounded
 * pane or frame; `fill` and `panel` also centre it vertically.
 */
@Directive({
  selector: '[uiEmpty]',
  host: {
    '[class]': 'classes()',
    '[attr.data-layout]': 'layout()',
    '[attr.data-appearance]': 'appearance()',
    'data-slot': 'empty',
  },
})
export class EmptyDirective {
  // #region Properties
  /**
   * Property layout
   * @readonly
   *
   * @description
   * Height rule from the empty state's position, `inline` by default (no stretching).
   *
   * @type {InputSignal<EmptyLayout>}
   */
  public readonly layout: InputSignal<EmptyLayout> = input<EmptyLayout>('inline');

  /**
   * Property appearance
   * @readonly
   *
   * @description
   * `plain` (default) or `dashed`, a dashed frame on a light surface for an empty list in a section.
   *
   * @type {InputSignal<EmptyAppearance>}
   */
  public readonly appearance: InputSignal<EmptyAppearance> = input<EmptyAppearance>('plain');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Layout classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(emptyVariants({ layout: this.layout(), appearance: this.appearance() }), this.class()),
  );
  // #endregion
}

/**
 * Class EmptyHeaderDirective
 * @class EmptyHeaderDirective
 *
 * @description
 * Groups the media, title and description of an empty state in a centred column of at most 28rem.
 */
@Directive({
  selector: '[uiEmptyHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'empty-header' },
})
export class EmptyHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the constrained header layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Centred header column with caller classes merged on the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex max-w-md min-w-0 flex-col items-center gap-1 text-center', this.class()),
  );
  // #endregion
}

/**
 * Class EmptyMediaDirective
 * @class EmptyMediaDirective
 *
 * @description
 * Styles an icon or illustration as decorative media within an empty-state header.
 */
@Directive({
  selector: '[uiEmptyMedia]',
  host: {
    '[class]': 'classes()',
    '[attr.data-variant]': 'variant()',
    'aria-hidden': 'true',
    'data-slot': 'empty-media',
  },
})
export class EmptyMediaDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Media style variant, defaulting to the neutral presentation.
   *
   * @type {InputSignal<EmptyMediaVariant>}
   */
  public readonly variant: InputSignal<EmptyMediaVariant> = input<EmptyMediaVariant>('default');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected media variant.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Base media treatment and configured variant combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(emptyMediaVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Class EmptyTitleDirective
 * @class EmptyTitleDirective
 *
 * @description
 * Applies the dense title type (14 px, medium) to the element chosen by the consumer: a heading when
 * the empty state stands for a page section, a paragraph inside a list or a table.
 */
@Directive({
  selector: '[uiEmptyTitle]',
  host: { '[class]': 'classes()', 'data-slot': 'empty-title' },
})
export class EmptyTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the empty-state title typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Title typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('text-[14px]/5 font-medium text-fg', this.class()),
  );
  // #endregion
}

/**
 * Class EmptyDescriptionDirective
 * @class EmptyDescriptionDirective
 *
 * @description
 * Styles explanatory copy associated with the empty-state title, including readable links.
 */
@Directive({
  selector: '[uiEmptyDescription]',
  host: { '[class]': 'classes()', 'data-slot': 'empty-description' },
})
export class EmptyDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the descriptive text treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Muted copy of at most 60ch, centred under the title, and link styles combined with caller
   * classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'mx-auto max-w-[60ch] text-[13px]/5 text-fg-muted [&>a]:text-fg [&>a]:underline [&>a]:decoration-border-strong [&>a]:underline-offset-4 [&>a:hover]:decoration-fg',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Class EmptyContentDirective
 * @class EmptyContentDirective
 *
 * @description
 * Row of actions beneath the empty-state header, the primary one first (`uiBtn size="xs"`).
 */
@Directive({
  selector: '[uiEmptyContent]',
  host: { '[class]': 'classes()', 'data-slot': 'empty-content' },
})
export class EmptyContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the empty-state action layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Wrapping action row 16 px below the header, centred, combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('mt-4 flex min-w-0 flex-wrap items-center justify-center gap-2', this.class()),
  );
  // #endregion
}
