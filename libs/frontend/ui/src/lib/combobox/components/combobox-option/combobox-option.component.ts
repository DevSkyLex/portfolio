import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { menuOptionVariants } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import { COMBOBOX_HOST } from '@internal/ui/lib/combobox/tokens/combobox/combobox.token';
import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';
import type { ComboboxHost } from '@internal/ui/lib/combobox/models/combobox/combobox-host.interface';

/**
 * Class ComboboxOptionComponent
 *
 * @description
 * Represents a selectable combobox row that is hidden when it does not match the typed query.
 *
 * @template T - Value type represented by the option.
 */
@Component({
  selector: 'ui-combobox-option',
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
    '[attr.hidden]': 'visible() ? null : ""',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-active]': 'combobox.isActive(this) ? "" : null',
    '[class]': 'classes()',
    'data-slot': 'combobox-option',
    '(click)': 'combobox.choose(this)',
    '(pointermove)': 'combobox.activate(this)',
  },
})
export class ComboboxOptionComponent<T = unknown> implements ComboboxItem {
  // #region Properties
  /**
   * Property value
   *
   * @description
   * Supplies the value committed when the option is chosen.
   */
  public readonly value: InputSignal<T> = input.required<T>();

  /**
   * Property label
   *
   * @description
   * Overrides the text written to the field and matched by filtering; projected content supplies the default.
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property keywords
   *
   * @description
   * Adds searchable terms that do not need to appear in the rendered option text.
   */
  public readonly keywords: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property disabled
   *
   * @description
   * Excludes the option from selection while keeping it available for display.
   */
  public readonly disabled: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | '') => value === '' || value,
  });

  /**
   * Property class
   *
   * @description
   * Adds caller-provided classes to the option row.
   */
  public readonly class: InputSignal<string> = input<string>('');
  // #endregion

  // #region Methods
  /**
   * Method isDisabled
   *
   * @description
   * Reports whether selection is disabled for this option.
   *
   * @returns {boolean} Whether the option is disabled.
   */
  public isDisabled(): boolean {
    return this.disabled();
  }
  // #endregion

  // #region Properties
  /**
   * Property id
   *
   * @description
   * Supplies the stable DOM id referenced by the active descendant attribute.
   */
  public readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-combobox-option-');

  /**
   * Property icons
   *
   * @description
   * Supplies the selected-state check icon.
   */
  protected readonly icons: { readonly check: typeof lucideCheck } = {
    check: lucideCheck,
  } as const;

  /**
   * Property combobox
   *
   * @description
   * Injects the owning control's narrow interaction contract.
   */
  protected readonly combobox: ComboboxHost = inject<ComboboxHost>(COMBOBOX_HOST);

  /**
   * Property element
   *
   * @description
   * Provides the projected content text when no explicit label is supplied.
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property visible
   *
   * @description
   * Tracks whether the option matches the current query.
   */
  protected readonly visible: Signal<boolean> = computed<boolean>(() =>
    this.combobox.isVisible(this),
  );

  /**
   * Property selected
   *
   * @description
   * Tracks whether this option value matches the selected model value.
   */
  protected readonly selected: Signal<boolean> = computed<boolean>(() =>
    this.combobox.isSelected(this.value()),
  );

  /**
   * Property classes
   *
   * @description
   * Combines option styles with caller classes; filtering disables entrance cascades so each keystroke does not replay them.
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuOptionVariants({ size: this.combobox.size(), cascade: false }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method text
   *
   * @description
   * Returns the explicit label or trimmed projected content used for display and filtering.
   *
   * @returns {string} The option text.
   */
  public text(): string {
    return this.label() ?? this.element.textContent?.trim() ?? '';
  }
  // #endregion
}
