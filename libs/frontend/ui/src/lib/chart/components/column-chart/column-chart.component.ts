import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  CHART_TONE_FILLS,
  CHART_TOOLTIP_CLASSES,
  CHART_EMPTY_CLASSES,
} from '@internal/ui/lib/chart/constants/chart-tone.constants';
import type { ChartPoint } from '@internal/ui/lib/chart/models/chart/chart-point.interface';
import type { ChartTone } from '@internal/ui/lib/chart/models/chart/chart-tone.type';
import { chartTicks } from '@internal/ui/lib/chart/utils/chart-ticks/chart-ticks.utils';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

/** Row of the y axis: its value, label and height in percent of the plot. */
interface TickRow {
  readonly value: number;
  readonly label: string;
  readonly bottom: number;
}

/** One column: its point, height in percent and classes. */
interface Column {
  readonly index: number;
  readonly point: ChartPoint;
  readonly height: number;
  readonly classes: string;
}

/** x labels kept: the first, middle and last columns. */
interface AxisLabel {
  readonly index: number;
  readonly label: string;
  readonly left: number;
  readonly classes: string;
}

/**
 * Component ColumnChartComponent
 * @class ColumnChartComponent
 *
 * @description
 * One measure per period as vertical columns, for counts that add up per day (the read is each day's
 * amount, not a continuous trend): columns from a zero baseline with a 2 px surface gap (1 px past 45
 * columns), 4 px rounded tops, a hairline grid on `chartTicks`, the hovered or focused column kept
 * full and the others dimmed, a value-first tooltip, arrows / Home / End on the focused plot with a
 * polite readout, and a visually hidden table view.
 */
