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
  CHART_TONE_STROKES,
  CHART_TOOLTIP_CLASSES,
} from '@internal/ui/lib/chart/constants/chart-tone.constants';
import type { ChartPoint } from '@internal/ui/lib/chart/models/chart/chart-point.interface';
import type { ChartSeries } from '@internal/ui/lib/chart/models/chart/chart-series.interface';
import { chartTicks } from '@internal/ui/lib/chart/utils/chart-ticks/chart-ticks.utils';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

/** Width of the SVG view box; its height is 100, so y is a percentage. */
const VIEW_WIDTH: number = 1000;

/** Row of the y axis. */
interface TickRow {
  readonly value: number;
  readonly label: string;
  readonly bottom: number;
}

/** Drawn series: its path and classes. */
interface Line {
  readonly series: ChartSeries;
  readonly path: string;
  readonly stroke: string;
  readonly swatch: string;
}

/** Value of one series at the active x, for the tooltip and the markers. */
interface ActiveValue {
  readonly key: string;
  readonly label: string;
  readonly display: string;
  readonly bottom: number;
  readonly swatch: string;
  readonly dot: string;
}

/** x labels kept: first, middle and last. */
interface AxisLabel {
  readonly index: number;
  readonly label: string;
  readonly left: number;
  readonly classes: string;
}

/**
 * Component LineChartComponent
 * @class LineChartComponent
 *
 * @description
 * One to three series of the same unit over a shared x axis, on one y scale (never a second axis:
 * two units are two charts). 2 px lines in their fixed tones, a legend whenever there are two series
 * or more, a crosshair with one ringed marker per series and a tooltip listing every series at the
 * active x, arrows / Home / End on the focused plot with a polite readout, and a table view.
 * `invert` draws a measure where lower is better (a search position) with zero at the top.
 */
