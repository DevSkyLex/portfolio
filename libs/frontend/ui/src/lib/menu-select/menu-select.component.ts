import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  model,
  signal,
  viewChild,
  type InputSignal,
  type ModelSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { MenuMotion } from '@internal/ui/lib/menu-panel/animations/menu-motion/menu-motion';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import type { MenuSelectOption } from '@internal/ui/lib/menu-select/models/menu-select/menu-select-option.interface';

/**
 * Directive MenuSelectIconDirective
 * @class MenuSelectIconDirective
 *
 * @description
 * Exposes an option-specific icon or flag template for the menu rows and selected button.
 *
 * @template T - String value type represented by the options.
 */
@Directive({ selector: 'ng-template[uiMenuSelectIcon]' })
export class MenuSelectIconDirective<T extends string = string> {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Embedded template receiving the current option as its implicit context value.
   *
   * @type {TemplateRef<{ $implicit: MenuSelectOption<T> }>}
   */
  public readonly template: TemplateRef<{ $implicit: MenuSelectOption<T> }> =
    inject<TemplateRef<{ $implicit: MenuSelectOption<T> }>>(TemplateRef);
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   * @static
   *
   * @description
   * Provides Angular's template checker with the option context type; Angular does not invoke this guard at runtime.
   *
   * @template T - String value type represented by the options.
   * @param {MenuSelectIconDirective<T>} directive - Directive owning the template context.
   * @param {unknown} context - Context value supplied by Angular's template checker.
   * @returns {context is { $implicit: MenuSelectOption<T> }} Whether the context is non-null for template narrowing.
   */
  public static ngTemplateContextGuard<T extends string>(
    directive: MenuSelectIconDirective<T>,
    context: unknown,
  ): context is { $implicit: MenuSelectOption<T> } {
    // Type narrowing only: Angular never calls the guard at runtime.
    return directive !== null && context !== null;
  }
  // #endregion
}

/**
 * Component MenuSelectComponent
 * @class MenuSelectComponent
 *
 * @description
 * Provides a drawn listbox with button-driven selection, arrow-key navigation, optional leading option templates and animated panel motion.
 * Focus moves to the list when it opens; Escape restores trigger focus, while Tab closes without stealing focus.
 *
 * @template T - String value type accepted by the options and selection model.
 */
@Component({
  selector: 'ui-menu-select',
  imports: [NgIcon, NgTemplateOutlet],
  templateUrl: './menu-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'group/menu relative inline-block',
    'data-slot': 'menu-select',
    '[attr.data-open]': 'open() ? "" : null',
  },
})
export class MenuSelectComponent<T extends string = string> {
  // #region Properties
  /**
   * Property options
   * @readonly
   *
   * @description
   * Required options displayed in list order; an empty list leaves no active choice.
   *
   * @type {InputSignal<readonly MenuSelectOption<T>[]>}
   */
  public readonly options: InputSignal<readonly MenuSelectOption<T>[]> =
    input.required<readonly MenuSelectOption<T>[]>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * Required two-way selection model updated when a valid option is chosen.
   *
   * @type {ModelSignal<T>}
   */
  public readonly value: ModelSignal<T> = model.required<T>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Required accessible name used by the visually hidden listbox label.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property placement
   * @readonly
   *
   * @description
   * Selects whether the list unrolls above or below the trigger.
   *
   * @type {InputSignal<'top' | 'bottom'>}
   */
  public readonly placement: InputSignal<'top' | 'bottom'> = input<'top' | 'bottom'>('bottom');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Selects compact or default sizing for the trigger and option rows.
   *
   * @type {InputSignal<'sm' | 'md'>}
   */
  public readonly size: InputSignal<'sm' | 'md'> = input<'sm' | 'md'>('md');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Chevron and check glyphs used by the trigger and selected option.
   *
   * @type {{ readonly chevron: typeof lucideChevronDown; readonly check: typeof lucideCheck }}
   */
  protected readonly icons: {
    readonly chevron: typeof lucideChevronDown;
    readonly check: typeof lucideCheck;
  } = { chevron: lucideChevronDown, check: lucideCheck } as const;

  /**
   * Property id
   * @readonly
   *
   * @description
   * Hydration-stable prefix used to connect the active option and listbox references.
   *
   * @type {string}
   */
  protected readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-menu-select-');

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the listbox is open and its options are available for navigation.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property active
   * @readonly
   *
   * @description
   * Index of the currently active option, or `-1` before an option has been selected for navigation.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly active: WritableSignal<number> = signal<number>(-1);

