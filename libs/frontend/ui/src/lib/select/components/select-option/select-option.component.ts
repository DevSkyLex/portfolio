import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import type { Highlightable } from '@angular/cdk/a11y';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { menuOptionVariants } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import { SELECT_HOST } from '@internal/ui/lib/select/tokens/select/select.token';
import type { SelectOptionRef } from '@internal/ui/lib/select/models/select/select-option-ref.interface';
import type { SelectHost } from '@internal/ui/lib/select/models/select/select-host.interface';
import { OPTION_MOTION } from '@internal/ui/lib/select/components/select-option/constants/select-option.constants';

/**
 * Component SelectOptionComponent
 * @class SelectOptionComponent
 * @template T
 *
 * @description
 * Implements one listbox option, exposing its value and text to the select host and CDK key manager. Projected text
 * supplies the trigger label unless an explicit label input is provided.
 */
@Component({
  selector: 'ui-select-option',
  imports: [NgIcon],
  template: `
    <span class="min-w-0 flex-1 truncate"><ng-content /></span>
    <ng-icon
      class="invisible group-aria-selected:visible"
      [svg]="icons.check"
      size="16"
      aria-hidden="true"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'option',
    '[id]': 'id',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-active]': 'active() ? "" : null',
    '[class]': 'classes()',
    '[style.--i]': 'index()',
    'data-slot': 'select-option',
    '(click)': 'select.choose(this)',
    '(pointermove)': 'select.activate(this)',
  },
})
export class SelectOptionComponent<T = unknown> implements Highlightable, SelectOptionRef {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Required option value compared by the select host when selecting and checking this option.
   *
   * @type {InputSignal<T>}
   */
  public readonly value: InputSignal<T> = input.required<T>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional text for the trigger and typeahead; when omitted, trimmed projected text is used.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property isDisabled
   * @readonly
   *
   * @description
   * Disables selection and exposes the legacy `disabled` input alias required by the CDK highlight contract.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly isDisabled: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    // `disabled` stays the Highlightable getter read by the CDK key manager.
    // eslint-disable-next-line @angular-eslint/no-input-rename
    alias: 'disabled',
    transform: (value: boolean | ''): value is true | '' => value === '' || value,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the size-specific option styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique document id used by the option role and listbox active descendant references.
   *
   * @type {string}
   */
  public readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-select-option-');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Check icon reference rendered when the host marks this option selected.
   *
   * @type {{ readonly check: typeof lucideCheck }}
   */
  protected readonly icons: { readonly check: typeof lucideCheck } = {
    check: lucideCheck,
  } as const;

  /**
   * Property select
   * @readonly
   *
   * @description
   * Owning select contract used for option activation, selection state, sizing and ordering.
   *
   * @type {SelectHost}
   */
  protected readonly select: SelectHost = inject<SelectHost>(SELECT_HOST);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native option host used to derive fallback text and scroll the active option into view.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property active
   * @readonly
   *
   * @description
   * CDK-managed highlight state reflected as the option's active data attribute.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly active: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Whether the select host currently holds this option's value.
   *
   * @type {Signal<boolean>}
   */
  protected readonly selected: Signal<boolean> = computed<boolean>((): boolean =>
    this.select.isSelected(this.value()),
  );

  /**
   * Property index
   * @readonly
   *
   * @description
   * Current position among the host's options, used to stagger entry animation.
   *
   * @type {Signal<number>}
   */
  protected readonly index: Signal<number> = computed<number>((): number =>
    this.select.indexOf(this),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges option size, staggered transitions, large-size typography and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      menuOptionVariants({ size: this.select.size(), cascade: false }),
      OPTION_MOTION,
      this.select.size() === 'lg' && 'text-[17px]/6',
      this.class(),
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Scrolls the option into the nearest visible position whenever the CDK key manager activates it.
   */
  public constructor() {
    afterRenderEffect((): void => {
      if (this.active()) this.element.scrollIntoView?.({ block: 'nearest' });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method text
   * @method text
   *
   * @description
   * Returns the explicit label when supplied, otherwise trimmed text from the option's rendered content.
   *
   * @returns {string} Text used by the trigger and typeahead matching.
   */
  public text(): string {
    return this.label() ?? this.element.textContent?.trim() ?? '';
  }

  /**
   * Method getLabel
   * @method getLabel
   *
   * @description
   * Exposes the option text through the CDK highlightable label contract.
   *
   * @returns {string} Explicit or projected option text.
   */
  public getLabel(): string {
    return this.text();
  }

  /**
   * Method setActiveStyles
   * @method setActiveStyles
   *
   * @description
   * Marks this option active for the CDK key manager and host styling.
   *
   * @returns {void}
   */
  public setActiveStyles(): void {
    this.active.set(true);
  }

  /**
   * Method setInactiveStyles
   * @method setInactiveStyles
   *
   * @description
   * Clears this option's CDK highlight state.
   *
   * @returns {void}
   */
  public setInactiveStyles(): void {
    this.active.set(false);
  }

  /**
   * Method isActive
   * @method isActive
   *
   * @description
   * Reports whether the CDK key manager currently highlights this option.
   *
   * @returns {boolean} Current active state.
   */
  public isActive(): boolean {
    return this.active();
  }
  // #endregion
}
