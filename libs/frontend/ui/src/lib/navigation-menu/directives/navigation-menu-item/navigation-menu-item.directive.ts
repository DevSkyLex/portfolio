import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  type InputSignal,
  type Signal,
  Directive,
  ElementRef,
  TemplateRef,
  computed,
  contentChild,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  NAVIGATION_MENU,
  NAVIGATION_MENU_ITEM,
} from '@internal/ui/lib/navigation-menu/tokens/navigation-menu/navigation-menu.token';
import type { NavigationMenuItemRef } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-item-ref.interface';
import { navigationLinkClasses } from '@internal/ui/lib/navigation-menu/constants/navigation-menu.constants';
import type { NavigationMenuHost } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-host.interface';

/**
 * Directive NavigationMenuContentDirective
 * @class NavigationMenuContentDirective
 *
 * @description
 * Captures a projected content template that the navigation viewport renders for its open item.
 */
@Directive({ selector: 'ng-template[uiNavigationMenuContent]' })
export class NavigationMenuContentDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Embedded template rendered into the viewport when the owning item is open.
   *
   * @type {TemplateRef<unknown>}
   */
  public readonly template: TemplateRef<unknown> = inject<TemplateRef<unknown>>(TemplateRef);
  // #endregion
}

/**
 * Directive NavigationMenuTriggerDirective
 * @class NavigationMenuTriggerDirective
 *
 * @description
 * Connects a button to its navigation item and toggles the root disclosure state while exposing expanded and controls ARIA attributes.
 */
@Directive({
  selector: 'button[uiNavigationMenuTrigger]',
  host: {
    type: 'button',
    '[id]': 'item.triggerId',
    '[attr.aria-expanded]': 'item.open()',
    '[attr.aria-controls]': 'item.open() ? item.contentId : null',
    '[attr.data-state]': 'item.open() ? "open" : "closed"',
    '[class]': 'classes()',
    'data-slot': 'navigation-menu-trigger',
    '(click)': 'menu.toggle(item.value())',
  },
})
export class NavigationMenuTriggerDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional trigger classes merged with the shared navigation-link styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Root menu controller used to toggle the trigger's item.
   *
   * @type {NavigationMenuHost}
   */
  protected readonly menu: NavigationMenuHost = inject<NavigationMenuHost>(NAVIGATION_MENU);

  /**
   * Property item
   * @readonly
   *
   * @description
   * Containing item state used to bind expanded, controls and data-state attributes.
   *
   * @type {NavigationMenuItemRef}
   */
  protected readonly item: NavigationMenuItemRef =
    inject<NavigationMenuItemRef>(NAVIGATION_MENU_ITEM);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared navigation-link classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(navigationLinkClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive NavigationMenuItemDirective
 * @class NavigationMenuItemDirective
 *
 * @description
 * Provides a stable item value and exposes its projected trigger and content to the navigation root and viewport.
 */
@Directive({
  selector: 'li[uiNavigationMenuItem]',
  providers: [
    {
      provide: NAVIGATION_MENU_ITEM,
      useExisting: forwardRef(
        (): typeof NavigationMenuItemDirective => NavigationMenuItemDirective,
      ),
    },
  ],
  host: {
    class: 'flex',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    'data-slot': 'navigation-menu-item',
  },
})
export class NavigationMenuItemDirective implements NavigationMenuItemRef {
  // #region Properties
  /**
   * Property id
   *
   * @description
   * Per-instance prefix generated from the module-level counter and used to derive trigger and content DOM IDs; it is not deterministic across independent server and client executions.
   *
   * @type {string}
   */
  private readonly id: string =
    inject<RenderIdService>(RenderIdService).next('ui-navigation-menu-');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Item's selection value, defaulting to its generated ID when none is supplied.
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input<string>(this.id);

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * DOM ID referenced by the item's content panel.
   *
   * @type {string}
   */
  public readonly triggerId: string = `${this.id}-trigger`;

  /**
   * Property contentId
   * @readonly
   *
   * @description
   * DOM ID exposed by the panel controlled by this item's trigger.
   *
   * @type {string}
   */
  public readonly contentId: string = `${this.id}-content`;

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Root controller whose open value determines whether this item is expanded.
   *
   * @type {NavigationMenuHost}
   */
  private readonly menu: NavigationMenuHost = inject<NavigationMenuHost>(NAVIGATION_MENU);

  /**
   * Property contentPart
   * @readonly
   *
   * @description
   * Optional projected content-template directive inside this item.
   *
   * @type {Signal<NavigationMenuContentDirective | undefined>}
   */
  private readonly contentPart: Signal<NavigationMenuContentDirective | undefined> =
    contentChild<NavigationMenuContentDirective>(NavigationMenuContentDirective);

  /**
   * Property triggerPart
   * @readonly
   *
   * @description
   * Optional projected trigger element queried from the trigger directive.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly triggerPart: Signal<ElementRef<HTMLElement> | undefined> = contentChild<
    NavigationMenuTriggerDirective,
    ElementRef<HTMLElement>
  >(NavigationMenuTriggerDirective, {
    read: ElementRef<HTMLElement>,
  });

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the root selection currently matches this item's value.
   *
   * @type {Signal<boolean>}
   */
  public readonly open: Signal<boolean> = computed<boolean>(
    (): boolean => this.menu.value() === this.value(),
  );

  /**
   * Property content
   * @readonly
   *
   * @description
   * Projected template exposed as a signal for the viewport, when present.
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly content: Signal<TemplateRef<unknown> | undefined> = computed<
    TemplateRef<unknown> | undefined
  >((): TemplateRef<unknown> | undefined => this.contentPart()?.template);

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Native trigger element exposed for focus restoration after closing on Escape.
   *
   * @type {Signal<HTMLElement | undefined>}
   */
  public readonly trigger: Signal<HTMLElement | undefined> = computed<HTMLElement | undefined>(
    (): HTMLElement | undefined => this.triggerPart()?.nativeElement,
  );
  // #endregion
}