  /**
   * Property iconTemplate
   * @readonly
   *
   * @description
   * Optional projected icon template rendered for the selected option and each option row.
   *
   * @type {Signal<MenuSelectIconDirective<T> | undefined>}
   */
  protected readonly iconTemplate: Signal<MenuSelectIconDirective<T> | undefined> = contentChild<
    MenuSelectIconDirective<T>
  >(MenuSelectIconDirective<T>);

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Selected option when present, falling back to the first option for display when the model has no match.
   *
   * @type {Signal<MenuSelectOption<T> | undefined>}
   */
  protected readonly selected: Signal<MenuSelectOption<T> | undefined> = computed<
    MenuSelectOption<T> | undefined
  >(() => this.options().find((option) => option.value === this.value()) ?? this.options()[0]);

  /**
   * Property activeId
   * @readonly
   *
   * @description
   * DOM ID of the active option while open, or `null` when there is no active descendant.
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeId: Signal<string | null> = computed<string | null>(() =>
    this.open() && this.active() >= 0 ? `${this.id}-${this.active()}` : null,
  );

  /**
   * Property buttonClasses
   * @readonly
   *
   * @description
   * Trigger classes chosen from the compact or default size input.
   *
   * @type {Signal<string>}
   */
  protected readonly buttonClasses: Signal<string> = computed<string>(() =>
    cn(
      'flex w-full cursor-pointer items-center justify-between rounded-field border border-line-field bg-transparent text-left font-medium text-star hover:border-line-hover hover:bg-star/5 focus-visible:border-signal/55 focus-visible:outline-4 focus-visible:outline-offset-0 focus-visible:outline-signal/12 aria-expanded:border-signal/55 aria-expanded:outline-none aria-expanded:hover:border-signal/55',
      this.size() === 'sm'
        ? 'h-9 gap-2 pr-2.5 pl-3 text-[14px]/5'
        : 'h-11 gap-2.5 pr-3.5 pl-4 text-[15px]/5',
    ),
  );

  /**
   * Property listClasses
   * @readonly
   *
   * @description
   * Positions the list above or below the trigger and leaves visibility animation to inline motion styles.
   *
   * @type {Signal<string>}
   */
  protected readonly listClasses: Signal<string> = computed<string>(() =>
    cn(
      'invisible absolute left-0 z-60 m-0 min-w-full list-none rounded-field border border-line bg-void-raised p-1 opacity-0 shadow-float outline-none light:bg-void',
      this.placement() === 'top'
        ? 'bottom-[calc(100%+4px)] translate-y-1 group-data-open/menu:translate-none'
        : 'top-[calc(100%+4px)] -translate-y-1 group-data-open/menu:translate-none',
    ),
  );

  /**
   * Property optionClasses
   * @readonly
   *
   * @description
   * Styles option states and the staggered entrance while keeping options visible when motion is reduced.
   *
   * @type {Signal<string>}
   */
  protected readonly optionClasses: Signal<string> = computed<string>(() =>
    cn(
      'group/option relative z-1 flex -translate-y-1.5 cursor-pointer items-center rounded-option whitespace-nowrap text-star-muted opacity-0 blur-[3px] transition-[opacity,translate,filter,background-color,color] duration-[80ms,80ms,80ms,150ms,150ms] ease-orbit group-data-open/menu:translate-y-0 group-data-open/menu:opacity-100 group-data-open/menu:blur-none group-data-open/menu:delay-[calc(80ms+var(--i)*35ms),calc(80ms+var(--i)*35ms),calc(80ms+var(--i)*35ms),0s,0s] group-data-open/menu:duration-[300ms,400ms,300ms,150ms,150ms] data-active:text-star motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none',
      this.size() === 'sm'
        ? 'min-h-8 gap-2 px-2 text-[14px]/5'
        : 'min-h-10 gap-2.5 px-2.5 text-[15px]/5',
    ),
  );

  /**
   * Property buttonRef
   * @readonly
   *
   * @description
   * Required query for the trigger button used by focus management.
   *
   * @type {Signal<ElementRef<HTMLButtonElement>>}
   */
  private readonly buttonRef: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('button');

