import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronRight, lucideEllipsis } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Directive BreadcrumbDirective
 * @class BreadcrumbDirective
 *
 * @description
 * Marks a navigation landmark as a breadcrumb trail and supplies its accessible label.
 */
@Directive({
  selector: 'nav[uiBreadcrumb]',
  host: { '[attr.aria-label]': 'ariaLabel()', 'data-slot': 'breadcrumb' },
})
export class BreadcrumbDirective {
  // #region Properties
  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name for the navigation landmark, defaulting to the French breadcrumb label.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.breadcrumb.label:Fil d’Ariane`,
  );
  // #endregion
}

/**
 * Directive BreadcrumbListDirective
 * @class BreadcrumbListDirective
 *
 * @description
 * Styles the ordered list that contains breadcrumb items and separators.
 */
@Directive({
  selector: 'ol[uiBreadcrumbList]',
  host: { '[class]': 'classes()', 'data-slot': 'breadcrumb-list' },
})
export class BreadcrumbListDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the list's base layout and typography styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the ordered list host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex flex-wrap items-center gap-1.5 text-small break-words text-star-muted sm:gap-2.5',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive BreadcrumbItemDirective
 * @class BreadcrumbItemDirective
 *
 * @description
 * Styles one list item in a breadcrumb trail as an inline group.
 */
@Directive({
  selector: 'li[uiBreadcrumbItem]',
  host: { '[class]': 'classes()', 'data-slot': 'breadcrumb-item' },
})
export class BreadcrumbItemDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the breadcrumb item's inline layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the list-item host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex items-center gap-1.5', this.class()),
  );
  // #endregion
}

/**
 * Directive BreadcrumbLinkDirective
 * @class BreadcrumbLinkDirective
 *
 * @description
 * Styles a breadcrumb link to an ancestor page; consumers provide navigation through `routerLink` or `href`.
 */
@Directive({
  selector: 'a[uiBreadcrumbLink]',
  host: { '[class]': 'classes()', 'data-slot': 'breadcrumb-link' },
})
export class BreadcrumbLinkDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with link focus, hover and reduced-motion styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the ancestor link host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'rounded-sm transition-colors duration-(--dur-pop) ease-orbit hover:text-star motion-reduce:transition-none',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive BreadcrumbPageDirective
 * @class BreadcrumbPageDirective
 *
 * @description
 * Marks the current trail item with `aria-current="page"`; a `span` receives link role and disabled semantics while an anchor keeps native link semantics.
 */
@Directive({
  selector: 'span[uiBreadcrumbPage], a[uiBreadcrumbPage]',
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'anchor ? null : "link"',
    '[attr.aria-disabled]': 'anchor ? null : "true"',
    'aria-current': 'page',
    'data-slot': 'breadcrumb-page',
  },
})
export class BreadcrumbPageDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the current-page emphasis.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property anchor
   * @readonly
   *
   * @description
   * Whether the host is an anchor, which preserves its native link role and enabled state.
   *
   * @type {boolean}
   */
  protected readonly anchor: boolean =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the current-page host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('font-medium text-star', this.class()),
  );
  // #endregion
}

/**
 * Component BreadcrumbSeparatorComponent
 * @class BreadcrumbSeparatorComponent
 *
 * @description
 * Renders projected separator content or a default chevron inside a presentation-only list item.
 */
@Component({
  // eslint-disable-next-line -- component-selector: must stay an <li> inside the <ol>
  selector: 'li[uiBreadcrumbSeparator]',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    role: 'presentation',
    'aria-hidden': 'true',
    'data-slot': 'breadcrumb-separator',
  },
  template: `<ng-content><ng-icon [svg]="icons.chevron" size="14" /></ng-content>`,
})
export class BreadcrumbSeparatorComponent {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with separator alignment and muted color.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide chevron used only when the separator has no projected content.
   *
   * @type {{ readonly chevron: typeof lucideChevronRight }}
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronRight } = {
    chevron: lucideChevronRight,
  } as const;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the separator list item.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex items-center text-star-faint', this.class()),
  );
  // #endregion
}

/**
 * Component BreadcrumbEllipsisComponent
 * @class BreadcrumbEllipsisComponent
 *
 * @description
 * Displays a decorative ellipsis for collapsed trail items with a screen-reader label.
 */
@Component({
  selector: 'ui-breadcrumb-ellipsis',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'breadcrumb-ellipsis' },
  template: `<ng-icon [svg]="icons.ellipsis" size="16" aria-hidden="true" />
    <span class="sr-only">{{ label() }}</span>`,
})
export class BreadcrumbEllipsisComponent {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Screen-reader text describing the omitted intermediate pages, defaulting to French copy.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.breadcrumb.more:Pages intermédiaires`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the fixed-size ellipsis layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide ellipsis glyph rendered as hidden decoration next to the accessible label.
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
   * Merged classes applied to the ellipsis host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex size-9 items-center justify-center', this.class()),
  );
  // #endregion
}
