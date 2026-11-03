import {
  type InputSignal,
  type ModelSignal,
  type Signal,
  Directive,
  ElementRef,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { NavigationMenuItemDirective } from '@internal/ui/lib/navigation-menu/directives/navigation-menu-item/navigation-menu-item.directive';
import { NAVIGATION_MENU } from '@internal/ui/lib/navigation-menu/tokens/navigation-menu/navigation-menu.token';
import type { NavigationMenuHost } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-host.interface';
import { navigationLinkClasses } from '@internal/ui/lib/navigation-menu/constants/navigation-menu.constants';

/**
 * Directive NavigationMenuDirective
 * @class NavigationMenuDirective
 *
 * @description
 * Owns a disclosure-style site navigation: native links remain plain links while item triggers reveal their templates in the viewport.
 * Escape closes and restores trigger focus; focus or pointer leaving the root closes the open item.
 */
@Directive({
  selector: 'nav[uiNavigationMenu]',
  providers: [
    {
      provide: NAVIGATION_MENU,
      useExisting: forwardRef((): typeof NavigationMenuDirective => NavigationMenuDirective),
    },
  ],
  host: {
    '[class]': 'classes()',
    'data-slot': 'navigation-menu',
    '(keydown.escape)': 'onEscape($event)',
    '(focusout)': 'onFocusOut($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class NavigationMenuDirective implements NavigationMenuHost {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Two-way value of the open item, or `null` when all items are closed.
   *
   * @type {ModelSignal<string | null>}
   */
  public readonly value: ModelSignal<string | null> = model<string | null>(null);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional root classes merged with the horizontal navigation layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native navigation element used to constrain outside pointer and focus checks.
   *
   * @type {HTMLElement}
   */
  public readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Descendant item directives controlled by this root menu.
   *
   * @type {Signal<readonly NavigationMenuItemDirective[]>}
   */
  private readonly items: Signal<readonly NavigationMenuItemDirective[]> =
    contentChildren<NavigationMenuItemDirective>(NavigationMenuItemDirective, {
      descendants: true,
    });

  /**
   * Property openItem
   * @readonly
   *
   * @description
   * Currently open descendant item, or `null` when the selection does not match an item.
   *
   * @type {Signal<NavigationMenuItemDirective | null>}
   */
  public readonly openItem: Signal<NavigationMenuItemDirective | null> =
    computed<NavigationMenuItemDirective | null>(
      (): NavigationMenuItemDirective | null =>
        this.items().find((item: NavigationMenuItemDirective): boolean => item.open()) ?? null,
    );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Relative horizontal flex layout combined with caller-provided root classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('relative flex items-center', this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Opens the requested item or closes it when it is already selected.
   *
   * @param {string} value - Stable value identifying the item to toggle.
   * @returns {void} Updates the root model consumed by item state.
   */
  public toggle(value: string): void {
    this.value.update((current: string | null): string | null =>
      current === value ? null : value,
    );
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes whichever item is open under this navigation root.
   *
   * @returns {void} Sets the open item value to `null`.
   */
  public close(): void {
    this.value.set(null);
  }

  /**
   * Method onEscape
   * @method onEscape
   *
   * @description
   * Closes the open item and restores focus to its trigger when Escape is pressed.
   *
   * @param {Event} event - Escape key event received by the navigation host.
   * @returns {void} Leaves the event untouched when no item is open.
   */
  protected onEscape(event: Event): void {
    const item: NavigationMenuItemDirective | null = this.openItem();
    if (!item) return;
    event.preventDefault();
    this.close();
    item.trigger()?.focus();
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Closes the menu when focus moves to a node outside the navigation host.
   *
   * @param {FocusEvent} event - Focus transition from an element inside the host.
   * @returns {void} Keeps the menu open for focus transitions within the navigation subtree.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next: EventTarget | null = event.relatedTarget;
    if (next instanceof Node && !this.element.contains(next)) this.close();
  }

  /**
   * Method onDocumentPointerDown
   * @method onDocumentPointerDown
   *
   * @description
   * Closes the open item when a pointer press targets a node outside this navigation root.
   *
   * @param {PointerEvent} event - Document-level pointer event.
   * @returns {void} Keeps the menu state when the target is within the root or no item is open.
   */
  protected onDocumentPointerDown(event: PointerEvent): void {
    const target: EventTarget | null = event.target;
    if (this.value() !== null && target instanceof Node && !this.element.contains(target)) {
      this.close();
    }
  }
  // #endregion
}

/**
 * Directive NavigationMenuListDirective
 * @class NavigationMenuListDirective
 *
 * @description
 * Styles the unordered list that arranges navigation items in a horizontal row.
 */
@Directive({
  selector: 'ul[uiNavigationMenuList]',
  host: { '[class]': 'classes()', 'data-slot': 'navigation-menu-list' },
})
export class NavigationMenuListDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional list classes merged with the reset and horizontal layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Horizontal unstyled list classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('m-0 flex list-none items-center gap-1 p-0', this.class()),
  );
  // #endregion
}

/**
 * Directive NavigationMenuLinkDirective
 * @class NavigationMenuLinkDirective
 *
 * @description
 * Styles a native navigation link and closes the menu after activation when it belongs to a navigation root.
 */
@Directive({
  selector: 'a[uiNavigationMenuLink]',
  host: {
    '[attr.aria-current]': 'active() ? "page" : null',
    '[class]': 'classes()',
    'data-slot': 'navigation-menu-link',
    '(click)': 'menu?.close()',
  },
})
export class NavigationMenuLinkDirective {
  // #region Properties
  /**
   * Property active
   * @readonly
   *
   * @description
   * Marks this link as the current page and binds `aria-current=page` when true.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly active: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional link classes merged with shared navigation-link styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Optional root controller; links used outside a navigation-menu root remain independent.
   *
   * @type {NavigationMenuHost | null}
   */
  protected readonly menu: NavigationMenuHost | null = inject<NavigationMenuHost>(NAVIGATION_MENU, {
    optional: true,
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared navigation-link styling combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(navigationLinkClasses, this.class()),
  );
  // #endregion
}