  /**
   * Property listRef
   * @readonly
   *
   * @description
   * Required query for the listbox element used by keyboard interaction and focus management.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly listRef: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('list');

  /**
   * Property pillRef
   * @readonly
   *
   * @description
   * Required query for the active-option background pill that moves between rows.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly pillRef: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('pill');

  /**
   * Property chevronRef
   * @readonly
   *
   * @description
   * Optional query for the trigger chevron rotated by panel motion.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly chevronRef: Signal<ElementRef<HTMLElement> | undefined> = viewChild<
    HTMLElement,
    ElementRef<HTMLElement>
  >('chevron', {
    read: ElementRef<HTMLElement>,
  });

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element used to listen for outside pointer presses and update its open-state attribute.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property motion
   * @readonly
   *
   * @description
   * Stateful panel animator shared with menu-based select overlays.
   *
   * @type {MenuMotion}
   */
  private readonly motion: MenuMotion = new MenuMotion();

  /**
   * Property reduced
   *
   * @description
   * Cached reduced-motion preference read after rendering so animation can choose the fade path.
   *
   * @type {boolean}
   */
  private reduced: boolean = false;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reads the user's motion preference after render and registers an outside-pointer listener with destruction cleanup.
   */
  public constructor() {
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender(() => {
      const view: (Window & typeof globalThis) | null = this.host.ownerDocument.defaultView;
      this.reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const outside = (event: PointerEvent): void => {
        if (this.open() && !this.host.contains(event.target as Node)) this.close(false);
      };
      this.host.ownerDocument.addEventListener('pointerdown', outside);
      destroyRef.onDestroy(() => {
        this.host.ownerDocument.removeEventListener('pointerdown', outside);
        this.motion.stop({
          trigger: this.trigger,
          chevron: this.chevronRef()?.nativeElement ?? null,
        });
      });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method trigger
   * @method trigger
   *
   * @description
   * Returns the native button used as the overlay origin and focus-restoration target.
   *
   * @returns {HTMLButtonElement} Trigger element queried from the component template.
   */
  public get trigger(): HTMLButtonElement {
    return this.buttonRef().nativeElement;
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Closes an open listbox with trigger refocus or opens it and focuses the listbox.
   *
   * @returns {void} Updates component state and schedules the corresponding motion.
   */
  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.show();
  }

  /**
   * Method onButtonKeydown
   * @method onButtonKeydown
   *
   * @description
   * Opens the listbox when ArrowDown or ArrowUp is pressed while the trigger is closed.
   *
   * @param {KeyboardEvent} event - Native key event from the trigger button.
   * @returns {void} Prevents the handled key's browser default and opens the panel.
   */
  protected onButtonKeydown(event: KeyboardEvent): void {
    if (!this.open() && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.show();
    }
  }

  /**
   * Method onListKeydown
   * @method onListKeydown
   *
   * @description
   * Moves the active option, commits it, closes the listbox or lets focus leave according to the listbox key pattern.
   *
   * @param {KeyboardEvent} event - Native key event from the listbox.
   * @returns {void} Prevents defaults for handled navigation and selection keys.
   */
  protected onListKeydown(event: KeyboardEvent): void {
    const count: number = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.setActive(this.active() + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.setActive(this.active() - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.setActive(0);
        break;
      case 'End':
        event.preventDefault();
        this.setActive(count - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(this.active());
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
      default:
        break;
    }
  }

  /**
   * Method onListClick
   * @method onListClick
   *
   * @description
   * Delegates list clicks to the closest option row because option rows are not individual tab stops.
   *
   * @param {Event} event - Click from the listbox subtree.
   * @returns {void} Selects only when the target identifies an existing option.
   */
  protected onListClick(event: Event): void {
    const index: number = this.optionIndex(event);
    if (index >= 0) this.choose(index);
  }

  /**
   * Method onListPointerMove
   * @method onListPointerMove
   *
   * @description
   * Updates the active option when pointer movement enters another rendered option.
   *
   * @param {Event} event - Pointer movement from the listbox subtree.
   * @returns {void} Leaves active state unchanged outside an option or on the current option.
   */
  protected onListPointerMove(event: Event): void {
    const index: number = this.optionIndex(event);
    if (index >= 0 && index !== this.active()) this.setActive(index);
  }

  /**
   * Method choose
   * @method choose
   *
   * @description
   * Updates the selection model for an existing option and closes the listbox with trigger focus.
   *
   * @param {number} index - Option index in the current ordered option input.
   * @returns {void} Ignores an index that no longer resolves to an option.
   */
  protected choose(index: number): void {
    const option: MenuSelectOption<T> | undefined = this.options()[index];
    if (!option) return;
    this.value.set(option.value);
    this.close(true);
  }

  /**
   * Method setActive
   * @method setActive
   *
   * @description
   * Wraps the requested option index through the option list and moves the active background pill.
   *
   * @param {number} index - Requested active option index.
   * @returns {void} Leaves active state unchanged when the list is empty.
   */
  protected setActive(index: number): void {
    const count: number = this.options().length;
    if (!count) return;
    this.active.set((index + count) % count);
    this.movePill();
  }

  /**
   * Method optionIndex
   * @method optionIndex
   *
   * @description
   * Reads the data index from the nearest option row containing the event target.
   *
   * @param {Event} event - Click or pointer event originating in the listbox.
   * @returns {number} Parsed option index, or `-1` when the target is outside an option.
   */
  private optionIndex(event: Event): number {
    const option: Element | null | undefined = (event.target as Element | null)?.closest?.(
      '[role="option"]',
    );
    return option ? Number(option.getAttribute('data-index')) : -1;
  }

  /**
   * Method show
   * @method show
   *
   * @description
   * Opens the listbox, activates the selected option or first fallback, reveals and focuses the list, then starts motion.
   *
   * @returns {void} Updates open state and schedules the opening animation.
   */
  private show(): void {
    const index: number = this.options().findIndex((option) => option.value === this.value());
    this.open.set(true);

    // Set now (the binding follows): the options' transitions start with the motion.
    this.host.setAttribute('data-open', '');
    this.setActive(Math.max(0, index));

    // A hidden list cannot take the focus: the motion keeps it visible from now on.
    const list: HTMLElement = this.listRef().nativeElement;
    list.style.visibility = 'visible';
    list.focus({ preventScroll: true });
    this.run(true);
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the listbox, updates its active pill, optionally restores trigger focus and animates shut.
   *
   * @param {boolean} refocus - Whether focus should return to the trigger.
   * @returns {void} Does nothing when the listbox is already closed.
   */
  private close(refocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.host.removeAttribute('data-open');
    this.movePill();
    if (refocus) this.buttonRef().nativeElement.focus({ preventScroll: true });
    this.run(false);
  }

  /**
   * Method movePill
   * @method movePill
   *
   * @description
   * Positions the active-option pill, disables movement transitions for its first placement and under reduced motion, while allowing the reduced-motion opacity fade.
   *
   * @returns {void} Hides the pill when there is no active visible option.
   */
  private movePill(): void {
    const pill: HTMLElement = this.pillRef().nativeElement;
    const option: HTMLElement | null = this.listRef().nativeElement.querySelector<HTMLElement>(
      `#${this.id}-${this.active()}`,
    );
    if (!option || !this.open()) {
      pill.removeAttribute('data-on');
      return;
    }
    const jump: boolean = !pill.hasAttribute('data-on') || this.reduced;
    if (jump) pill.style.transition = 'none';
    pill.style.transform = `translateY(${option.offsetTop}px)`;
    pill.style.height = `${option.offsetHeight}px`;

    // Reduced motion skips pill movement while the reduced-motion class retains its short opacity fade.
    if (this.reduced) pill.setAttribute('data-on', '');
    if (jump) {
      void pill.offsetHeight;
      pill.style.transition = '';
    }
    pill.setAttribute('data-on', '');
  }

  /**
   * Method run
   * @method run
   *
   * @description
   * Runs panel motion and synchronizes list visibility and pointer handling with its frame progress.
   *
   * @param {boolean} open - Whether the target panel state is open.
   * @returns {void} Delegates animation and cancellation state to `MenuMotion`.
   */
  private run(open: boolean): void {
    const list: HTMLElement = this.listRef().nativeElement;
    this.motion.run(
      { trigger: this.trigger, list, chevron: this.chevronRef()?.nativeElement ?? null },
      open,
      {
        reduced: this.reduced,
        above: this.placement() === 'top',
        // In the flow of the page: the list leaves the accessibility tree and the pointer once rolled up.
        onFrame: (p) => {
          list.style.visibility = p > 0.0005 || open ? 'visible' : 'hidden';
          list.style.pointerEvents = open ? 'auto' : 'none';
        },
      },
    );
  }
}
