import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { SidebarService } from '@internal/ui/lib/sidebar/services/sidebar/sidebar.service';
import {
  type SidebarMenuButtonSize,
  sidebarMenuButtonVariants,
} from '@internal/ui/lib/sidebar/constants/sidebar-menu-button.variants';
import { booleanAttribute } from '@internal/ui/lib/boolean-attribute/boolean-attribute.utils';
import { SIDEBAR_TOGGLE_LABEL } from '@internal/ui/lib/sidebar/constants/sidebar.constants';

/**
 * Directive SidebarProviderDirective
 * @class SidebarProviderDirective
 *
 * @description
 * Provides sidebar state and width tokens to descendant controls. The open model represents
 * desktop state; the optional Ctrl/Cmd+B shortcut toggles it outside editable fields.
 */
@Directive({
  selector: '[uiSidebarProvider]',
  exportAs: 'uiSidebarProvider',
  providers: [SidebarService],
  host: {
    '[class]': 'classes()',
    'data-slot': 'sidebar-wrapper',
    '[style.--sidebar-width]': 'width()',
    '[style.--sidebar-width-icon]': 'iconWidth()',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class SidebarProviderDirective {
  // #region Properties
  /**
   * Property open
   * @readonly
   *
   * @description
   * Two-way desktop expansion state shared with the scoped sidebar service.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly open: ModelSignal<boolean> = model<boolean>(true);

  /**
   * Property width
   * @readonly
   *
   * @description
   * CSS width token used by the expanded desktop sidebar.
   *
   * @type {InputSignal<string>}
   */
  public readonly width: InputSignal<string> = input<string>('16rem');

  /**
   * Property iconWidth
   * @readonly
   *
   * @description
   * CSS width token used by the icon-only collapsed sidebar.
   *
   * @type {InputSignal<string>}
   */
  public readonly iconWidth: InputSignal<string> = input<string>('3rem');

  /**
   * Property shortcut
   * @readonly
   *
   * @description
   * Whether Ctrl/Cmd+B toggles the desktop sidebar outside editable controls.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '>}
   */
  public readonly shortcut: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(true, {
    transform: booleanAttribute,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the provider host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * Scoped service instance connected to this provider's open model.
   *
   * @type {SidebarService}
   */
  private readonly sidebar: SidebarService = inject<SidebarService>(SidebarService, { self: true });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Wrapper layout classes combined with caller utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('group/sidebar-wrapper flex min-h-svh w-full', this.class()),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects the scoped sidebar service to the provider-owned open model.
   */
  public constructor() {
    this.sidebar.connect(this.open);
  }
  // #endregion

  // #region Methods
  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Toggles the sidebar for Ctrl/Cmd+B unless modifiers or an editable target make the shortcut unsafe.
   *
   * @param {KeyboardEvent} event - Document key event observed by the provider host.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.shortcut() || event.key.toLowerCase() !== 'b') return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const target: HTMLElement | null = event.target as HTMLElement | null;
    if (target?.closest?.('input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    this.sidebar.toggle();
  }
  // #endregion
}

/**
 * Directive SidebarRailDirective
 * @class SidebarRailDirective
 *
 * @description
 * Adds a pointer hit area along the sidebar edge; keyboard access is provided by the trigger button.
 */
@Directive({
  selector: 'button[uiSidebarRail]',
  host: {
    type: 'button',
    tabindex: '-1',
    '[class]': 'classes()',
    'data-slot': 'sidebar-rail',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
    '(click)': 'sidebar.toggle()',
  },
})
export class SidebarRailDirective {
  // #region Properties
  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * Sidebar state toggled when the pointer rail is activated.
   *
   * @type {SidebarService}
   */
  protected readonly sidebar: SidebarService = inject<SidebarService>(SidebarService);

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name and tooltip text for the pointer rail.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(SIDEBAR_TOGGLE_LABEL());

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the rail hit area.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Position, hit-area and side/collapse-aware transition classes for the rail.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'absolute inset-y-0 z-20 hidden w-4 cursor-ew-resize transition-transform duration-(--dur-roll) ease-orbit motion-reduce:transition-none md:flex',
      "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:content-[''] hover:after:bg-line-strong",
      'group-data-[side=left]/sidebar:-right-4 group-data-[side=right]/sidebar:left-0 group-data-[side=right]/sidebar:-translate-x-full',
      'group-data-[collapsible=offcanvas]/sidebar:translate-x-0 group-data-[collapsible=offcanvas]/sidebar:after:left-full',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive SidebarHeaderDirective
 * @class SidebarHeaderDirective
 *
 * @description
 * Styles the leading header area of the sidebar.
 */
@Directive({
  selector: '[uiSidebarHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-header' },
})
export class SidebarHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the header layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Vertical header layout and padding classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex flex-col gap-2 p-2', this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarFooterDirective
 * @class SidebarFooterDirective
 *
 * @description
 * Styles the footer area at the bottom of the sidebar content.
 */
@Directive({
  selector: '[uiSidebarFooter]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-footer' },
})
export class SidebarFooterDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the footer layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Vertical footer layout and padding classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex flex-col gap-2 p-2', this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarContentDirective
 * @class SidebarContentDirective
 *
 * @description
 * Styles the scrollable middle section and hides overflow when the sidebar is icon-only.
 */
@Directive({
  selector: '[uiSidebarContent]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-content' },
})
export class SidebarContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the scrollable content layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Flexible scrolling layout and thin scrollbar classes for sidebar content.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]/sidebar:overflow-hidden',
      '[scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--star)_24%,transparent)_transparent]',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive SidebarGroupDirective
 * @class SidebarGroupDirective
 *
 * @description
 * Groups related navigation content within the sidebar.
 */
@Directive({
  selector: '[uiSidebarGroup]',
  host: { role: 'group', '[class]': 'classes()', 'data-slot': 'sidebar-group' },
})
export class SidebarGroupDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the group layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Relative vertical group layout with minimum-width reset and padding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('relative flex w-full min-w-0 flex-col p-2', this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarGroupLabelDirective
 * @class SidebarGroupLabelDirective
 *
 * @description
 * Styles a group title and fades it out when the sidebar is collapsed to icons. Reference its id
 * from the group with `aria-labelledby` when it provides the group's accessible name.
 */
@Directive({
  selector: '[uiSidebarGroupLabel]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-group-label' },
})
export class SidebarGroupLabelDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the group title styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Monospace title styling and collapse transition classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'flex h-8 shrink-0 items-center px-2 font-mono text-label text-star-faint uppercase',
      'transition-[margin,opacity] duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
      'group-data-[collapsible=icon]/sidebar:-mt-8 group-data-[collapsible=icon]/sidebar:opacity-0',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive SidebarMenuDirective
 * @class SidebarMenuDirective
 *
 * @description
 * Styles the semantic unordered list that contains sidebar menu entries.
 */
@Directive({
  selector: 'ul[uiSidebarMenu]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-menu' },
})
export class SidebarMenuDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the navigation list layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Vertical list classes with compact spacing between navigation items.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex w-full min-w-0 flex-col gap-1', this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarMenuItemDirective
 * @class SidebarMenuItemDirective
 *
 * @description
 * Applies group-relative positioning to one sidebar menu item.
 */
@Directive({
  selector: 'li[uiSidebarMenuItem]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-menu-item' },
})
export class SidebarMenuItemDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the menu-item layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Relative menu-item grouping classes used by nested badges and buttons.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('group/menu-item relative', this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarMenuButtonDirective
 * @class SidebarMenuButtonDirective
 *
 * @description
 * Styles a native link or button as a sidebar entry and preserves its text as the accessible name
 * when the sidebar is collapsed to icons.
 */
@Directive({
  selector: 'button[uiSidebarMenuButton], a[uiSidebarMenuButton]',
  host: {
    '[class]': 'classes()',
    'data-slot': 'sidebar-menu-button',
    '[attr.data-active]': 'isActive() || null',
    '[attr.data-size]': 'size()',
    '[attr.aria-current]': 'link && isActive() ? "page" : null',
  },
})
export class SidebarMenuButtonDirective {
  // #region Properties
  /**
   * Property isActive
   * @readonly
   *
   * @description
   * Whether the entry represents the active route or section.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '>}
   */
  public readonly isActive: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: booleanAttribute,
  });

  /**
   * Property size
   * @readonly
   *
   * @description
   * Height and text sizing variant for the menu entry.
   *
   * @type {InputSignal<SidebarMenuButtonSize>}
   */
  public readonly size: InputSignal<SidebarMenuButtonSize> = input<SidebarMenuButtonSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the selected menu-button size.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property link
   * @readonly
   *
   * @description
   * Whether the host is an anchor, which enables `aria-current` for an active entry.
   *
   * @type {boolean}
   */
  protected readonly link: boolean =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Menu-button classes combining the size variant and caller-provided utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(sidebarMenuButtonVariants({ size: this.size() }), this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarMenuBadgeDirective
 * @class SidebarMenuBadgeDirective
 *
 * @description
 * Positions a count or status badge at the end of a menu entry and hides it in icon-only mode.
 */
@Directive({
  selector: '[uiSidebarMenuBadge]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-menu-badge' },
})
export class SidebarMenuBadgeDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the badge positioning.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Right-edge badge layout with monospace count styling and icon-mode visibility.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'pointer-events-none absolute top-1/2 right-1 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-option px-1',
      'font-mono text-label text-star-muted tabular-nums select-none peer-data-active/menu-button:text-star',
      'group-data-[collapsible=icon]/sidebar:hidden',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive SidebarSeparatorDirective
 * @class SidebarSeparatorDirective
 *
 * @description
 * Renders a horizontal rule between sidebar menu sections.
 */
