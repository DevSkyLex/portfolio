import {
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideEllipsis } from '@ng-icons/lucide';
import { buttonVariants } from '@internal/ui/lib/button/constants/button.variants';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { STEP_CLASSES } from '@internal/ui/lib/pagination/constants/pagination.constants';

/**
 * Directive PaginationDirective
 * @class PaginationDirective
 *
 * @description
 * Marks the navigation landmark that contains a set of pagination controls.
 */
@Directive({
  selector: 'nav[uiPagination]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel()',
    'data-slot': 'pagination',
  },
})
export class PaginationDirective {
  // #region Properties
  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name applied to the navigation landmark; defaults to the localized pagination label.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.label:Pagination`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the navigation layout classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host classes combining the centered navigation layout with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('mx-auto flex w-full justify-center', this.class()),
  );
  // #endregion
}

/**
 * Directive PaginationContentDirective
 * @class PaginationContentDirective
 *
 * @description
 * Applies the wrapping row layout to the list containing pagination items.
 */
@Directive({
  selector: 'ul[uiPaginationContent]',
  host: { '[class]': 'classes()', 'data-slot': 'pagination-content' },
})
export class PaginationContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the pagination list layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host classes that lay out pagination items in a wrapping row.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex flex-row flex-wrap items-center gap-1', this.class()),
  );
  // #endregion
}

/**
 * Directive PaginationItemDirective
 * @class PaginationItemDirective
 *
 * @description
 * Marks one list item in the pagination control structure.
 */
@Directive({
  selector: 'li[uiPaginationItem]',
  host: { 'data-slot': 'pagination-item' },
})
export class PaginationItemDirective {}

/**
 * Class PaginationControl
 * @class PaginationControl
 *
 * @description
 * Shares disabled-state handling between pagination anchors and buttons.
 * Native buttons use `disabled`; anchors use `aria-disabled` and leave the tab order.
 */
@Directive()
export abstract class PaginationControl {
  // #region Properties
  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether this control is unavailable; a bare attribute value is normalized to `true`.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | ''): value is true | '' => value === '' || value,
  });

  /**
   * Property anchor
   * @readonly
   *
   * @description
   * Whether the host element is an anchor, which determines its disabled semantics.
   *
   * @type {boolean}
   */
  protected readonly anchor: boolean =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';

  /**
   * Property nativeDisabled
   * @readonly
   *
   * @description
   * Disabled attribute value for button hosts; anchors receive `null` here.
   *
   * @type {Signal<boolean | null>}
   */
  protected readonly nativeDisabled: Signal<true | null> = computed<true | null>(
    (): true | null => (!this.anchor && this.disabled()) || null,
  );

  /**
   * Property ariaDisabled
   * @readonly
   *
   * @description
   * `aria-disabled` value for anchor hosts; buttons use their native disabled attribute.
   *
   * @type {Signal<boolean | null>}
   */
  protected readonly ariaDisabled: Signal<true | null> = computed<true | null>(
    (): true | null => (this.anchor && this.disabled()) || null,
  );

  /**
   * Property tabIndex
   * @readonly
   *
   * @description
   * Removes disabled anchors from keyboard navigation while leaving other hosts unchanged.
   *
   * @type {Signal<number | null>}
   */
  protected readonly tabIndex: Signal<-1 | null> = computed<-1 | null>((): -1 | null =>
    this.anchor && this.disabled() ? -1 : null,
  );
  // #endregion
}

/**
 * Directive PaginationLinkDirective
 * @class PaginationLinkDirective
 *
 * @description
 * Styles a page link or button and marks the current page for assistive technology.
 */
@Directive({
  selector: 'a[uiPaginationLink], button[uiPaginationLink]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-current]': 'isActive() ? "page" : null',
    '[attr.data-active]': 'isActive() || null',
    '[attr.disabled]': 'nativeDisabled()',
    '[attr.aria-disabled]': 'ariaDisabled()',
    '[attr.tabindex]': 'tabIndex()',
    'data-slot': 'pagination-link',
  },
})
export class PaginationLinkDirective extends PaginationControl {
  // #region Properties
  /**
   * Property isActive
   * @readonly
   *
   * @description
   * Whether the link represents the current page; sets `aria-current="page"` when true.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly isActive: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | ''): value is true | '' => value === '' || value,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the page link variant.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Page link classes, with the secondary variant reserved for the current page.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      buttonVariants({ variant: this.isActive() ? 'secondary' : 'ghost', size: 'sm' }),
      'min-w-9 px-2 font-mono text-data tabular-nums',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Component PaginationPreviousComponent
 * @class PaginationPreviousComponent
 *
 * @description
 * Provides a previous-page control with a decorative left chevron and an accessible label.
 * The default label becomes visually visible at the `sm` breakpoint.
 */
@Component({
  // eslint-disable-next-line -- component-selector: keeps the native link or button
  selector: 'a[uiPaginationPrevious], button[uiPaginationPrevious]',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'nativeDisabled()',
    '[attr.aria-disabled]': 'ariaDisabled()',
    '[attr.tabindex]': 'tabIndex()',
    'data-slot': 'pagination-previous',
  },
  template: `<ng-icon [svg]="icons.previous" size="16" aria-hidden="true" />
    <span class="sr-only sm:not-sr-only"
      ><ng-content>{{ label() }}</ng-content></span
    >`,
})
export class PaginationPreviousComponent extends PaginationControl {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Fallback accessible label shown when the consumer provides no projected content.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.previous:Précédent`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the previous control styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Left-chevron icon rendered before the previous-page label.
   *
   * @type {{ readonly previous: typeof lucideChevronLeft }}
   */
  protected readonly icons: { readonly previous: typeof lucideChevronLeft } = {
    previous: lucideChevronLeft,
  } as const;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Ghost button classes combined with the shared step spacing and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(buttonVariants({ variant: 'ghost', size: 'sm' }), STEP_CLASSES, this.class()),
  );
  // #endregion
}

