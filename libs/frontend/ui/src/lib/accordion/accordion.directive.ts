import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  Injector,
  computed,
  forwardRef,
  contentChildren,
  inject,
  input,
  model,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { AccordionType } from '@internal/ui/lib/accordion/models/accordion/accordion-type.type';
import { booleanAttribute } from '@internal/ui/lib/boolean-attribute/boolean-attribute.utils';

/**
 * Directive AccordionDirective
 * @class AccordionDirective
 *
 * @description
 * Coordinates item selection and roving keyboard focus for a vertical APG accordion.
 * The `value` model contains the open item identifiers in either selection mode.
 */
@Directive({
  selector: '[uiAccordion]',
  exportAs: 'uiAccordion',
  host: {
    '[class]': 'classes()',
    'data-slot': 'accordion',
    '[attr.data-orientation]': '"vertical"',
  },
})
export class AccordionDirective {
  // #region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Whether selection permits one open item or multiple open items.
   *
   * @type {InputSignal<AccordionType>}
   */
  public readonly type: InputSignal<AccordionType> = input<AccordionType>('single');

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * In single mode, whether activating the selected item closes it.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly collapsible: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(true, { transform: booleanAttribute });

  /**
   * Property value
   *
   * @description
   * Identifiers of currently open items; updates are emitted through the model binding.
   *
   * @type {ModelSignal<readonly string[]>}
   */
  public readonly value: ModelSignal<readonly string[]> = model<readonly string[]>([]);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the accordion's vertical layout classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property triggers
   * @readonly
   *
   * @description
   * Descendant triggers available to keyboard navigation before filtering by owner.
   */
  private readonly triggers: Signal<readonly AccordionTriggerDirective[]> =
    contentChildren<AccordionTriggerDirective>(
      forwardRef(() => AccordionTriggerDirective),
      { descendants: true },
    );

  /**
   * Property ownTriggers
   * @readonly
   *
   * @description
   * Descendant triggers whose item belongs to this accordion instance.
   */
  private readonly ownTriggers: Signal<AccordionTriggerDirective[]> = computed<
    AccordionTriggerDirective[]
  >(() => this.triggers().filter((trigger) => trigger.accordion === this));

  /**
   * Property keyManager
   * @readonly
   *
   * @description
   * Vertical roving-focus manager with Home, End, wrapping, and disabled-item skipping enabled.
   */
  private readonly keyManager: FocusKeyManager<AccordionTriggerDirective> =
    new FocusKeyManager<AccordionTriggerDirective>(this.ownTriggers, inject<Injector>(Injector))
      .withVerticalOrientation()
      .withHomeAndEnd()
      .withWrap()
      .skipPredicate((trigger) => trigger.disabled);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Vertical layout classes combined with caller classes for the host.
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex w-full flex-col', this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method isOpen
   * @method isOpen
   *
   * @description
   * Reports whether the supplied item identifier is in the open-value model.
   *
   * @param {string} item - Identifier configured on an accordion item.
   *
   * @returns {boolean} Whether the item is open.
   */
  public isOpen(item: string): boolean {
    return this.value().includes(item);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Applies the current selection mode and collapsibility rule to an item activation.
   *
   * @param {string} item - Identifier configured on the activated item.
   *
   * @returns {void}
   */
  public toggle(item: string): void {
    const open: boolean = this.isOpen(item);
    if (this.type() === 'multiple') {
      this.value.update((values) =>
        open ? values.filter((value) => value !== item) : [...values, item],
      );
    } else if (!open) {
      this.value.set([item]);
    } else if (this.collapsible()) {
      this.value.set([]);
    }
  }

  /**
   * Method onTriggerKeydown
   * @method onTriggerKeydown
   *
   * @description
   * Routes supported vertical-navigation keys to the CDK manager after setting the active trigger.
   *
   * @param {AccordionTriggerDirective} trigger - Trigger receiving the keyboard event.
   * @param {KeyboardEvent} event - Native key event from that trigger.
   *
   * @returns {void}
   */
  public onTriggerKeydown(trigger: AccordionTriggerDirective, event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    this.keyManager.updateActiveItem(trigger);
    this.keyManager.onKeydown(event);
  }
  // #endregion
}

/**
 * Directive AccordionItemDirective
 * @class AccordionItemDirective
 *
 * @description
 * Associates one trigger and content section with its parent accordion and derives its open state.
 */
@Directive({
  selector: '[uiAccordionItem]',
  exportAs: 'uiAccordionItem',
  host: {
    '[class]': 'classes()',
    'data-slot': 'accordion-item',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'disabled() || null',
  },
})
export class AccordionItemDirective {
  // #region Properties
  /**
   * Property accordion
   * @readonly
   *
   * @description
   * Parent accordion that owns this item's selection state.
   *
   * @type {AccordionDirective}
   */
  public readonly accordion: AccordionDirective = inject<AccordionDirective>(AccordionDirective);

