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
  CHART_EMPTY_CLASSES,
} from '@internal/ui/lib/chart/constants/chart-tone.constants';
import type { ChartLegendEntry } from '@internal/ui/lib/chart/models/chart/chart-legend-entry.interface';
import type {
  StackedBarRow,
  StackedBarSegment,
} from '@internal/ui/lib/chart/models/chart/stacked-bar-row.interface';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

/** Scale of the bars: each row to 100 % (`share`) or every row against the largest total. */
export type StackedBarsScale = 'share' | 'absolute';

/** Height of the bars: a thin 8 px rule, or a tall 32 px bar printing each part's share. */
export type StackedBarsSize = 'thin' | 'tall';

/** A part as drawn. */
interface Part {
  readonly flat: number;
  readonly entry: ChartLegendEntry;
  readonly segment: StackedBarSegment;
  readonly width: number;
  readonly share: string;
  readonly printed: boolean;
  readonly classes: string;
}

/** A whole as drawn. */
interface Bar {
  readonly row: StackedBarRow;
  readonly parts: readonly Part[];
}

/** Widest part printing its share inside a tall bar, in percent of the track. */
const PRINT_MIN: number = 14;

/**
 * Component StackedBarsComponent
 * @class StackedBarsComponent
 *
 * @description
 * Wholes split into named parts, in the legend's fixed order and tones: a 2 px surface gap between the
 * parts, 4 px rounded ends, the name and formatted total above each bar, a legend of names, and a
 * readout under the bars naming the hovered or focused part with its amount and share (arrows walk the
 * parts on the focused group). `tall` prints each share inside its part when it fits, for one whole
 * read at a glance; `absolute` compares totals across rows. The values stay in a table view.
 */
