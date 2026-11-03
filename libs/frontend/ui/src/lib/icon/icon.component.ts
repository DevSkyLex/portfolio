import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { ICON_SIZES, type IconSize } from '@internal/ui/lib/icon/models/icon/icon-size.model';

/**
 * Class IconComponent
 * @class IconComponent
 *
 * @description
 * Renders an icon from an ng-icons pack in the inherited text colour. It is decorative without a
 * label and exposes image semantics when a label is provided.
 */
@Component({
  selector: 'ui-icon',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[attr.data-size]': 'sizeName()',
    'data-slot': 'icon',
  },
  template: `<ng-icon
    aria-hidden="true"
    [svg]="svg()"
    [size]="pixels() + 'px'"
    [strokeWidth]="strokeWidth()"
  />`,
})
export class IconComponent {
  // #region Properties
  /**
   * Property svg
   * @readonly
   *
   * @description
   * SVG definition exported by an ng-icons pack.
   *
   * @type {InputSignal<string>}
   */
  public readonly svg: InputSignal<string> = input.required<string>();

  /**
   * Property size
   * @readonly
   *
   * @description
   * Named size token or explicit pixel dimension for the rendered icon.
   *
   * @type {InputSignal<IconSize | number>}
   */
  public readonly size: InputSignal<number | 'sm' | 'md' | 'lg' | 'xs' | 'xl'> = input<
    IconSize | number
  >('sm');

  /**
   * Property strokeWidth
   * @readonly
   *
   * @description
   * Optional SVG stroke width passed through to the icon renderer.
   *
   * @type {InputSignal<number | string | undefined>}
   */
  public readonly strokeWidth: InputSignal<string | number | undefined> = input<number | string>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name that gives the host image semantics; an empty value leaves the icon decorative.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the inline icon alignment styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property pixels
   * @readonly
   *
   * @description
   * Pixel size resolved from the token map or passed through from an explicit numeric input.
   *
   * @type {Signal<number>}
   */
  protected readonly pixels: Signal<number> = computed<number>(() => {
    const size: number | 'sm' | 'md' | 'lg' | 'xs' | 'xl' = this.size();
    return typeof size === 'number' ? size : ICON_SIZES[size];
  });

  /**
   * Property sizeName
   * @readonly
   *
   * @description
   * Named token exposed as the data-size attribute, or null for a custom pixel size.
   *
   * @type {Signal<IconSize | null>}
   */
  protected readonly sizeName: Signal<'sm' | 'md' | 'lg' | 'xs' | 'xl' | null> = computed<
    'sm' | 'md' | 'lg' | 'xs' | 'xl' | null
  >(() => {
    const size: number | 'sm' | 'md' | 'lg' | 'xs' | 'xl' = this.size();
    return typeof size === 'number' ? null : size;
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Inline icon alignment classes combined with caller-provided host classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex shrink-0 items-center justify-center leading-none', this.class()),
  );
  // #endregion
}