  /**
   * Property uid
   * @readonly
   *
   * @description
   * Per-instance sequence used to create stable default values and ARIA identifiers.
   */
  private readonly uid: number =
    inject<RenderIdService>(RenderIdService).nextNumber('ui-accordion-');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Item identifier used by the parent selection model; defaults to the generated instance id.
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input<string>(`item-${this.uid}`);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents pointer activation and marks the corresponding trigger disabled.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, { transform: booleanAttribute });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the item border style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * Identifier assigned to this item's trigger and referenced by its content section.
   *
   * @type {string}
   */
  public readonly triggerId: string = `ui-accordion-${this.uid}-trigger`;

  /**
   * Property contentId
   * @readonly
   *
   * @description
   * Identifier assigned to this item's content and referenced by its trigger.
   *
   * @type {string}
   */
  public readonly contentId: string = `ui-accordion-${this.uid}-content`;

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the parent selection model currently contains this item's identifier.
   *
   * @type {Signal<boolean>}
   */
  public readonly open: Signal<boolean> = computed<boolean>(() =>
    this.accordion.isOpen(this.value()),
  );

  /**
   * Property state
   * @readonly
   *
   * @description
   * String state reflected to trigger and content data attributes.
   *
   * @type {Signal<'open' | 'closed'>}
   */
  public readonly state: Signal<'open' | 'closed'> = computed<'open' | 'closed'>(() =>
    this.open() ? 'open' : 'closed',
  );

  /**
   * Property locked
   * @readonly
   *
   * @description
   * True only for the selected item in single mode when collapsing is disabled.
   *
   * @type {Signal<boolean>}
   */
  public readonly locked: Signal<boolean> = computed<boolean>(
    () => this.open() && this.accordion.type() === 'single' && !this.accordion.collapsible(),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Item border class combined with caller classes.
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('border-b border-line', this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Requests a parent selection update unless the item is disabled or locked open.
   *
   * @returns {void}
   */
  public toggle(): void {
    if (!this.disabled() && !this.locked()) this.accordion.toggle(this.value());
  }
  // #endregion
}

/**
 * Directive AccordionTriggerDirective
 * @class AccordionTriggerDirective
 *
 * @description
 * Connects a heading button to its item state and implements the CDK focusable-option contract for
 * roving keyboard navigation. Place the button inside a heading with the appropriate document level.
 */
@Directive({
  selector: 'button[uiAccordionTrigger]',
  host: {
    type: 'button',
    '[class]': 'classes()',
    'data-slot': 'accordion-trigger',
    '[id]': 'item.triggerId',
    '[attr.aria-controls]': 'item.contentId',
    '[attr.aria-expanded]': 'item.open()',
    '[attr.aria-disabled]': 'item.locked() || null',
    '[attr.data-state]': 'item.state()',
    '[disabled]': 'item.disabled()',
    '(click)': 'item.toggle()',
    '(keydown)': 'accordion.onTriggerKeydown(this, $event)',
  },
})
export class AccordionTriggerDirective implements FocusableOption {
  // #region Properties
  /**
   * Property item
   * @readonly
   *
   * @description
   * Accordion item that owns this trigger and supplies its state and identifiers.
   *
   * @type {AccordionItemDirective}
   */
  protected readonly item: AccordionItemDirective =
    inject<AccordionItemDirective>(AccordionItemDirective);

  /**
   * Property accordion
   * @readonly
   *
   * @description
   * Parent accordion used to route supported keyboard events.
   *
   * @type {AccordionDirective}
   */
  public readonly accordion: AccordionDirective = this.item.accordion;

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the trigger's focus and layout styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native button used to implement the focusable-option contract.
   *
   * @type {HTMLButtonElement}
   */
  private readonly element: HTMLButtonElement =
    inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Trigger layout and visible-focus classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex w-full flex-1 items-center justify-between gap-4 rounded-option border border-transparent py-4 text-left text-control text-star',
      'transition-[color,border-color] duration-(--dur-pop) ease-orbit hover:text-star-muted',
      'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
      'disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
      this.class(),
    ),
  );
  // #endregion