@Component({
  selector: 'ui-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'line-chart',
  },
  template: `
    @if (series().length > 1) {
      <ul
        class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]/4 text-fg-muted"
        data-slot="chart-legend"
      >
        @for (line of lines(); track line.series.key) {
          <li class="flex items-center gap-1.5">
            <span [class]="line.swatch" aria-hidden="true"></span>
            {{ line.series.label }}
          </li>
        }
      </ul>
    }
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
      <svg
        class="pointer-events-none absolute inset-0 size-full overflow-visible"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        @for (line of lines(); track line.series.key) {
          <path
            [attr.class]="line.stroke"
            fill="none"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
            [attr.d]="line.path"
          />
        }
      </svg>
      @if (mark(); as current) {
        <div
          class="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-border-strong"
          aria-hidden="true"
          [style.left.%]="current.left"
        ></div>
        @for (value of current.values; track value.key) {
          <span
            [class]="value.dot"
            aria-hidden="true"
            [style.left.%]="current.left"
            [style.bottom.%]="value.bottom"
          ></span>
        }
        <div [class]="current.tooltipClasses" aria-hidden="true" [style.left.%]="current.left">
          <span class="text-fg-muted">{{ current.label }}</span>
          @for (value of current.values; track value.key) {
            <span class="flex items-center gap-2">
              <span [class]="value.swatch"></span>
              <span class="font-medium tabular-nums">{{ value.display }}</span>
              @if (series().length > 1) {
                <span class="text-fg-muted">{{ value.label }}</span>
              }
            </span>
          }
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
            @for (line of series(); track line.key) {
              <th scope="col">{{ line.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (x of xLabels(); track $index; let index = $index) {
            <tr>
              <th scope="row">{{ x }}</th>
              @for (line of series(); track line.key) {
                <td>{{ line.points[index]?.display ?? '' }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class LineChartComponent {
  // #region Properties
  /** Series in their fixed order; each lists the same x labels. */
  public readonly series: InputSignal<readonly ChartSeries[]> =
    input.required<readonly ChartSeries[]>();

  /** Name of the plot and caption of its table view. */
  public readonly label: InputSignal<string> = input.required<string>();

  /** Header of the table view's first column. */
  public readonly xHeader: InputSignal<string> = input<string>($localize`:@@ui.chart.xHeader:Date`);

  /** Description of the keyboard model, read with the focused plot. */
  public readonly keyboardHint: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.keyboardHint:Flèches gauche et droite pour parcourir les valeurs.`,
  );

  /** Formatter of the y labels; compact numbers of the build's locale by default. */
  public readonly formatTick: InputSignal<((value: number) => string) | undefined> = input<
    ((value: number) => string) | undefined
  >();

  /** Draws zero at the top, for a measure where lower is better. */
  public readonly invert: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /** Dims the chart while newer values load, without moving it. */
  public readonly stale: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /** Extra host classes. */
  public readonly class: InputSignal<string> = input<string>('');

  protected readonly hintId: string =
    inject<RenderIdService>(RenderIdService).next('ui-line-chart-');

  /** Index of the hovered or focused x. */
  protected readonly active: WritableSignal<number | null> = signal<number | null>(null);

  /** x labels, from the first series. */
  protected readonly xLabels: Signal<readonly string[]> = computed<readonly string[]>(
    (): readonly string[] =>
      (this.series()[0]?.points ?? []).map((point: ChartPoint): string => point.label),
  );

  private readonly count: Signal<number> = computed<number>((): number => this.xLabels().length);

  private readonly ticks: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] =>
      chartTicks(
        Math.max(
          0,
          ...this.series().flatMap((line: ChartSeries): number[] =>
            line.points.map((point: ChartPoint): number => point.value),
          ),
        ),
      ),
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
        bottom: this.bottom(value),
      }));
    },
  );

  protected readonly lines: Signal<readonly Line[]> = computed<readonly Line[]>(
    (): readonly Line[] =>
      this.series().map((line: ChartSeries): Line => ({
        series: line,
        path: line.points
          .map(
            (point: ChartPoint, index: number): string =>
              `${index === 0 ? 'M' : 'L'}${this.x(index).toFixed(2)} ${(100 - this.bottom(point.value)).toFixed(2)}`,
          )
          .join(' '),
        stroke: CHART_TONE_STROKES[line.tone],
        swatch: cn('h-0.5 w-3 shrink-0 rounded-full', CHART_TONE_FILLS[line.tone]),
      })),
  );

  protected readonly axisLabels: Signal<readonly AxisLabel[]> = computed<readonly AxisLabel[]>(
    (): readonly AxisLabel[] => {
      const labels: readonly string[] = this.xLabels();
      const last: number = labels.length - 1;
      if (last < 0) return [];
      const indexes: number[] = [...new Set<number>([0, Math.round(last / 2), last])];
      return indexes.map((index: number): AxisLabel => ({
        index,
        label: labels[index] ?? '',
        left: this.left(index),
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

  /** Crosshair position, the value of every series at it and the tooltip anchoring. */
  protected readonly mark: Signal<{
    readonly label: string;
    readonly left: number;
    readonly values: readonly ActiveValue[];
    readonly tooltipClasses: string;
  } | null> = computed(
    (): {
      label: string;
      left: number;
      values: readonly ActiveValue[];
      tooltipClasses: string;
    } | null => {
      const index: number | null = this.active();
      if (index === null || index >= this.count()) return null;
      const left: number = this.left(index);
      return {
        label: this.xLabels()[index] ?? '',
        left,
        values: this.series().flatMap((line: ChartSeries): ActiveValue[] => {
          const point: ChartPoint | undefined = line.points[index];
          return point
            ? [
                {
                  key: line.key,
                  label: line.label,
                  display: point.display,
                  bottom: this.bottom(point.value),
                  swatch: cn('h-0.5 w-3 shrink-0 rounded-full', CHART_TONE_FILLS[line.tone]),
                  dot: cn(
                    'pointer-events-none absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-surface',
                    CHART_TONE_FILLS[line.tone],
                  ),
                },
              ]
            : [];
        }),
        tooltipClasses: cn(
          CHART_TOOLTIP_CLASSES,
          left < 15 ? 'translate-x-0' : left > 85 ? '-translate-x-full' : '-translate-x-1/2',
        ),
      };
    },
  );

  protected readonly announcement: Signal<string> = computed<string>((): string => {
    const mark: { label: string; values: readonly ActiveValue[] } | null = this.mark();
    if (!mark) return '';
    const values: string = mark.values
      .map((value: ActiveValue): string =>
        this.series().length > 1 ? `${value.label} ${value.display}` : value.display,
      )
      .join(', ');
    return `${mark.label}, ${values}`;
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
   * Activates the x nearest to the pointer.
   *
   * @param {PointerEvent} event - Move over the plot.
   * @returns {void}
   */
  protected pointerMoved(event: PointerEvent): void {
    const count: number = this.count();
    const target: EventTarget | null = event.currentTarget;
    if (count === 0 || !(target instanceof HTMLElement)) return;
    const box: DOMRect = target.getBoundingClientRect();
    if (box.width <= 0) return;
    const ratio: number = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    this.active.set(count === 1 ? 0 : Math.round(ratio * (count - 1)));
  }

  protected pointerLeft(): void {
    if (!this.focused()) this.active.set(null);
  }

  protected focusEntered(): void {
    this.focused.set(true);
    if (this.active() === null && this.count()) this.active.set(this.count() - 1);
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
   * Moves the active x with the arrows, Home and End; Escape clears it.
   *
   * @param {KeyboardEvent} event - Key on the focused plot.
   * @returns {void}
   */
  protected keyPressed(event: KeyboardEvent): void {
    const last: number = this.count() - 1;
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

  /** Height of a value above the plot's bottom, in percent; inverted, zero sits at the top. */
  private bottom(value: number): number {
    const ratio: number = (Math.max(0, value) / this.ceiling()) * 100;
    return this.invert() ? 100 - ratio : ratio;
  }

  private x(index: number): number {
    const count: number = this.count();
    return count < 2 ? VIEW_WIDTH / 2 : (index / (count - 1)) * VIEW_WIDTH;
  }

  private left(index: number): number {
    return (this.x(index) / VIEW_WIDTH) * 100;
  }

  private readonly compact: (value: number) => string = (value: number): string =>
    this.compactFormat.format(value);
  // #endregion
}
