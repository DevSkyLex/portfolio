import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  booleanAttribute,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { CHART_TONE_FILLS } from '@internal/ui/lib/chart/constants/chart-tone.constants';
import type { ChartTone } from '@internal/ui/lib/chart/models/chart/chart-tone.type';
import type {
  DumbbellRow,
  DumbbellValue,
} from '@internal/ui/lib/chart/models/chart/dumbbell-row.interface';
import { chartTicks } from '@internal/ui/lib/chart/utils/chart-ticks/chart-ticks.utils';

/** A row as drawn: both ends and the rule between them, in percent of the track. */
interface Line {
  readonly row: DumbbellRow;
  readonly start: number | null;
  readonly end: number | null;
  readonly from: number;
  readonly to: number;
}

/** A tick of the shared axis. */
interface Tick {
  readonly value: number;
  readonly label: string;
  readonly left: number;
}

/**
 * Component DumbbellChartComponent
 * @class DumbbellChartComponent
 *
 * @description
 * Items compared on two measures of one scale (a page's mobile and desktop score): a ringed dot per
 * measure in the first two series tones, a hairline rule between them, a shared axis with a hairline
 * grid, both values printed at the end of each row (so no value hides behind a hover) and a legend
 * naming the two series. A `max` fixes the scale (100 for a score); otherwise it follows `chartTicks`.
 */
@Component({
  selector: 'ui-dumbbell-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'dumbbell-chart',
  },
  template: `
    <ul
      class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]/4 text-fg-muted"
      data-slot="chart-legend"
    >
      <li class="flex items-center gap-1.5">
        <span [class]="startDot()" aria-hidden="true"></span>
        {{ startLabel() }}
      </li>
      <li class="flex items-center gap-1.5">
        <span [class]="endDot()" aria-hidden="true"></span>
        {{ endLabel() }}
      </li>
    </ul>
    <ul class="flex flex-col" [attr.aria-label]="label()">
      @for (line of lines(); track line.row.key) {
        <li
          class="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-x-4 py-1.5 text-[13px]/5"
        >
          <span class="min-w-0 truncate text-fg" [title]="line.row.label">{{
            line.row.label
          }}</span>
          <span class="relative h-4" aria-hidden="true">
            @for (tick of ticks(); track tick.value) {
              <span
                class="absolute inset-y-0 border-s border-border"
                [style.left.%]="tick.left"
              ></span>
            }
            @if (line.start !== null && line.end !== null) {
              <span
                class="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border-strong"
                [style.left.%]="line.from"
                [style.width.%]="line.to - line.from"
              ></span>
            }
            @if (line.start !== null) {
              <span [class]="startMark()" [style.left.%]="line.start"></span>
            }
            @if (line.end !== null) {
              <span [class]="endMark()" [style.left.%]="line.end"></span>
            }
          </span>
          <span class="flex justify-end gap-2 text-[12px]/4 text-fg-muted tabular-nums">
            <span class="sr-only">{{ startLabel() }}</span>
            <span>{{ line.row.start?.display ?? '—' }}</span>
            <span class="text-fg-faint" aria-hidden="true">·</span>
            <span class="sr-only">{{ endLabel() }}</span>
            <span>{{ line.row.end?.display ?? '—' }}</span>
          </span>
        </li>
      }
    </ul>
    <div class="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] gap-x-4" aria-hidden="true">
      <span></span>
      <span class="relative mt-1 h-4">
        @for (tick of ticks(); track tick.value) {
          <span
            class="absolute top-0 -translate-x-1/2 text-[11px]/4 whitespace-nowrap text-fg-faint tabular-nums"
            [style.left.%]="tick.left"
            >{{ tick.label }}</span
          >
        }
      </span>
      <span class="invisible text-[12px]/4 tabular-nums">00 · 00</span>
    </div>
  `,
})
export class DumbbellChartComponent {
  // #region Properties
  /** Items in display order. */
  public readonly rows: InputSignal<readonly DumbbellRow[]> =
    input.required<readonly DumbbellRow[]>();