  // #region Methods
  /**
   * Method disabled
   * @method disabled
   *
   * @description
   * Exposes the owning item's disabled state to the CDK focus key manager.
   *
   * @returns {boolean} Whether this trigger must be skipped by keyboard navigation.
   */
  public get disabled(): boolean {
    return this.item.disabled();
  }

  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves browser focus to the native trigger button.
   *
   * @returns {void}
   */
  public focus(): void {
    this.element.focus();
  }
  // #endregion
}

/**
 * Component AccordionIconComponent
 * @class AccordionIconComponent
 *
 * @description
 * Renders the decorative chevron and rotates it when the parent item is open.
 */
@Component({
  selector: 'ui-accordion-icon',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    'data-slot': 'accordion-icon',
    'aria-hidden': 'true',
    '[attr.data-state]': 'item.state()',
  },
  template: `<ng-icon [svg]="icons.chevron" size="16" aria-hidden="true" />`,
})
export class AccordionIconComponent {
  // #region Properties
  /**
   * Property item
   * @readonly
   *
   * @description
   * Item state used to synchronize the icon's data attribute and rotation.
   *
   * @type {AccordionItemDirective}
   */
  protected readonly item: AccordionItemDirective =
    inject<AccordionItemDirective>(AccordionItemDirective);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Chevron glyph rendered by the icon component's template.
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronDown } = {
    chevron: lucideChevronDown,
  } as const;

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the icon's alignment and motion styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Icon alignment and state-dependent rotation classes combined with caller classes.
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'inline-flex shrink-0 text-star-muted transition-transform duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
      this.item.open() && 'rotate-180',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Component AccordionContentComponent
 * @class AccordionContentComponent
 *
 * @description
 * Renders an item section linked to its trigger and animates its grid row between collapsed and
 * content height.
 */
@Component({
  selector: 'ui-accordion-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    class:
      'grid transition-[grid-template-rows,visibility] duration-(--dur-roll) ease-orbit motion-reduce:transition-none data-[state=closed]:invisible data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]',
    'data-slot': 'accordion-content',
    '[id]': 'item.contentId',
    '[attr.aria-labelledby]': 'item.triggerId',
    '[attr.data-state]': 'item.state()',
  },
  template: `<div class="min-h-0 overflow-hidden">
    <div [class]="classes()"><ng-content /></div>
  </div>`,
})
export class AccordionContentComponent {
  // #region Properties
  /**
   * Property item
   * @readonly
   *
   * @description
   * Parent item supplying the section identifiers and expanded state.
   *
   * @type {AccordionItemDirective}
   */
  protected readonly item: AccordionItemDirective =
    inject<AccordionItemDirective>(AccordionItemDirective);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the section's spacing and body text styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Section spacing and muted body text classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('pb-4 text-small text-star-muted', this.class()),
  );
  // #endregion
}