@Component({
  selector: 'ui-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'column-chart',
  },
  template: `
    @if (empty()) {
      <p [class]="emptyClasses">{{ emptyLabel() }}</p>
    } @else {
      <!-- The y labels sit in the 40 px left gutter, outside the plot box that the pointer maps to x. -->
      <div
        class="relative ms-10 h-36 rounded-xs outline-2 outline-offset-4 outline-transparent focus-visible:outline-accent/55"
        tabindex="0"
        role="group"
        [attr.aria-label]="label()"
        [attr.aria-describedby]="hintId"
        (pointermove)="pointerMoved($event)"
        (pointerleave)="pointerLeft()"
        (focus)="focusEntered()"
        (blur)="focusLeft()"
        (keydown)="keyPressed($event)"
      >
        @for (tick of tickRows(); track tick.value) {
          <div
            class="pointer-events-none absolute inset-x-0 border-t border-border"
            aria-hidden="true"
            [style.bottom.%]="tick.bottom"
          >
            <span
              class="absolute end-full top-0 me-2 -translate-y-1/2 text-[11px]/4 whitespace-nowrap text-fg-faint tabular-nums"
              >{{ tick.label }}</span
            >
          </div>
        }
        <div [class]="trackClasses()" aria-hidden="true">
          @for (column of columns(); track column.index) {
            <span class="flex h-full min-w-0 flex-1 items-end">
              @if (column.height > 0) {
                <span [class]="column.classes" [style.height.%]="column.height"></span>
              }
            </span>
          }
        </div>
        @if (mark(); as current) {
          <div
            [class]="tooltipClasses"
            aria-hidden="true"
            [style.left.%]="current.left"
            [style.bottom.%]="current.bottom"
          >
            <span class="font-medium tabular-nums">{{ current.point.display }}</span>
            <span class="text-fg-muted">{{ current.point.label }}</span>
          </div>
        }
      </div>

      <div class="relative ms-10 mt-2 h-4" aria-hidden="true">
        @for (axis of axisLabels(); track axis.index) {
          <span [class]="axis.classes" [style.left.%]="axis.left">{{ axis.label }}</span>
        }
      </div>

      <span class="sr-only" [id]="hintId">{{ keyboardHint() }}</span>
      <span class="sr-only" aria-live="polite">{{ announcement() }}</span>

      <!-- A table grows past the 1 px of sr-only: the wrapper is the hidden box. -->
      <div class="sr-only">
        <table>
          <caption>
            {{
              label()
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ xHeader() }}</th>
              <th scope="col">{{ valueHeader() }}</th>
            </tr>
          </thead>
          <tbody>
            @for (point of points(); track $index) {
              <tr>
                <th scope="row">{{ point.label }}</th>
                <td>{{ point.display }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class ColumnChartComponent {
  // #region Properties
  /** Values in x order. */
  public readonly points: InputSignal<readonly ChartPoint[]> =
    input.required<readonly ChartPoint[]>();

  /** Name of the plot and caption of its table view. */
  public readonly label: InputSignal<string> = input.required<string>();

  /** Header of the table view's first column. */
  public readonly xHeader: InputSignal<string> = input<string>($localize`:@@ui.chart.xHeader:Date`);

  /** Header of the table view's value column. */
  public readonly valueHeader: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.valueHeader:Valeur`,
  );

  /** Description of the keyboard model, read with the focused plot. */
  public readonly keyboardHint: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.keyboardHint:Flèches gauche et droite pour parcourir les valeurs.`,
  );

  /** Formatter of the y labels; compact numbers of the build's locale by default. */
  public readonly formatTick: InputSignal<((value: number) => string) | undefined> = input<
    ((value: number) => string) | undefined
  >();

  /** Colour of the columns. */
  public readonly tone: InputSignal<ChartTone> = input<ChartTone>('chart-1');

  /** Dims the chart while newer values load, without moving it. */
  public readonly stale: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /** Note shown in place of the chart when it has nothing to draw. */
  public readonly emptyLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.empty:Aucune donnée à afficher.`,
  );

  /** Whether there is nothing to draw: the empty note keeps the chart's room instead. */
  protected readonly empty: Signal<boolean> = computed<boolean>(
    (): boolean => this.points().length === 0,
  );

  protected readonly emptyClasses: string = cn(CHART_EMPTY_CLASSES, 'h-40');

  /** Extra host classes. */
  public readonly class: InputSignal<string> = input<string>('');

  protected readonly hintId: string =
    inject<RenderIdService>(RenderIdService).next('ui-column-chart-');

  protected readonly tooltipClasses: string = cn(CHART_TOOLTIP_CLASSES, '-translate-x-1/2');

  /** Index of the hovered or focused column. */
  protected readonly active: WritableSignal<number | null> = signal<number | null>(null);

  private readonly ticks: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] =>
      chartTicks(Math.max(0, ...this.points().map((point: ChartPoint): number => point.value))),
  );

  private readonly ceiling: Signal<number> = computed<number>(
    (): number => this.ticks()[this.ticks().length - 1] ?? 1,
  );

  protected readonly tickRows: Signal<readonly TickRow[]> = computed<readonly TickRow[]>(
    (): readonly TickRow[] => {
      const format: (value: number) => string = this.formatTick() ?? this.compact;
      return this.ticks().map((value: number): TickRow => ({
        value,
        label: format(value),
        bottom: (value / this.ceiling()) * 100,
      }));
    },
  );

  // Past 45 columns a 2 px gap would leave the columns thinner than their gaps.
  protected readonly trackClasses: Signal<string> = computed<string>((): string =>
    cn(
      'pointer-events-none absolute inset-0 flex items-end',
      this.points().length > 45 ? 'gap-px' : 'gap-0.5',
    ),
  );

  protected readonly columns: Signal<readonly Column[]> = computed<readonly Column[]>(
    (): readonly Column[] => {
      const active: number | null = this.active();
      const fill: string = CHART_TONE_FILLS[this.tone()];
      return this.points().map((point: ChartPoint, index: number): Column => ({
        index,
        point,
        height: (Math.max(0, point.value) / this.ceiling()) * 100,
        classes: cn(
          'w-full rounded-t-xs transition-opacity duration-(--dur-pop) motion-reduce:transition-none',
          fill,
          active !== null && active !== index && 'opacity-40',
        ),
      }));
    },
  );

  protected readonly axisLabels: Signal<readonly AxisLabel[]> = computed<readonly AxisLabel[]>(
    (): readonly AxisLabel[] => {
      const points: readonly ChartPoint[] = this.points();
      const last: number = points.length - 1;
      if (last < 0) return [];
      const indexes: number[] = [...new Set<number>([0, Math.round(last / 2), last])];
      return indexes.map((index: number): AxisLabel => ({
        index,
        label: points[index]?.label ?? '',
        left: this.center(index),
        classes: cn(
          'absolute top-0 text-[11px]/4 whitespace-nowrap text-fg-faint',
          last === 0
            ? '-translate-x-1/2'
            : index === 0
              ? 'translate-x-0'
              : index === last
                ? '-translate-x-full'
                : '-translate-x-1/2',
        ),
      }));
    },
  );

  /** Tooltip of the active column, centred above its top and kept inside the plot at the edges. */
  protected readonly mark: Signal<{
    readonly point: ChartPoint;
    readonly left: number;
    readonly bottom: number;
  } | null> = computed((): { point: ChartPoint; left: number; bottom: number } | null => {
    const index: number | null = this.active();
    const column: Column | undefined = index === null ? undefined : this.columns()[index];
    if (!column) return null;
    return {
      point: column.point,
      left: Math.min(88, Math.max(12, this.center(column.index))),
      bottom: column.height,
    };
  });

  protected readonly announcement: Signal<string> = computed<string>((): string => {
    const mark: { point: ChartPoint } | null = this.mark();
    return mark ? `${mark.point.label}, ${mark.point.display}` : '';
  });

  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'block min-w-0 transition-opacity duration-(--dur-pop) data-stale:opacity-50 motion-reduce:transition-none',
      this.class(),
    ),
  );

  private readonly compactFormat: Intl.NumberFormat = new Intl.NumberFormat(
    inject<string>(LOCALE_ID),
    { notation: 'compact', maximumFractionDigits: 1 },
  );

  private readonly focused: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion

  // #region Methods
  /**
   * Method pointerMoved
   * @method pointerMoved
   *
   * @description
   * Activates the column under the pointer: the plot splits into equal slots, one per column.
   *
   * @param {PointerEvent} event - Move over the plot.
   * @returns {void}
   */
  protected pointerMoved(event: PointerEvent): void {
    const count: number = this.points().length;
    const target: EventTarget | null = event.currentTarget;
    if (count === 0 || !(target instanceof HTMLElement)) return;
    const box: DOMRect = target.getBoundingClientRect();
    if (box.width <= 0) return;
    const ratio: number = Math.min(0.9999, Math.max(0, (event.clientX - box.left) / box.width));
    this.active.set(Math.floor(ratio * count));
  }

  protected pointerLeft(): void {
    if (!this.focused()) this.active.set(null);
  }

  protected focusEntered(): void {
    this.focused.set(true);
    if (this.active() === null && this.points().length) this.active.set(this.points().length - 1);
  }

  protected focusLeft(): void {
    this.focused.set(false);
    this.active.set(null);
  }

  /**
   * Method keyPressed
   * @method keyPressed
   *
   * @description
   * Moves the active column with the arrows, Home and End; Escape clears it.
   *
   * @param {KeyboardEvent} event - Key on the focused plot.
   * @returns {void}
   */
  protected keyPressed(event: KeyboardEvent): void {
    const last: number = this.points().length - 1;
    if (last < 0) return;
    const current: number = this.active() ?? last;
    const next: number | null | undefined = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowRight: Math.min(last, current + 1),
      Home: 0,
      End: last,
      Escape: null,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.active.set(next);
  }

  /** Centre of a column's slot, in percent of the plot width. */
  private center(index: number): number {
    const count: number = this.points().length;
    return count === 0 ? 50 : ((index + 0.5) / count) * 100;
  }

  private readonly compact: (value: number) => string = (value: number): string =>
    this.compactFormat.format(value);
  // #endregion
}