  /** Name of the list. */
  public readonly label: InputSignal<string> = input.required<string>();

  /** Name of the first measure. */
  public readonly startLabel: InputSignal<string> = input.required<string>();

  /** Name of the second measure. */
  public readonly endLabel: InputSignal<string> = input.required<string>();

  /** Tone of the first measure. */
  public readonly startTone: InputSignal<ChartTone> = input<ChartTone>('chart-1');

  /** Tone of the second measure. */
  public readonly endTone: InputSignal<ChartTone> = input<ChartTone>('chart-2');

  /** Fixed top of the scale; `null` follows the largest value. */
  public readonly max: InputSignal<number | null> = input<number | null>(null);

  /** Formatter of the axis labels. */
  public readonly formatTick: InputSignal<((value: number) => string) | undefined> = input<
    ((value: number) => string) | undefined
  >();

  /** Dims the chart while newer values load, without moving it. */
  public readonly stale: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /** Extra host classes. */
  public readonly class: InputSignal<string> = input<string>('');

  private readonly compactFormat: Intl.NumberFormat = new Intl.NumberFormat(
    inject<string>(LOCALE_ID),
    { notation: 'compact', maximumFractionDigits: 1 },
  );

  private readonly scale: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] => {
      const max: number | null = this.max();
      if (max !== null && max > 0) return chartTicks(max, 4);
      return chartTicks(
        Math.max(
          0,
          ...this.rows().flatMap((row: DumbbellRow): number[] =>
            [row.start, row.end]
              .filter((value: DumbbellValue | null): value is DumbbellValue => value !== null)
              .map((value: DumbbellValue): number => value.value),
          ),
        ),
        4,
      );
    },
  );

  private readonly ceiling: Signal<number> = computed<number>(
    (): number => this.scale()[this.scale().length - 1] ?? 1,
  );

  protected readonly ticks: Signal<readonly Tick[]> = computed<readonly Tick[]>(
    (): readonly Tick[] => {
      const format: (value: number) => string =
        this.formatTick() ?? ((value: number): string => this.compactFormat.format(value));
      return this.scale().map((value: number): Tick => ({
        value,
        label: format(value),
        left: this.left(value),
      }));
    },
  );

  protected readonly lines: Signal<readonly Line[]> = computed<readonly Line[]>(
    (): readonly Line[] =>
      this.rows().map((row: DumbbellRow): Line => {
        const start: number | null = row.start ? this.left(row.start.value) : null;
        const end: number | null = row.end ? this.left(row.end.value) : null;
        return {
          row,
          start,
          end,
          from: Math.min(start ?? 0, end ?? 0),
          to: Math.max(start ?? 0, end ?? 0),
        };
      }),
  );

  protected readonly startDot: Signal<string> = computed<string>((): string =>
    cn('size-2 shrink-0 rounded-full', CHART_TONE_FILLS[this.startTone()]),
  );

  protected readonly endDot: Signal<string> = computed<string>((): string =>
    cn('size-2 shrink-0 rounded-full', CHART_TONE_FILLS[this.endTone()]),
  );

  protected readonly startMark: Signal<string> = computed<string>((): string =>
    cn(
      'absolute top-1/2 size-2.5 -translate-1/2 rounded-full ring-2 ring-surface',
      CHART_TONE_FILLS[this.startTone()],
    ),
  );

  protected readonly endMark: Signal<string> = computed<string>((): string =>
    cn(
      'absolute top-1/2 size-2.5 -translate-1/2 rounded-full ring-2 ring-surface',
      CHART_TONE_FILLS[this.endTone()],
    ),
  );

  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'block min-w-0 transition-opacity duration-(--dur-pop) data-stale:opacity-50 motion-reduce:transition-none',
      this.class(),
    ),
  );
  // #endregion

  // #region Methods
  private left(value: number): number {
    return Math.min(100, (Math.max(0, value) / this.ceiling()) * 100);
  }
  // #endregion
}