/**
 * Component PaginationNextComponent
 * @class PaginationNextComponent
 *
 * @description
 * Provides a next-page control with a decorative right chevron and an accessible label.
 */
@Component({
  // eslint-disable-next-line -- component-selector: keeps the native link or button
  selector: 'a[uiPaginationNext], button[uiPaginationNext]',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'nativeDisabled()',
    '[attr.aria-disabled]': 'ariaDisabled()',
    '[attr.tabindex]': 'tabIndex()',
    'data-slot': 'pagination-next',
  },
  template: `<span class="sr-only sm:not-sr-only"
      ><ng-content>{{ label() }}</ng-content></span
    >
    <ng-icon [svg]="icons.next" size="16" aria-hidden="true" />`,
})
export class PaginationNextComponent extends PaginationControl {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Fallback accessible label shown when the consumer provides no projected content.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.next:Suivant`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the next control styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Right-chevron icon rendered after the next-page label.
   *
   * @type {{ readonly next: typeof lucideChevronRight }}
   */
  protected readonly icons: { readonly next: typeof lucideChevronRight } = {
    next: lucideChevronRight,
  } as const;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Ghost button classes combined with the shared step spacing and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(buttonVariants({ variant: 'ghost', size: 'sm' }), STEP_CLASSES, this.class()),
  );
  // #endregion
}

/**
 * Component PaginationEllipsisComponent
 * @class PaginationEllipsisComponent
 *
 * @description
 * Indicates that one or more pages are omitted from the visible pagination list.
 */
@Component({
  selector: 'ui-pagination-ellipsis',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'pagination-ellipsis' },
  template: `<ng-icon [svg]="icons.ellipsis" size="16" aria-hidden="true" />
    <span class="sr-only">{{ label() }}</span>`,
})
export class PaginationEllipsisComponent {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible text announcing that additional pages are omitted.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.more:Autres pages`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the ellipsis layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Ellipsis icon shown in the gap between visible page numbers.
   *
   * @type {{ readonly ellipsis: typeof lucideEllipsis }}
   */
  protected readonly icons: { readonly ellipsis: typeof lucideEllipsis } = {
    ellipsis: lucideEllipsis,
  } as const;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Centered square layout classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex size-9 items-center justify-center text-fg-faint', this.class()),
  );
  // #endregion
}
