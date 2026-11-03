import { NgTemplateOutlet } from '@angular/common';
import {
  type InputSignal,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { menuPanelVariants } from '@internal/ui/lib/menu-panel/constants/menu-panel.variants';
import { NAVIGATION_MENU } from '@internal/ui/lib/navigation-menu/tokens/navigation-menu/navigation-menu.token';
import type { NavigationMenuHost } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-host.interface';

/**
 * Component NavigationMenuViewportComponent
 * @class NavigationMenuViewportComponent
 *
 * @description
 * Renders the current open item's projected template below the navigation list with linked trigger and panel IDs.
 */
@Component({
  selector: 'ui-navigation-menu-viewport',
  imports: [NgTemplateOutlet],
  template: `
    @if (menu.openItem(); as item) {
      @if (item.content(); as content) {
        <div
          data-slot="navigation-menu-content"
          [id]="item.contentId"
          [attr.aria-labelledby]="item.triggerId"
          [class]="classes()"
        >
          <ng-container [ngTemplateOutlet]="content" />
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute top-full left-0 z-50 pt-2 empty:hidden',
    'data-slot': 'navigation-menu-viewport',
  },
})
export class NavigationMenuViewportComponent {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional viewport classes merged with the shared floating panel appearance.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Root navigation state used to select the currently open item.
   *
   * @type {NavigationMenuHost}
   */
  protected readonly menu: NavigationMenuHost = inject<NavigationMenuHost>(NAVIGATION_MENU);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared floating panel styling with inner padding and caller class additions.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(menuPanelVariants(), 'p-2', this.class()),
  );
  // #endregion
}

/**
 * Component NavigationMenuIndicatorComponent
 * @class NavigationMenuIndicatorComponent
 *
 * @description
 * Draws a decorative bar beneath the currently open trigger and updates its bounds after Angular renders.
 */
@Component({
  selector: 'ui-navigation-menu-indicator',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class:
      'pointer-events-none absolute top-full h-0.5 rounded-full bg-star transition-[left,width,opacity] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
    '[class.opacity-0]': '!menu.openItem()',
    '[style.left.px]': 'left()',
    '[style.width.px]': 'width()',
    'data-slot': 'navigation-menu-indicator',
  },
})
export class NavigationMenuIndicatorComponent {
  // #region Properties
  /**
   * Property menu
   * @readonly
   *
   * @description
   * Root navigation state used to locate the open item's trigger element.
   *
   * @type {NavigationMenuHost}
   */
  protected readonly menu: NavigationMenuHost = inject<NavigationMenuHost>(NAVIGATION_MENU);

  /**
   * Property left
   * @readonly
   *
   * @description
   * Horizontal offset of the indicator relative to the navigation root in layout pixels.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly left: WritableSignal<number> = signal<number>(0);

  /**
   * Property width
   * @readonly
   *
   * @description
   * Width of the active trigger in layout pixels.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly width: WritableSignal<number> = signal<number>(0);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Re-measures the active trigger after render and updates the indicator offset and width when one is open.
   */
  public constructor() {
    afterRenderEffect((): void => {
      const trigger: HTMLElement | undefined = this.menu.openItem()?.trigger();
      if (!trigger) return;
      const origin: DOMRect = this.menu.element.getBoundingClientRect();
      const rect: DOMRect = trigger.getBoundingClientRect();
      this.left.set(rect.left - origin.left);
      this.width.set(rect.width);
    });
  }
  // #endregion
}

/**
 * Component NavigationMenuChevronComponent
 * @class NavigationMenuChevronComponent
 *
 * @description
 * Renders a decorative chevron that rotates through its expanded trigger's group state.
 */
@Component({
  selector: 'ui-navigation-menu-chevron',
  imports: [NgIcon],
  template: `<ng-icon [svg]="icons.chevron" size="14" aria-hidden="true" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class:
      'flex text-star-faint transition-transform duration-(--dur-pop) ease-orbit group-aria-expanded:rotate-180 motion-reduce:transition-none',
    'data-slot': 'navigation-menu-chevron',
  },
})
export class NavigationMenuChevronComponent {
  // #region Properties
  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide chevron displayed beside a disclosure trigger.
   *
   * @type {{ readonly chevron: typeof lucideChevronDown }}
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronDown } = {
    chevron: lucideChevronDown,
  } as const;
  // #endregion
}