@Component({
  selector: 'ui-stacked-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'stacked-bars',
  },
  template: `
    @if (empty()) {
      <p [class]="emptyClasses">{{ emptyLabel() }}</p>
    } @else {
      @if (legend().length > 1) {
        <ul
          class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]/4 text-fg-muted"
          data-slot="chart-legend"
        >
          @for (entry of swatches(); track entry.key) {
            <li class="flex items-center gap-1.5">
              <span [class]="entry.classes" aria-hidden="true"></span>
              {{ entry.label }}
            </li>
          }
        </ul>
      }
      <div
        class="flex flex-col gap-3 rounded-xs outline-2 outline-offset-4 outline-transparent focus-visible:outline-accent/55"
        tabindex="0"
        role="group"
        [attr.aria-label]="label()"
        [attr.aria-describedby]="hintId"
        (pointerleave)="pointerLeft()"
        (focus)="focusEntered()"
        (blur)="focusLeft()"
        (keydown)="keyPressed($event)"
      >
        @for (bar of bars(); track bar.row.key) {
          <div class="flex flex-col gap-1.5">
            @if (bars().length > 1 || size() === 'thin') {
              <div
                class="flex items-baseline justify-between gap-4 text-[13px]/5"
                aria-hidden="true"
              >
                <span class="min-w-0 truncate text-fg" [title]="bar.row.label">{{
                  bar.row.label
                }}</span>
                <span class="shrink-0 text-fg-muted tabular-nums">{{ bar.row.display }}</span>
              </div>
            }
            <span [class]="trackClasses()" aria-hidden="true">
              @for (part of bar.parts; track part.entry.key) {
                @if (part.width > 0) {
                  <span
                    [class]="part.classes"
                    [style.width.%]="part.width"
                    (pointerenter)="pointerEntered(part.flat)"
                  >
                    @if (part.printed) {
                      {{ part.share }}
                    }
                  </span>
                }
              }
            </span>
          </div>
        }
      </div>
      <p class="mt-3 min-h-4 text-[12px]/4 text-fg-muted" aria-live="polite">
        @if (activePart(); as current) {
          <span class="font-medium text-fg tabular-nums">{{ current.segment.display }}</span>
          {{ current.entry.label }} · {{ current.share }}
          @if (bars().length > 1) {
            · {{ current.row }}
          }
        }
      </p>

      <span class="sr-only" [id]="hintId">{{ keyboardHint() }}</span>

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
              @for (entry of legend(); track entry.key) {
                <th scope="col">{{ entry.label }}</th>
              }
              <th scope="col">{{ totalHeader() }}</th>
            </tr>
          </thead>
          <tbody>
            @for (bar of bars(); track bar.row.key) {
              <tr>
                <th scope="row">{{ bar.row.label }}</th>
                @for (part of bar.parts; track part.entry.key) {
                  <td>{{ part.segment.display }}</td>
                }
                <td>{{ bar.row.display }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class StackedBarsComponent {
  // #region Properties
  /** Wholes in display order. */
  public readonly rows: InputSignal<readonly StackedBarRow[]> =
    input.required<readonly StackedBarRow[]>();

  /** Names, tones and order of the parts. */
  public readonly legend: InputSignal<readonly ChartLegendEntry[]> =
    input.required<readonly ChartLegendEntry[]>();

  /** Name of the group and caption of its table view. */
  public readonly label: InputSignal<string> = input.required<string>();

  /** Header of the table view's first column. */
  public readonly nameHeader: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.nameHeader:Élément`,
  );

  /** Header of the table view's total column. */
  public readonly totalHeader: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.totalHeader:Total`,
  );

  /** Description of the keyboard model, read with the focused group. */
  public readonly keyboardHint: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.partsKeyboardHint:Flèches gauche et droite pour parcourir les parts.`,
  );

  /** Scale of the bars. */
  public readonly scale: InputSignal<StackedBarsScale> = input<StackedBarsScale>('share');

  /** Height of the bars. */
  public readonly size: InputSignal<StackedBarsSize> = input<StackedBarsSize>('thin');

  /** Dims the bars while newer values load, without moving them. */
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
    // No whole, or only wholes of zero: nothing to split.
    (): boolean => this.rows().every((row: StackedBarRow): boolean => this.total(row) <= 0),
  );

  protected readonly emptyClasses: string = cn(CHART_EMPTY_CLASSES, 'h-20');

  /** Extra host classes. */
  public readonly class: InputSignal<string> = input<string>('');

  protected readonly hintId: string =
    inject<RenderIdService>(RenderIdService).next('ui-stacked-bars-');

  /** Flat index, across rows, of the active part. */
  protected readonly active: WritableSignal<number | null> = signal<number | null>(null);

  private readonly percent: Intl.NumberFormat = new Intl.NumberFormat(inject<string>(LOCALE_ID), {
    style: 'percent',
    maximumFractionDigits: 0,
  });

  protected readonly swatches: Signal<
    readonly { readonly key: string; readonly label: string; readonly classes: string }[]
  > = computed((): { key: string; label: string; classes: string }[] =>
    this.legend().map(
      (entry: ChartLegendEntry): { key: string; label: string; classes: string } => ({
        key: entry.key,
        label: entry.label,
        classes: cn('size-2 shrink-0 rounded-2xs', CHART_TONE_FILLS[entry.tone]),
      }),
    ),
  );

  protected readonly trackClasses: Signal<string> = computed<string>((): string =>
    cn('flex gap-0.5', this.size() === 'tall' ? 'h-8' : 'h-2'),
  );

  protected readonly bars: Signal<readonly Bar[]> = computed<readonly Bar[]>((): readonly Bar[] => {
    const rows: readonly StackedBarRow[] = this.rows();
    const totals: number[] = rows.map((row: StackedBarRow): number => this.total(row));
    const largest: number = Math.max(0, ...totals);
    const active: number | null = this.active();
    const tall: boolean = this.size() === 'tall';
    let flat: number = 0;
    return rows.map((row: StackedBarRow, index: number): Bar => {
      const total: number = totals[index] ?? 0;
      const base: number = this.scale() === 'absolute' ? largest : total;
      const parts: Part[] = this.legend().map((entry: ChartLegendEntry): Part => {
        const segment: StackedBarSegment = row.segments.find(
          (candidate: StackedBarSegment): boolean => candidate.key === entry.key,
        ) ?? { key: entry.key, value: 0, display: '0' };
        const value: number = Math.max(0, segment.value);
        const width: number = base > 0 ? (value / base) * 100 : 0;
        const own: number = flat;
        if (value > 0) flat++;
        return {
          flat: value > 0 ? own : -1,
          entry,
          segment,
          width,
          share: this.percent.format(total > 0 ? value / total : 0),
          printed: tall && width >= PRINT_MIN,
          classes: cn(
            'flex min-w-0.5 items-center justify-center overflow-hidden rounded-xs text-[12px]/4 font-medium whitespace-nowrap text-on-fill tabular-nums transition-opacity duration-(--dur-pop) motion-reduce:transition-none',
            CHART_TONE_FILLS[entry.tone],
            active !== null && active !== own && 'opacity-40',
          ),
        };
      });
      return { row, parts };
    });
  });

  private readonly flatParts: Signal<readonly (Part & { readonly row: string })[]> = computed(
    (): (Part & { row: string })[] =>
      this.bars().flatMap((bar: Bar): (Part & { row: string })[] =>
        bar.parts
          .filter((part: Part): boolean => part.flat >= 0)
          .map((part: Part): Part & { row: string } => ({ ...part, row: bar.row.label })),
      ),
  );

  protected readonly activePart: Signal<(Part & { readonly row: string }) | null> = computed(
    (): (Part & { row: string }) | null => {
      const active: number | null = this.active();
      return active === null ? null : (this.flatParts()[active] ?? null);
    },
  );

  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'block min-w-0 transition-opacity duration-(--dur-pop) data-stale:opacity-50 motion-reduce:transition-none',
      this.class(),
    ),
  );

  private readonly focused: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion

  // #region Methods
  protected pointerEntered(flat: number): void {
    if (flat >= 0) this.active.set(flat);
  }

  protected pointerLeft(): void {
    if (!this.focused()) this.active.set(null);
  }

  protected focusEntered(): void {
    this.focused.set(true);
    if (this.active() === null && this.flatParts().length) this.active.set(0);
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
   * Walks the non-empty parts, row after row, with the arrows, Home and End; Escape clears it.
   *
   * @param {KeyboardEvent} event - Key on the focused group.
   * @returns {void}
   */
  protected keyPressed(event: KeyboardEvent): void {
    const last: number = this.flatParts().length - 1;
    if (last < 0) return;
    const current: number = this.active() ?? 0;
    const next: number | null | undefined = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowUp: Math.max(0, current - 1),
      ArrowRight: Math.min(last, current + 1),
      ArrowDown: Math.min(last, current + 1),
      Home: 0,
      End: last,
      Escape: null,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.active.set(next);
  }

  private total(row: StackedBarRow): number {
    return row.segments.reduce(
      (sum: number, segment: StackedBarSegment): number => sum + Math.max(0, segment.value),
      0,
    );
  }
  // #endregion
}