@Directive({
  selector: '[uiSidebarSeparator]',
  host: {
    role: 'separator',
    '[class]': 'classes()',
    'data-slot': 'sidebar-separator',
  },
})
export class SidebarSeparatorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the separator line.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Inset horizontal rule styling used to divide sidebar content.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('mx-2 h-px w-auto shrink-0 border-0 bg-line', this.class()),
  );
  // #endregion
}

/**
 * Directive SidebarInsetDirective
 * @class SidebarInsetDirective
 *
 * @description
 * Styles the main content area beside the sidebar, adding a raised inset surface when the sidebar
 * uses its inset variant.
 */
@Directive({
  selector: '[uiSidebarInset]',
  host: { '[class]': 'classes()', 'data-slot': 'sidebar-inset' },
})
export class SidebarInsetDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the main content layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Flexible main-area layout with conditional inset border, margin and card radius.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'relative flex w-full min-w-0 flex-1 flex-col bg-void',
      'md:peer-data-[variant=inset]/sidebar:m-2 md:peer-data-[variant=inset]/sidebar:ml-0 md:peer-data-[variant=inset]/sidebar:rounded-card md:peer-data-[variant=inset]/sidebar:border md:peer-data-[variant=inset]/sidebar:border-line',
      'md:peer-data-[variant=inset]/sidebar:peer-data-[state=collapsed]/sidebar:ml-2',
      this.class(),
    ),
  );
  // #endregion
}
