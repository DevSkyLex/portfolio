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
import type { ChartTone } from '@internal/ui/lib/chart/models/chart/chart-tone.type';
import type { ScatterPoint } from '@internal/ui/lib/chart/models/chart/scatter-point.interface';
import { chartTicks } from '@internal/ui/lib/chart/utils/chart-ticks/chart-ticks.utils';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

/** A tick of either axis: value, label and offset in percent. */
interface Tick {
  readonly value: number;
  readonly label: string;
  readonly offset: number;
}

/** A placed point. */
interface Dot {
  readonly index: number;
  readonly point: ScatterPoint;
  readonly left: number;
  readonly bottom: number;
  readonly classes: string;
}

/**
 * Component ScatterChartComponent
 * @class ScatterChartComponent
 *
 * @description
 * Items placed by two measures, both from zero, to read how one varies with the other (CTR against
 * position). 8 px dots in one tone with a 2 px surface ring so overlaps stay countable, hairline grids
 * on `chartTicks` for both axes, the point nearest to the pointer activated (no pinpoint target), the
 * arrows walking the points in x order on the focused plot, and a table view.
 */
@Component({
  selector: 'ui-scatter-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'scatter-chart',
  },
  template: `
    @if (empty()) {
      <p [class]="emptyClasses">{{ emptyLabel() }}</p>
    } @else {
      <p class="ms-10 mb-1 text-[11px]/4 text-fg-faint" aria-hidden="true">{{ yHeader() }}</p>
      <div class="ms-10">
        <div
          class="relative h-48 rounded-xs outline-2 outline-offset-4 outline-transparent focus-visible:outline-accent/55"
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
          @for (tick of yTicks(); track tick.value) {
            <div
              class="pointer-events-none absolute inset-x-0 border-t border-border"
              aria-hidden="true"
              [style.bottom.%]="tick.offset"
            >
              <span
                class="absolute end-full top-0 me-2 -translate-y-1/2 text-[11px]/4 whitespace-nowrap text-fg-faint tabular-nums"
                >{{ tick.label }}</span
              >
            </div>
          }
          @for (tick of xTicks(); track tick.value) {
            <div
              class="pointer-events-none absolute inset-y-0 border-s border-border"
              aria-hidden="true"
              [style.left.%]="tick.offset"
            ></div>
          }
          @for (dot of dots(); track dot.point.key) {
            <span
              [class]="dot.classes"
              aria-hidden="true"
              [style.left.%]="dot.left"
              [style.bottom.%]="dot.bottom"
            ></span>
          }
          @if (mark(); as current) {
            <div
              [class]="current.tooltipClasses"
              aria-hidden="true"
              [style.left.%]="current.left"
              [style.bottom.%]="current.bottom"
            >
              <span class="max-w-60 truncate font-medium">{{ current.point.label }}</span>
              <span class="text-fg-muted tabular-nums"
                >{{ xHeader() }} {{ current.point.xDisplay }} · {{ yHeader() }}
                {{ current.point.yDisplay }}</span
              >
            </div>
          }
        </div>
        <div class="relative mt-2 h-4" aria-hidden="true">
          @for (tick of xTicks(); track tick.value) {
            <span
              class="absolute top-0 -translate-x-1/2 text-[11px]/4 whitespace-nowrap text-fg-faint tabular-nums"
              [style.left.%]="tick.offset"
              >{{ tick.label }}</span
            >
          }
        </div>
        <p class="mt-1 text-end text-[11px]/4 text-fg-faint" aria-hidden="true">{{ xHeader() }}</p>
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
              <th scope="col">{{ nameHeader() }}</th>
              <th scope="col">{{ xHeader() }}</th>
              <th scope="col">{{ yHeader() }}</th>
            </tr>
          </thead>
          <tbody>
            @for (point of points(); track point.key) {
              <tr>
                <th scope="row">{{ point.label }}</th>
                <td>{{ point.xDisplay }}</td>
                <td>{{ point.yDisplay }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class ScatterChartComponent {
  // #region Properties
  /** Items to place. */
  public readonly points: InputSignal<readonly ScatterPoint[]> =
    input.required<readonly ScatterPoint[]>();

  /** Name of the plot and caption of its table view. */
  public readonly label: InputSignal<string> = input.required<string>();

  /** Name of the items, header of the table view's first column. */
  public readonly nameHeader: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.nameHeader:Élément`,
  );

  /** Name of the horizontal measure. */
  public readonly xHeader: InputSignal<string> = input.required<string>();

  /** Name of the vertical measure. */
  public readonly yHeader: InputSignal<string> = input.required<string>();

  /** Description of the keyboard model, read with the focused plot. */
  public readonly keyboardHint: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.scatterKeyboardHint:Flèches gauche et droite pour parcourir les points.`,
  );

  /** Formatter of the x labels. */
  public readonly formatX: InputSignal<((value: number) => string) | undefined> = input<
    ((value: number) => string) | undefined
  >();

  /** Formatter of the y labels. */
  public readonly formatY: InputSignal<((value: number) => string) | undefined> = input<
    ((value: number) => string) | undefined
  >();

  /** Colour of the dots. */
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

  protected readonly emptyClasses: string = cn(CHART_EMPTY_CLASSES, 'h-56');

  /** Extra host classes. */
  public readonly class: InputSignal<string> = input<string>('');

  protected readonly hintId: string =
    inject<RenderIdService>(RenderIdService).next('ui-scatter-chart-');

  /** Index, in x order, of the active point. */
  protected readonly active: WritableSignal<number | null> = signal<number | null>(null);

  private readonly ordered: Signal<readonly ScatterPoint[]> = computed<readonly ScatterPoint[]>(
    (): readonly ScatterPoint[] =>
      [...this.points()].sort((a: ScatterPoint, b: ScatterPoint): number => a.x - b.x || a.y - b.y),
  );

  private readonly xScale: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] =>
      chartTicks(Math.max(0, ...this.points().map((point: ScatterPoint): number => point.x)), 4),
  );

  private readonly yScale: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] =>
      chartTicks(Math.max(0, ...this.points().map((point: ScatterPoint): number => point.y))),
  );

  protected readonly xTicks: Signal<readonly Tick[]> = computed<readonly Tick[]>(
    (): readonly Tick[] => this.axis(this.xScale(), this.formatX()),
  );

  protected readonly yTicks: Signal<readonly Tick[]> = computed<readonly Tick[]>(
    (): readonly Tick[] => this.axis(this.yScale(), this.formatY()),
  );

  protected readonly dots: Signal<readonly Dot[]> = computed<readonly Dot[]>((): readonly Dot[] => {
    const active: number | null = this.active();
    const fill: string = CHART_TONE_FILLS[this.tone()];
    return this.ordered().map((point: ScatterPoint, index: number): Dot => ({
      index,
      point,
      left: this.offset(point.x, this.xScale()),
      bottom: this.offset(point.y, this.yScale()),
      classes: cn(
        'pointer-events-none absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-surface transition-[opacity,scale] duration-(--dur-pop) motion-reduce:transition-none',
        fill,
        active === index && 'z-1 scale-150',
        active !== null && active !== index && 'opacity-40',
      ),
    }));
  });

  /** Tooltip of the active point, kept inside the plot at the edges. */
  protected readonly mark: Signal<{
    readonly point: ScatterPoint;
    readonly left: number;
    readonly bottom: number;
    readonly tooltipClasses: string;
  } | null> = computed(
    (): { point: ScatterPoint; left: number; bottom: number; tooltipClasses: string } | null => {
      const index: number | null = this.active();
      const dot: Dot | undefined = index === null ? undefined : this.dots()[index];
      if (!dot) return null;
      return {
        point: dot.point,
        left: dot.left,
        bottom: Math.min(dot.bottom, 70),
        tooltipClasses: cn(
          CHART_TOOLTIP_CLASSES,
          dot.left < 20
            ? 'translate-x-0'
            : dot.left > 80
              ? '-translate-x-full'
              : '-translate-x-1/2',
        ),
      };
    },
  );

  protected readonly announcement: Signal<string> = computed<string>((): string => {
    const mark: { point: ScatterPoint } | null = this.mark();
    return mark
      ? `${mark.point.label}, ${this.xHeader()} ${mark.point.xDisplay}, ${this.yHeader()} ${mark.point.yDisplay}`
      : '';
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
   * Activates the point nearest to the pointer, in screen pixels, so that any spot of the plot
   * targets one point.
   *
   * @param {PointerEvent} event - Move over the plot.
   * @returns {void}
   */
  protected pointerMoved(event: PointerEvent): void {
    const target: EventTarget | null = event.currentTarget;
    const dots: readonly Dot[] = this.dots();
    if (dots.length === 0 || !(target instanceof HTMLElement)) return;
    const box: DOMRect = target.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const x: number = event.clientX - box.left;
    const y: number = box.bottom - event.clientY;
    let nearest: number = 0;
    let best: number = Number.POSITIVE_INFINITY;
    for (const dot of dots) {
      const distance: number = Math.hypot(
        (dot.left / 100) * box.width - x,
        (dot.bottom / 100) * box.height - y,
      );
      if (distance < best) {
        best = distance;
        nearest = dot.index;
      }
    }
    this.active.set(nearest);
  }

  protected pointerLeft(): void {
    if (!this.focused()) this.active.set(null);
  }

  protected focusEntered(): void {
    this.focused.set(true);
    if (this.active() === null && this.points().length) this.active.set(0);
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
   * Walks the points in x order with the arrows, Home and End; Escape clears the active point.
   *
   * @param {KeyboardEvent} event - Key on the focused plot.
   * @returns {void}
   */
  protected keyPressed(event: KeyboardEvent): void {
    const last: number = this.points().length - 1;
    if (last < 0) return;
    const current: number = this.active() ?? 0;
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

  private axis(scale: readonly number[], format: ((value: number) => string) | undefined): Tick[] {
    const formatter: (value: number) => string = format ?? this.compact;
    return scale.map((value: number): Tick => ({
      value,
      label: formatter(value),
      offset: this.offset(value, scale),
    }));
  }

  private offset(value: number, scale: readonly number[]): number {
    const ceiling: number = scale[scale.length - 1] ?? 1;
    return (Math.max(0, value) / ceiling) * 100;
  }

  private readonly compact: (value: number) => string = (value: number): string =>
    this.compactFormat.format(value);
  // #endregion
}
