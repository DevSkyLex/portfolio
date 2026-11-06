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
import { CHART_EMPTY_CLASSES } from '@internal/ui/lib/chart/constants/chart-tone.constants';
import type { ChartPoint } from '@internal/ui/lib/chart/models/chart/chart-point.interface';
import { chartTicks } from '@internal/ui/lib/chart/utils/chart-ticks/chart-ticks.utils';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

/**
 * Type ChartAlign
 *
 * @description
 * Horizontal anchoring of an axis label or the tooltip against its x position: the first and last
 * positions anchor inwards so that nothing leaves the plot's width.
 */
type ChartAlign = 'start' | 'middle' | 'end';

/**
 * Constant ALIGN_CLASSES
 *
 * @description
 * Literal translation classes of each anchoring (Tailwind scans literal strings only).
 *
 * @type {Readonly<Record<ChartAlign, string>>}
 */
const ALIGN_CLASSES: Readonly<Record<ChartAlign, string>> = {
  start: 'translate-x-0',
  middle: '-translate-x-1/2',
  end: '-translate-x-full',
};

/**
 * Constant VIEW_WIDTH
 *
 * @description
 * Width of the SVG view box; the plot stretches it to its box (`preserveAspectRatio="none"`) and the
 * strokes keep 2 px through `vector-effect="non-scaling-stroke"`.
 *
 * @type {number}
 */
const VIEW_WIDTH: number = 1000;

/**
 * Interface TickRow
 *
 * @description
 * One horizontal gridline with its label, `bottom` in percent of the plot height.
 */
interface TickRow {
  readonly value: number;
  readonly label: string;
  readonly bottom: number;
}

/**
 * Interface AxisLabel
 *
 * @description
 * One x-axis label, `left` in percent of the plot width.
 */
interface AxisLabel {
  readonly index: number;
  readonly label: string;
  readonly left: number;
  readonly classes: string;
}

/**
 * Interface ActiveMark
 *
 * @description
 * Position of the crosshair, the marker and the tooltip on the point under the pointer or the focus.
 */
interface ActiveMark {
  readonly point: ChartPoint;
  readonly left: number;
  readonly bottom: number;
  readonly tooltipClasses: string;
}

/**
 * Component AreaChartComponent
 * @class AreaChartComponent
 *
 * @description
 * Single-series area chart over an ordered x axis (days), drawn in SVG without a chart library: a
 * 2 px line in the aurora violet over a 10 % wash, recessive hairline gridlines on clean ticks from
 * zero, the first, middle and last x labels. A crosshair snaps to the nearest position under the
 * pointer with a tooltip giving the value first; the plot is one tab stop whose arrows, Home and End
 * move the same readout, announced politely. A visually hidden table carries every value, so the
 * tooltip never gates one. Two measures of different scales are two charts, never a second axis.
 * `stale` holds the previous render at reduced opacity while the data reloads.
 */
@Component({
  selector: 'ui-area-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'area-chart',
  },
  templateUrl: './area-chart.component.html',
})
export class AreaChartComponent {
  // #region Properties
  /**
   * Property points
   * @readonly
   *
   * @description
   * Plotted positions in x order.
   *
   * @type {InputSignal<readonly ChartPoint[]>}
   */
  public readonly points: InputSignal<readonly ChartPoint[]> =
    input.required<readonly ChartPoint[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the plot and caption of its table view (« Clics par jour »).
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property xHeader
   * @readonly
   *
   * @description
   * Heading of the table view's x column.
   *
   * @type {InputSignal<string>}
   */
  public readonly xHeader: InputSignal<string> = input<string>($localize`:@@ui.chart.xHeader:Date`);

  /**
   * Property valueHeader
   * @readonly
   *
   * @description
   * Heading of the table view's value column.
   *
   * @type {InputSignal<string>}
   */
  public readonly valueHeader: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.valueHeader:Valeur`,
  );

  /**
   * Property keyboardHint
   * @readonly
   *
   * @description
   * Description of the plot's keys, read by screen readers on focus.
   *
   * @type {InputSignal<string>}
   */
  public readonly keyboardHint: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.keyboardHint:Flèches gauche et droite pour parcourir les valeurs.`,
  );

