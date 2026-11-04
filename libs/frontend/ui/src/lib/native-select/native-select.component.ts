import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Component NativeSelectComponent
 * @class NativeSelectComponent
 *
 * @description
 * Wraps a projected native select beside a decorative Orbite chevron; `uiInput` on the select reserves space for the icon.
 */
@Component({
  selector: 'ui-native-select',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="select" />
    <ng-icon
      class="pointer-events-none absolute end-4.5 top-1/2 -translate-y-1/2 text-fg-muted"
      [svg]="icons.chevron"
      size="16"
      aria-hidden="true"
    />
  `,
  host: { '[class]': 'classes()', 'data-slot': 'native-select' },
})
export class NativeSelectComponent {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the wrapper layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide chevron displayed beside the projected native select.
   *
   * @type {{ readonly chevron: typeof lucideChevronDown }}
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronDown } = {
    chevron: lucideChevronDown,
  } as const;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Wrapper layout and option palette classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'relative block w-full has-[select:disabled]:[&>ng-icon]:opacity-50',
      '[&_option]:bg-surface-raised [&_option]:text-fg',
      this.class(),
    ),
  );
  // #endregion
}
