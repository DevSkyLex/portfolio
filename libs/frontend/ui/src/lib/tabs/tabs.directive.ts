import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
  type WritableSignal,
  Directive,
  ElementRef,
  Injector,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { TabsActivation } from '@internal/ui/lib/tabs/models/tabs/tabs-activation.type';
import { tabsListVariants } from '@internal/ui/lib/tabs/constants/tabs-list.variants';
import type { TabsOrientation } from '@internal/ui/lib/tabs/models/tabs/tabs-orientation.type';
import { tabsTriggerVariants } from '@internal/ui/lib/tabs/constants/tabs-trigger.variants';
import { booleanAttribute } from '@internal/ui/lib/boolean-attribute/boolean-attribute.utils';

/**
 * Directive TabsDirective
 * @class TabsDirective
 *
 * @description
 * Coordinates tab selection, focus movement, orientation and activation behavior for one tab set.
 * Its value is the selected trigger's value and its generated base id links triggers to panels.
 */
@Directive({
  selector: '[uiTabs]',
  exportAs: 'uiTabs',
  host: {
    '[class]': 'classes()',
    'data-slot': 'tabs',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class TabsDirective {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Two-way selected tab value; `null` represents a tab set with no selected value.
   *
   * @type {ModelSignal<string | null>}
   */
  public readonly value: ModelSignal<string | null> = model<string | null>(null);

  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Axis used to lay out the tab set and apply keyboard navigation semantics.
   *
   * @type {InputSignal<TabsOrientation>}
   */
  public readonly orientation: InputSignal<TabsOrientation> = input<TabsOrientation>('horizontal');

  /**
   * Property activation
   * @readonly
   *
   * @description
   * Whether keyboard focus selects a tab immediately or requires Enter or Space.
   *
   * @type {InputSignal<TabsActivation>}
   */
  public readonly activation: InputSignal<TabsActivation> = input<TabsActivation>('automatic');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the tab-set layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property baseId
   * @readonly
   *
   * @description
   * Unique id prefix used to associate trigger and panel elements in this tab set.
   *
   * @type {string}
   */
  public readonly baseId: string = inject<RenderIdService>(RenderIdService).next('ui-tabs-');

  /**
   * Property triggers
   * @readonly
   *
   * @description
   * Descendant tab triggers discovered before filtering by their owning tab set.
   *
   * @type {Signal<readonly TabsTriggerDirective[]>}
   */
  private readonly triggers: Signal<readonly TabsTriggerDirective[]> =
    contentChildren<TabsTriggerDirective>(
      forwardRef((): typeof TabsTriggerDirective => TabsTriggerDirective),
      { descendants: true },
    );

  /**
   * Property ownTriggers
   * @readonly
   *
   * @description
   * Triggers whose owning tabs directive is this instance.
   *
   * @type {Signal<TabsTriggerDirective[]>}
   */
  private readonly ownTriggers: Signal<TabsTriggerDirective[]> = computed<TabsTriggerDirective[]>(
    (): TabsTriggerDirective[] =>
      this.triggers().filter((trigger: TabsTriggerDirective): boolean => trigger.tabs === this),
  );

  /**
   * Property focused
   * @readonly
   *
   * @description
   * Tab value currently holding the tab stop while manual activation moves focus independently.
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly focused: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property tabStop
   * @readonly
   *
   * @description
   * Tab receiving the single tab stop: focused tab when valid, otherwise selected or first enabled.
   *
   * @type {Signal<string | null>}
   */
  public readonly tabStop: Signal<string | null> = computed<string | null>((): string | null => {
    const triggers: TabsTriggerDirective[] = this.ownTriggers();
    const has = (value: string | null): boolean =>
      triggers.some(
        (trigger: TabsTriggerDirective): boolean => trigger.value() === value && !trigger.disabled,
      );
    const focused: string | null = this.focused();
    if (has(focused)) return focused;
    const value: string | null = this.value();
    if (has(value)) return value;
    return (
      triggers.find((trigger: TabsTriggerDirective): boolean => !trigger.disabled)?.value() ?? null
    );
  });

  /**
   * Property dir
   * @readonly
   *
   * @description
   * Directionality service used to configure horizontal keyboard navigation.
   *
   * @type {Directionality}
   */
  private readonly dir: Directionality = inject<Directionality>(Directionality);

  /**
   * Property keyManager
   * @readonly
   *
   * @description
   * CDK manager for wrapping arrow navigation, Home and End, and disabled-trigger skipping.
   *
   * @type {FocusKeyManager<TabsTriggerDirective>}
   */
  private readonly keyManager: FocusKeyManager<TabsTriggerDirective> = new FocusKeyManager(
    this.ownTriggers,
    inject<Injector>(Injector),
  )
    .withHomeAndEnd()
    .withWrap()
    .skipPredicate((trigger: FocusableOption & TabsTriggerDirective): boolean => trigger.disabled);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Flex layout classes selected by orientation and merged with caller utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex gap-6', this.orientation() === 'horizontal' ? 'flex-col' : 'flex-row', this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method select
   * @method select
   *
   * @description
   * Sets the selected tab value.
   *
   * @param {string} value - Value of the tab to select.
   * @returns {void}
   */
  public select(value: string): void {
    this.value.set(value);
  }

  /**
   * Method onTriggerKeydown
   * @method onTriggerKeydown
   *
   * @description
   * Moves focus to the adjacent enabled tab and updates the selected value for automatic activation.
   *
   * @param {TabsTriggerDirective} trigger - Trigger that received the keyboard event.
   * @param {KeyboardEvent} event - Keyboard event delegated to the CDK key manager.
   * @returns {void}
   */
  public onTriggerKeydown(trigger: TabsTriggerDirective, event: KeyboardEvent): void {
    const vertical: boolean = this.orientation() === 'vertical';
    this.keyManager
      .withVerticalOrientation(vertical)
      .withHorizontalOrientation(vertical ? null : this.dir.valueSignal());
    this.keyManager.updateActiveItem(trigger);
    this.keyManager.onKeydown(event);
    const active: (FocusableOption & TabsTriggerDirective) | null = this.keyManager.activeItem;
    if (!active || active === trigger) return;
    this.focused.set(active.value());
    if (this.activation() === 'automatic') this.select(active.value());
  }

  /**
   * Method onListFocusOut
   * @method onListFocusOut
   *
   * @description
   * Clears temporary focus state when focus leaves the tab list so its tab stop follows selection.
   *
   * @param {FocusEvent} event - Focus transition from within the tab list.
   * @returns {void}
   */
  public onListFocusOut(event: FocusEvent): void {
    const list: HTMLElement = event.currentTarget as HTMLElement;
    if (!list.contains(event.relatedTarget as Node | null)) this.focused.set(null);
  }
  // #endregion
}

/**
 * Directive TabsListDirective
 * @class TabsListDirective
 *
 * @description
 * Provides the accessible tab-list container and delegates focus-leave handling to its tab set.
 */
@Directive({
  selector: '[uiTabsList]',
  host: {
    role: 'tablist',
    '[class]': 'classes()',
    'data-slot': 'tabs-list',
    '[attr.aria-orientation]': 'tabs.orientation()',
    '(focusout)': 'tabs.onListFocusOut($event)',
  },
})
export class TabsListDirective {
  // #region Properties
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Owning tab set that supplies orientation and focus behavior to the list.
   *
   * @type {TabsDirective}
   */
  protected readonly tabs: TabsDirective = inject<TabsDirective>(TabsDirective);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with orientation-specific list styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Tab-list classes selected from the owning set's orientation.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(tabsListVariants({ orientation: this.tabs.orientation() }), this.class()),
  );
  // #endregion
}

/**
 * Directive TabsTriggerDirective
 * @class TabsTriggerDirective
 *
 * @description
 * Implements an accessible tab button linked to its matching tab panel.
 */
@Directive({
  selector: 'button[uiTabsTrigger]',
  host: {
    type: 'button',
    role: 'tab',
    '[class]': 'classes()',
    'data-slot': 'tabs-trigger',
    '[id]': 'tabs.baseId + "-tab-" + value()',
    '[attr.aria-controls]': 'tabs.baseId + "-panel-" + value()',
    '[attr.aria-selected]': 'selected()',
    '[attr.tabindex]': 'tabs.tabStop() === value() ? 0 : -1',
    '[attr.data-state]': 'selected() ? "active" : "inactive"',
    '[disabled]': 'disabledInput()',
    '(click)': 'tabs.select(value())',
    '(keydown)': 'tabs.onTriggerKeydown(this, $event)',
  },
})
export class TabsTriggerDirective implements FocusableOption {
  // #region Properties
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Owning tab set that provides selection, orientation and generated ids.
   *
   * @type {TabsDirective}
   */
  public readonly tabs: TabsDirective = inject<TabsDirective>(TabsDirective);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Required value identifying the tab represented by this button.
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>({ alias: 'uiTabsTrigger' });

  /**
   * Property disabledInput
   * @readonly
   *
   * @description
   * Disabled input exposed as the native `disabled` attribute while preserving the CDK getter.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '>}
   */
  public readonly disabledInput: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    // `disabled` stays the FocusableOption getter read by the CDK key manager.
    // eslint-disable-next-line @angular-eslint/no-input-rename
    alias: 'disabled',
    transform: booleanAttribute,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the selected tab orientation styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native button element used to implement CDK focus management.
   *
   * @type {HTMLButtonElement}
   */
  private readonly element: HTMLButtonElement =
    inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Whether this trigger's value matches the owning tab set selection.
   *
   * @type {Signal<boolean>}
   */
  protected readonly selected: Signal<boolean> = computed<boolean>(
    (): boolean => this.tabs.value() === this.value(),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Trigger classes selected by the tab set orientation and merged with caller utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(tabsTriggerVariants({ orientation: this.tabs.orientation() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method disabled
   * @method disabled
   *
   * @description
   * Exposes the input value through the property required by the CDK focus manager.
   *
   * @returns {boolean} Whether the trigger is disabled.
   */
  public get disabled(): boolean {
    return this.disabledInput();
  }

  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the native tab button.
   *
   * @returns {void}
   */
  public focus(): void {
    this.element.focus();
  }
  // #endregion
}

/**
 * Directive TabsContentDirective
 * @class TabsContentDirective
 *
 * @description
 * Implements a tab panel linked to its trigger and hidden while its tab is not selected.
 */
@Directive({
  selector: '[uiTabsContent]',
  host: {
    role: 'tabpanel',
    tabindex: '0',
    '[class]': 'classes()',
    'data-slot': 'tabs-content',
    '[id]': 'tabs.baseId + "-panel-" + value()',
    '[attr.aria-labelledby]': 'tabs.baseId + "-tab-" + value()',
    '[attr.data-state]': 'selected() ? "active" : "inactive"',
    '[hidden]': '!selected()',
  },
})
export class TabsContentDirective {
  // #region Properties
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Owning tab set that supplies selection and generated trigger ids.
   *
   * @type {TabsDirective}
   */
  protected readonly tabs: TabsDirective = inject<TabsDirective>(TabsDirective);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Required value of the trigger associated with this panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>({ alias: 'uiTabsContent' });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the panel layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Whether this panel's value matches the selected tab value.
   *
   * @type {Signal<boolean>}
   */
  protected readonly selected: Signal<boolean> = computed<boolean>(
    (): boolean => this.tabs.value() === this.value(),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Panel layout, focus and active-state entrance animation classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'flex-1 rounded-option outline-4 outline-transparent focus-visible:outline-star/12 data-[state=active]:animate-fade-up motion-reduce:animate-none',
      this.class(),
    ),
  );
  // #endregion
}
