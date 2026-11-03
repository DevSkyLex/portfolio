import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type EmptyMediaVariant,
  emptyMediaVariants,
} from '@internal/ui/lib/empty/constants/empty-media.variants';

/**
 * Class EmptyDirective
 * @class EmptyDirective
 *
 * @description
 * Styles the container for an empty result or collection state and its explanatory content.
 */
@Directive({
  selector: '[uiEmpty]',
  host: { '[class]': 'classes()', 'data-slot': 'empty' },
})
export class EmptyDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the centered empty-state layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Centered, responsive empty-state classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex min-w-0 flex-1 flex-col items-start justify-center gap-6 rounded-card p-6 text-left md:p-12',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Class EmptyHeaderDirective
 * @class EmptyHeaderDirective
 *
 * @description
 * Groups the primary media and text in an empty state within a constrained centered column.
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
   * Centered header layout with caller classes merged on the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex max-w-sm flex-col items-start gap-2 text-left', this.class()),
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
 * Applies display typography to the semantic heading chosen by the consumer for the empty state.
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
   * Display title typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('font-display text-d3 text-star', this.class()),
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
   * Muted copy and link styles combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'text-small text-star-muted [&>a]:text-star [&>a]:underline [&>a]:decoration-line-strong [&>a]:underline-offset-4 [&>a:hover]:decoration-star',
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
 * Constrains and spaces calls to action or additional content beneath the empty-state header.
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
   * Responsive action stack layout and text treatment combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex w-full max-w-sm min-w-0 flex-col items-start gap-4 text-small', this.class()),
  );
  // #endregion
}