  /**
   * Property formatTick
   * @readonly
   *
   * @description
   * Formatter of the y ticks; by default the build locale's compact notation (`1 k`, `12 k`).
   *
   * @type {InputSignal<((value: number) => string) | undefined>}
   */
  public readonly formatTick: InputSignal<((value: number) => string) | undefined> = input<
    ((value: number) => string) | undefined
  >();

  /**
   * Property stale
   * @readonly
   *
   * @description
   * Whether the data is being replaced: the render stays, dimmed, instead of a skeleton.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
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
   * Property hintId
   * @readonly
   *
   * @description
   * Id of the keyboard hint the plot is described by.
   *
   * @type {string}
   */
  protected readonly hintId: string =
    inject<RenderIdService>(RenderIdService).next('ui-area-chart-');

  /**
   * Property active
   * @readonly
   *
   * @description
   * Index of the point under the pointer or the keyboard focus, `null` when none.
   *
   * @type {WritableSignal<number | null>}
   */
  protected readonly active: WritableSignal<number | null> = signal<number | null>(null);

  /**
   * Property ticks
   * @readonly
   *
   * @description
   * Clean y ticks from zero to the plot's ceiling.
   *
   * @type {Signal<readonly number[]>}
   */
  private readonly ticks: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] =>
      chartTicks(Math.max(0, ...this.points().map((point: ChartPoint): number => point.value))),
  );

  /**
   * Property ceiling
   * @readonly
   *
   * @description
   * Value of the plot's top edge, the last tick.
   *
   * @type {Signal<number>}
   */
  private readonly ceiling: Signal<number> = computed<number>(
    (): number => this.ticks()[this.ticks().length - 1] ?? 1,
  );

  /**
   * Property tickRows
   * @readonly
   *
   * @description
   * Gridlines with their formatted labels.
   *
   * @type {Signal<readonly TickRow[]>}
   */
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

  /**
   * Property linePath
   * @readonly
   *
   * @description
   * Path of the line in view box units (y grows downwards).
   *
   * @type {Signal<string>}
   */
  protected readonly linePath: Signal<string> = computed<string>((): string =>
    this.points()
      .map(
        (point: ChartPoint, index: number): string =>
          `${index === 0 ? 'M' : 'L'}${this.x(index).toFixed(2)} ${this.y(point.value).toFixed(2)}`,
      )
      .join(' '),
  );

  /**
   * Property areaPath
   * @readonly
   *
   * @description
   * Path of the wash under the line, closed on the baseline.
   *
   * @type {Signal<string>}
   */
  protected readonly areaPath: Signal<string> = computed<string>((): string => {
    const count: number = this.points().length;
    if (count < 2) return '';
    return `${this.linePath()} L${this.x(count - 1).toFixed(2)} 100 L${this.x(0).toFixed(2)} 100 Z`;
  });

  /**
   * Property axisLabels
   * @readonly
   *
   * @description
   * First, middle and last x labels, anchored inwards at the edges.
   *
   * @type {Signal<readonly AxisLabel[]>}
   */
  protected readonly axisLabels: Signal<readonly AxisLabel[]> = computed<readonly AxisLabel[]>(
    (): readonly AxisLabel[] => {
      const points: readonly ChartPoint[] = this.points();
      const last: number = points.length - 1;
      if (last < 0) return [];
      const indexes: number[] = [...new Set<number>([0, Math.round(last / 2), last])];
      return indexes.map((index: number): AxisLabel => {
        const align: ChartAlign =
          last === 0 ? 'middle' : index === 0 ? 'start' : index === last ? 'end' : 'middle';
        return {
          index,
          label: points[index]?.label ?? '',
          left: this.left(index),
          classes: cn(
            'absolute top-0 text-[11px]/4 whitespace-nowrap text-fg-faint',
            ALIGN_CLASSES[align],
          ),
        };
      });
    },
  );

  /**
   * Property mark
   * @readonly
   *
   * @description
   * Crosshair, marker and tooltip of the active point.
   *
   * @type {Signal<ActiveMark | null>}
   */
  protected readonly mark: Signal<ActiveMark | null> = computed<ActiveMark | null>(
    (): ActiveMark | null => {
      const index: number | null = this.active();
      const point: ChartPoint | undefined = index === null ? undefined : this.points()[index];
      if (index === null || !point) return null;
      const left: number = this.left(index);
      const align: ChartAlign = left < 15 ? 'start' : left > 85 ? 'end' : 'middle';
      return {
        point,
        left,
        bottom: (point.value / this.ceiling()) * 100,
        tooltipClasses: cn(
          'pointer-events-none absolute bottom-full z-10 mb-2 flex items-center gap-2 rounded-sm border border-border bg-surface-float px-2 py-1 text-[12px]/4 whitespace-nowrap text-fg shadow-float',
          ALIGN_CLASSES[align],
        ),
      };
    },
  );

  /**
   * Property announcement
   * @readonly
   *
   * @description
   * Polite readout of the active point.
   *
   * @type {Signal<string>}
   */
  protected readonly announcement: Signal<string> = computed<string>((): string => {
    const mark: ActiveMark | null = this.mark();
    return mark ? `${mark.point.label}, ${mark.point.display}` : '';
  });

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

  /**
   * Property compactFormat
   * @readonly
   *
   * @description
   * Build locale's compact number format, the default tick formatter.
   *
   * @type {Intl.NumberFormat}
   */
  private readonly compactFormat: Intl.NumberFormat = new Intl.NumberFormat(
    inject<string>(LOCALE_ID),
    { notation: 'compact', maximumFractionDigits: 1 },
  );

  /**
   * Property focused
   * @readonly
   *
   * @description
   * Whether the plot holds the keyboard focus, which keeps the readout when the pointer leaves.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly focused: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion

  // #region Methods
  /**
   * Method pointerMoved
   * @method pointerMoved
   *
   * @description
   * Snaps the readout to the position nearest the pointer.
   *
   * @param {PointerEvent} event - Pointer move over the plot.
   */
  protected pointerMoved(event: PointerEvent): void {
    const count: number = this.points().length;
    const target: EventTarget | null = event.currentTarget;
    if (count === 0 || !(target instanceof HTMLElement)) return;
    const box: DOMRect = target.getBoundingClientRect();
    if (box.width <= 0) return;
    const ratio: number = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    this.active.set(count === 1 ? 0 : Math.round(ratio * (count - 1)));
  }

  /**
   * Method pointerLeft
   * @method pointerLeft
   *
   * @description
   * Clears the readout unless the keyboard holds it.
   */
  protected pointerLeft(): void {
    if (!this.focused()) this.active.set(null);
  }

  /**
   * Method focusEntered
   * @method focusEntered
   *
   * @description
   * Shows the latest position when the plot takes the focus.
   */
  protected focusEntered(): void {
    this.focused.set(true);
    if (this.active() === null && this.points().length) this.active.set(this.points().length - 1);
  }

  /**
   * Method focusLeft
   * @method focusLeft
   *
   * @description
   * Clears the readout when the focus leaves.
   */
  protected focusLeft(): void {
    this.focused.set(false);
    this.active.set(null);
  }

  /**
   * Method keyPressed
   * @method keyPressed
   *
   * @description
   * Moves the readout: arrows by one position, Home and End to the bounds, Escape clears it.
   *
   * @param {KeyboardEvent} event - Key pressed on the plot.
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

  /**
   * Method x
   * @method x
   *
   * @description
   * View box abscissa of a position; a single point sits in the middle.
   *
   * @param {number} index - Position.
   *
   * @returns {number} Abscissa from 0 to `VIEW_WIDTH`.
   */
  private x(index: number): number {
    const count: number = this.points().length;
    return count < 2 ? VIEW_WIDTH / 2 : (index / (count - 1)) * VIEW_WIDTH;
  }

  /**
   * Method y
   * @method y
   *
   * @description
   * View box ordinate of a value, 100 at the baseline.
   *
   * @param {number} value - Value.
   *
   * @returns {number} Ordinate from 0 to 100.
   */
  private y(value: number): number {
    return 100 - (Math.max(0, value) / this.ceiling()) * 100;
  }

  /**
   * Method left
   * @method left
   *
   * @description
   * Position in percent of the plot width, for the HTML overlays.
   *
   * @param {number} index - Position.
   *
   * @returns {number} Percent from 0 to 100.
   */
  private left(index: number): number {
    return (this.x(index) / VIEW_WIDTH) * 100;
  }

  /**
   * Property compact
   * @readonly
   *
   * @description
   * Default tick formatter.
   *
   * @type {(value: number) => string}
   */
  private readonly compact: (value: number) => string = (value: number): string =>
    this.compactFormat.format(value);
  // #endregion
}
