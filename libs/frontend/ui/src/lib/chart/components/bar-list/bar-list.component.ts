import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { BarListItem } from '@internal/ui/lib/chart/models/chart/bar-list-item.interface';

/**
 * Interface BarListRow
 *
 * @description
 * A row with its bar width in percent of the largest value.
 */
interface BarListRow {
  readonly item: BarListItem;
  readonly width: number;
}

/**
 * Component BarListComponent
 * @class BarListComponent
 *
 * @description
 * Ranked horizontal bars for one measure over named categories (channels, countries, devices): each
 * row prints its name and its formatted value, with a 6 px bar in the aurora violet beneath, its
 * length relative to the largest row, square at the baseline and 4 px rounded at its end. Every value
 * is printed, so no tooltip is needed; the list is named by `label` and keeps the given order (rank
 * it before). `stale` dims the previous rows while the data reloads.
 */
@Component({
  selector: 'ui-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'bar-list',
  },
  template: `
    <ul class="flex flex-col gap-3" [attr.aria-label]="label()">
      @for (row of rows(); track row.item.key) {
        <li class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-4 text-[13px]/5">
            <span class="min-w-0 truncate text-fg" [title]="row.item.label">{{
              row.item.label
            }}</span>
            <span class="shrink-0 text-fg-muted tabular-nums">{{ row.item.display }}</span>
          </div>
          <!-- The track shows the full scale; the fill keeps rounded ends at any length. -->
          <span class="flex h-1.5 overflow-hidden rounded-xs bg-surface-raised" aria-hidden="true">
            @if (row.width > 0) {
              <span
                class="h-full min-w-1.5 rounded-xs bg-chart-1"
                [style.width.%]="row.width"
              ></span>
            }
          </span>
        </li>
      }
    </ul>
  `,
})
export class BarListComponent {
  // #region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * Rows in display order.
   *
   * @type {InputSignal<readonly BarListItem[]>}
   */
  public readonly items: InputSignal<readonly BarListItem[]> =
    input.required<readonly BarListItem[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the list (« Sessions par canal »).
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property stale
   * @readonly
   *
   * @description
   * Whether the data is being replaced: the rows stay, dimmed.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly stale: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged on the host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Rows with their bar widths; every bar is zero when every value is.
   *
   * @type {Signal<readonly BarListRow[]>}
   */
  protected readonly rows: Signal<readonly BarListRow[]> = computed<readonly BarListRow[]>(
    (): readonly BarListRow[] => {
      const items: readonly BarListItem[] = this.items();
      const max: number = Math.max(0, ...items.map((item: BarListItem): number => item.value));
      return items.map((item: BarListItem): BarListRow => ({
        item,
        width: max > 0 ? (Math.max(0, item.value) / max) * 100 : 0,
      }));
    },
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host classes: a block, dimmed while stale.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'block min-w-0 transition-opacity duration-(--dur-pop) data-stale:opacity-50 motion-reduce:transition-none',
      this.class(),
    ),
  );
  // #endregion
}
