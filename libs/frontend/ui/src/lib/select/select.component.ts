import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { type Highlightable, ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { type ConnectedPosition, CdkConnectedOverlay } from '@angular/cdk/overlay';
import {
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';
import { panelPositions } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';
import { menuPanelVariants } from '@internal/ui/lib/menu-panel/constants/menu-panel.variants';
import { MenuMotion } from '@internal/ui/lib/menu-panel/animations/menu-motion/menu-motion';
import { SelectOptionComponent } from '@internal/ui/lib/select/components/select-option/select-option.component';
import { SELECT_HOST } from '@internal/ui/lib/select/tokens/select/select.token';
import type { SelectHost } from '@internal/ui/lib/select/models/select/select-host.interface';
import type { SelectOptionRef } from '@internal/ui/lib/select/models/select/select-option-ref.interface';

/**
 * Component SelectComponent
 * @class SelectComponent
 * @template T
 *
 * @description
 * Implements a Signal Forms-compatible select-only combobox. Focus stays on the trigger while the active option is
 * exposed through `aria-activedescendant`; the overlay supports wrapped keyboard navigation, typeahead and animated
 * close behavior.
 */
@Component({
  selector: 'ui-select',
  imports: [NgIcon, CdkConnectedOverlay],
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: SELECT_HOST,
      useExisting: forwardRef((): typeof SelectComponent => SelectComponent),
    },
  ],
  host: { class: 'relative block', 'data-slot': 'select' },
})
export class SelectComponent<T = unknown> implements FormValueControl<T | null>, SelectHost {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Writable selected value, using `null` for no selection and serving as the Signal Forms value model.
   *
   * @type {ModelSignal<T | null>}
   */
  public readonly value: ModelSignal<T | null> = model<T | null>(null);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents opening the listbox and disables the trigger.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Exposes the field validation state to the trigger's ARIA attributes and classes.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly invalid: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property required
   * @readonly
   *
   * @description
   * Exposes the required state through the trigger's accessibility attributes.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly required: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the trigger blurs so Signal Forms can mark the control touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Localized French text shown while the current value has no matching option.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.select.placeholder:Choisir une option`,
  );

  /**
   * Property size
   * @readonly
   *
   * @description
   * Trigger size shared with the input catalogue.
   *
   * @type {InputSignal<InputSize>}
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property triggerId
   * @readonly
   *
   * @description
   * Trigger button id used by native labels and the derived listbox id.
   *
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-select-'),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional explicit accessible name for the trigger.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabelledby
   * @readonly
   *
   * @description
   * Optional id reference naming the trigger from existing content.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Optional id reference describing the trigger for assistive technology.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | undefined> = input<string>();

  /**
   * Property compareWith
   * @readonly
   *
   * @description
   * Value comparator used to match selected values to projected options; defaults to `Object.is`.
   *
   * @type {InputSignal<(a: unknown, b: unknown) => boolean>}
   */
  public readonly compareWith: InputSignal<(a: unknown, b: unknown) => boolean> = input<
    (a: unknown, b: unknown) => boolean
  >(Object.is);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged onto the trigger button.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property panelClass
   * @readonly
   *
   * @description
   * Additional classes merged onto the floating listbox panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly panelClass: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Chevron icon reference rendered by the trigger template.
   *
   * @type {{ readonly chevron: typeof lucideChevronDown }}
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronDown } = {
    chevron: lucideChevronDown,
  } as const;

  /**
   * Property positions
   * @readonly
   *
   * @description
   * CDK overlay fallback positions used to place the listbox relative to the trigger.
   *
   * @type {ConnectedPosition[]}
   */
  protected readonly positions: ConnectedPosition[] = panelPositions();

  /**
   * Property listboxId
   * @readonly
   *
   * @description
   * Id of the listbox derived from the trigger id for `aria-controls`.
   *
   * @type {Signal<string>}
   */
  protected readonly listboxId: Signal<string> = computed<string>(
    (): string => `${this.triggerId()}-listbox`,
  );

  /**
   * Property open
   * @readonly
   *
   * @description
   * Whether the listbox is currently exposed as open.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property rendered
   * @readonly
   *
   * @description
   * Keeps list content in the overlay until its closing motion completes.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly rendered: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property minWidth
   * @readonly
   *
   * @description
   * Trigger width captured before opening and applied as the overlay's minimum width.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly minWidth: WritableSignal<number> = signal<number>(0);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector passed to deferred render callbacks and the CDK key manager.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Owner document used for browser motion preferences and active option lookup.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property motion
   * @readonly
   *
   * @description
   * Animation coordinator for the trigger, panel and chevron transitions.
   *
   * @type {MenuMotion}
   */
  private readonly motion: MenuMotion = new MenuMotion();

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Required trigger button reference used for width measurement and focus restoration.
   *
   * @type {Signal<ElementRef<HTMLButtonElement>>}
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Property chevron
   * @readonly
   *
   * @description
   * Optional chevron element animated with the panel.
   *
   * @type {Signal<ElementRef<unknown> | undefined>}
   */
  private readonly chevron: Signal<ElementRef<unknown> | undefined> = viewChild<
    unknown,
    ElementRef<unknown>
  >('chevron', { read: ElementRef });

  /**
   * Property panel
   * @readonly
   *
   * @description
   * Optional rendered listbox panel used for animation and width styling.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly panel: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('panel');

  /**
   * Property highlight
   * @readonly
   *
   * @description
   * Optional selection pill element repositioned under the active option.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly highlight: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('highlight');

  /**
   * Property options
   * @readonly
   *
   * @description
   * Descendant option components managed by selection and keyboard navigation.
   *
   * @type {Signal<readonly SelectOptionComponent<unknown>[]>}
   */
  private readonly options: Signal<readonly SelectOptionComponent<unknown>[]> = contentChildren<
    SelectOptionComponent<unknown>
  >(SelectOptionComponent, {
    descendants: true,
  });

  /**
   * Property keyManager
   * @readonly
   *
   * @description
   * CDK active-descendant manager configured for wrapped vertical navigation and option typeahead.
   *
   * @type {ActiveDescendantKeyManager<SelectOptionComponent<unknown>>}
   */
  private readonly keyManager: ActiveDescendantKeyManager<SelectOptionComponent<unknown>> =
    new ActiveDescendantKeyManager(this.options, this.injector)
      .withWrap()
      .withVerticalOrientation()
      .withHomeAndEnd()
      .withPageUpDown()
      .withTypeAhead()
      .skipPredicate((option: Highlightable & SelectOptionComponent<unknown>): boolean =>
        option.isDisabled(),
      );

  /**
   * Property selectedOption
   * @readonly
   *
   * @description
   * Projected option matching the current value, or null when no option is selected.
   *
   * @type {Signal<SelectOptionComponent<unknown> | null>}
   */
  protected readonly selectedOption: Signal<SelectOptionComponent<unknown> | null> =
    computed<SelectOptionComponent<unknown> | null>(
      (): SelectOptionComponent<unknown> | null =>
        this.options().find((option: SelectOptionComponent<unknown>): boolean =>
          this.isSelected(option.value()),
        ) ?? null,
    );

  /**
   * Property selectedLabel
   * @readonly
   *
   * @description
   * Text of the selected option for display in the trigger, or null without a matching option.
   *
   * @type {Signal<string | null>}
   */
  protected readonly selectedLabel: Signal<string | null> = computed<string | null>(
    (): string | null => this.selectedOption()?.text() ?? null,
  );

  /**
   * Property activeId
   * @readonly
   *
   * @description
   * Active option id exposed to the trigger only while the listbox is open.
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeId: Signal<string | null> = computed<string | null>((): string | null =>
    this.open()
      ? (this.options().find((option: SelectOptionComponent<unknown>): boolean => option.isActive())
          ?.id ?? null)
      : null,
  );

  /**
   * Property triggerClasses
   * @readonly
   *
   * @description
   * Input-like trigger styling combined with focus, expanded and caller-specific classes.
   *
   * @type {Signal<string>}
   */
  protected readonly triggerClasses: Signal<string> = computed<string>((): string =>
    cn(
      inputVariants({ size: this.size() }),
      'flex cursor-pointer items-center justify-between gap-2.5 text-left',
      // A button shows its ring for keyboard focus only.
      'focus:border-line-field focus:outline-transparent focus:hover:border-line-hover focus-visible:border-signal/55 focus-visible:outline-signal/12',
      // Open: the focus ring gives way to the blue border, which would otherwise overlap the list.
      'aria-expanded:border-signal/55 aria-expanded:hover:border-signal/55 aria-expanded:focus-visible:outline-transparent',
      this.class(),
    ),
  );

  /**
   * Property panelClasses
   * @readonly
   *
   * @description
   * Scrollable menu panel styles combined with caller-specific panel classes.
   *
   * @type {Signal<string>}
   */
  protected readonly panelClasses: Signal<string> = computed<string>((): string =>
    cn(
      menuPanelVariants({ scroll: true }),
      'relative w-full min-w-0 transition-none',
      this.panelClass(),
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Tracks open and active option state to move the selection highlight after rendering.
   */
  public constructor() {
    afterRenderEffect((): void => this.moveHighlight(this.activeId(), this.open()));
  }
  // #endregion

  // #region Methods
  /**
   * Method isSelected
   * @method isSelected
   *
   * @description
   * Compares a candidate value with the non-null selected value using the configured comparator.
   *
   * @param {unknown} value - Candidate option value.
   * @returns {boolean} Whether the candidate matches the current selection.
   */
  public isSelected(value: unknown): boolean {
    const current: T | null = this.value();
    return current !== null && current !== undefined && this.compareWith()(value, current);
  }

  /**
   * Method indexOf
   * @method indexOf
   *
   * @description
   * Returns the projected option index required by the host-neutral option contract.
   *
   * @param {SelectOptionRef} option - Option whose position is requested.
   * @returns {number} Zero-based option index, or `-1` when absent.
   */
  public indexOf(option: SelectOptionRef): number {
    return this.options().indexOf(option as SelectOptionComponent);
  }

  /**
   * Method choose
   * @method choose
   *
   * @description
   * Selects an enabled option and closes the listbox; disabled options leave the current value unchanged.
   *
   * @param {SelectOptionRef} option - Option to select.
   * @returns {void}
   */
  public choose(option: SelectOptionRef): void {
    const target: SelectOptionComponent<T> = option as SelectOptionComponent<T>;
    if (target.isDisabled()) return;
    this.value.set(target.value());
    this.close();
  }

  /**
   * Method activate
   * @method activate
   *
   * @description
   * Requests active-descendant navigation to an enabled option that is not already active.
   *
   * @param {SelectOptionRef} option - Option to activate.
   * @returns {void}
   */
  public activate(option: SelectOptionRef): void {
    const target: SelectOptionComponent<unknown> = option as SelectOptionComponent;
    if (!target.isDisabled() && !target.isActive()) this.keyManager.setActiveItem(target);
  }

  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves browser focus back to the trigger button.
   *
   * @param {FocusOptions} options - Optional browser focus configuration.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Closes an open listbox or opens a closed one using the selected option as the initial active item.
   *
   * @returns {void}
   */
  protected toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  /**
   * Method show
   * @method show
   *
   * @description
   * Opens the listbox when enabled, records trigger width and chooses the initial active option according to `start`.
   *
   * @param {'selected' | 'first' | 'last'} start - Initial active option policy.
   * @returns {void}
   */
  protected show(start: 'selected' | 'first' | 'last' = 'selected'): void {
    if (this.disabled() || this.open()) return;
    this.minWidth.set(this.trigger().nativeElement.offsetWidth);
    this.open.set(true);
    this.rendered.set(true);
    afterNextRender((): void => this.animate(true), { injector: this.injector });
    const selected: SelectOptionComponent<unknown> | null = this.selectedOption();
    if (start === 'last') this.keyManager.setLastItemActive();
    else if (start === 'selected' && selected && !selected.isDisabled())
      this.keyManager.setActiveItem(selected);
    else this.keyManager.setFirstItemActive();
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Clears open and active-option state and starts the closing transition when currently open.
   *
   * @returns {void}
   */
  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.keyManager.setActiveItem(-1);
    this.animate(false);
  }

  /**
   * Method onPositionChange
   * @method onPositionChange
   *
   * @description
   * Invalidates cached menu motion measurements after the overlay changes panel position.
   *
   * @returns {void}
   */
  protected onPositionChange(): void {
    this.motion.invalidate();
  }

  /**
   * Method onDetach
   * @method onDetach
   *
   * @description
   * Stops panel motion and clears open/rendered state when the CDK overlay detaches.
   *
   * @returns {void}
   */
  protected onDetach(): void {
    this.motion.stop({
      trigger: this.trigger().nativeElement,
      chevron: (this.chevron()?.nativeElement as HTMLElement | undefined) ?? null,
    });
    this.open.set(false);
    this.rendered.set(false);
  }

  /**
   * Method reducedMotion
   * @method reducedMotion
   *
   * @description
   * Reads the owner window's reduced-motion preference, treating a missing window or API as motion allowed.
   *
   * @returns {boolean} Whether the user requested reduced motion.
   */
  private reducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    );
  }

  /**
   * Method animate
   * @method animate
   *
   * @description
   * Runs opening or closing motion for the trigger, list and chevron when the panel exists, and removes the rendered
   * list after close completion.
   *
   * @param {boolean} open - Whether to run opening motion.
   * @returns {void}
   */
  private animate(open: boolean): void {
    const panel: HTMLElement | undefined = this.panel()?.nativeElement;
    if (!panel) {
      if (!open) this.rendered.set(false);
      return;
    }
    const parts: { trigger: HTMLButtonElement; list: HTMLElement; chevron: HTMLElement | null } = {
      trigger: this.trigger().nativeElement,
      list: panel,
      chevron: (this.chevron()?.nativeElement as HTMLElement | undefined) ?? null,
    };
    this.motion.run(parts, open, {
      reduced: this.reducedMotion(),
      done: (): void => {
        if (!this.open()) this.rendered.set(false);
      },
    });
  }

  /**
   * Method moveHighlight
   * @method moveHighlight
   *
   * @description
   * Positions the selection pill under the active option while open, disabling transition for its initial or reduced
   * motion placement.
   *
   * @param {string | null} activeId - Id of the currently active option.
   * @param {boolean} open - Whether the listbox is open.
   * @returns {void}
   */
  private moveHighlight(activeId: string | null, open: boolean): void {
    const pill: HTMLElement | undefined = this.highlight()?.nativeElement;
    if (!pill) return;
    const active: HTMLElement | null = activeId ? this.document.getElementById(activeId) : null;
    if (!active || !open) {
      pill.removeAttribute('data-on');
      return;
    }
    const jump: boolean = !pill.hasAttribute('data-on') || this.reducedMotion();
    if (jump) pill.style.transition = 'none';
    pill.style.translate = `0 ${active.offsetTop}px`;
    pill.style.height = `${active.offsetHeight}px`;
    if (jump) {
      void pill.offsetHeight;
      pill.style.transition = '';
    }
    pill.setAttribute('data-on', '');
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Handles opening, closing, selection and typeahead keys while the trigger retains focus; delegates option movement
   * to the CDK key manager.
   *
   * @param {KeyboardEvent} event - Keyboard event from the trigger.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    const active: (Highlightable & SelectOptionComponent<unknown>) | null =
      this.keyManager.activeItem;
    if (!this.open()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        this.show();
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        this.show(event.key === 'Home' ? 'first' : 'last');
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        this.show();
        this.keyManager.onKeydown(event);
      }
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        return;
      case 'Tab':
        this.close();
        return;
      case ' ':
        // A space inside a typeahead sequence searches; otherwise it chooses.
        if (this.keyManager.isTyping()) break;
        event.preventDefault();
        if (active) this.choose(active);
        return;
      case 'Enter':
        event.preventDefault();
        if (active) this.choose(active);
        else this.close();
        return;
      case 'ArrowUp':
        if (event.altKey) {
          event.preventDefault();
          if (active) this.choose(active);
          return;
        }
        break;
      default:
        break;
    }
    this.keyManager.onKeydown(event);
  }

  /**
   * Method onBlur
   * @method onBlur
   *
   * @description
   * Emits the Signal Forms touch event and closes the listbox when its trigger loses focus.
   *
   * @returns {void}
   */
  protected onBlur(): void {
    this.touch.emit();
    this.close();
  }

  /**
   * Method onOutsideClick
   * @method onOutsideClick
   *
   * @description
   * Closes the listbox when an outside click does not target the trigger button.
   *
   * @param {MouseEvent} event - Click event reported by the overlay.
   * @returns {void}
   */
  protected onOutsideClick(event: MouseEvent): void {
    const target: EventTarget | null = event.target;
    if (target instanceof Node && this.trigger().nativeElement.contains(target)) return;
    this.close();
  }
  // #endregion
}
