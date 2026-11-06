import {
  ChangeDetectionStrategy,
  Component,
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
  CHART_EMPTY_FILL,
  CHART_HEAT_STEPS,
  CHART_EMPTY_CLASSES,
} from '@internal/ui/lib/chart/constants/chart-tone.constants';
import type {
  HeatmapCell,
  HeatmapRow,
} from '@internal/ui/lib/chart/models/chart/heatmap-row.interface';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

/** A slot of the grid as drawn. */
interface Slot {
  readonly column: number;
  readonly cell: HeatmapCell | null;
  readonly classes: string;
}

/** A row of the grid as drawn. */
interface Line {
  readonly index: number;
  readonly row: HeatmapRow;
  readonly slots: readonly Slot[];
}

/**
 * Component HeatmapComponent
 * @class HeatmapComponent
 *
 * @description
 * A grid of magnitudes (a calendar of days by weekday): one hue from faint to full in four steps
 * relative to the largest cell (CHART_HEAT_STEPS), a measured zero on the hover surface and a slot
 * outside the window left empty, a "less / more" scale legend, and a readout line under the grid that
 * names the hovered or focused cell (arrows move it on the focused grid). The values stay in a table
 * view.
 */
@Component({
  selector: 'ui-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-stale]': 'stale() ? "" : null',
    'data-slot': 'heatmap',
  },
  template: `
    @if (empty()) {
      <p [class]="emptyClasses">{{ emptyLabel() }}</p>
    } @else {
      <div
        class="grid gap-0.5 rounded-xs outline-2 outline-offset-4 outline-transparent focus-visible:outline-accent/55"
        tabindex="0"
        role="group"
        [attr.aria-label]="label()"
        [attr.aria-describedby]="hintId"
        [style.grid-template-columns]="template()"
        (pointerleave)="pointerLeft()"
        (focus)="focusEntered()"
        (blur)="focusLeft()"
        (keydown)="keyPressed($event)"
      >
        @for (line of lines(); track line.row.key) {
          <span
            class="flex items-center pe-2 text-[11px]/4 whitespace-nowrap text-fg-faint"
            aria-hidden="true"
            >{{ line.row.label }}</span
          >
          @for (slot of line.slots; track slot.column) {
            <span
              data-slot="heatmap-cell"
              [class]="slot.classes"
              aria-hidden="true"
              (pointerenter)="pointerEntered(line.index, slot.column)"
            ></span>
          }
        }
        <span aria-hidden="true"></span>
        @for (column of columns(); track $index) {
          <span
            class="min-w-0 overflow-visible pt-1 text-[11px]/4 whitespace-nowrap text-fg-faint"
            aria-hidden="true"
            >{{ column }}</span
          >
        }
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p class="min-h-4 text-[12px]/4 text-fg-muted" aria-live="polite">
          @if (activeCell(); as cell) {
            <span class="font-medium text-fg tabular-nums">{{ cell.display }}</span>
            {{ cell.label }}
          }
        </p>
        <span class="flex items-center gap-1.5 text-[11px]/4 text-fg-faint" aria-hidden="true">
          {{ lessLabel() }}
          @for (step of steps; track step) {
            <span [class]="step"></span>
          }
          {{ moreLabel() }}
        </span>
      </div>

      <span class="sr-only" [id]="hintId">{{ keyboardHint() }}</span>

      <!-- A table grows past the 1 px of sr-only: the wrapper is the hidden box. -->
      <div class="sr-only">
        <table>
          <caption>
            {{
              label()
            }}
          </caption>
          <tbody>
            @for (row of rows(); track row.key) {
              @for (cell of row.cells; track $index) {
                @if (cell) {
                  <tr>
                    <th scope="row">{{ cell.label }}</th>
                    <td>{{ cell.display }}</td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class HeatmapComponent {
  // #region Properties
  /** Rows in display order, each with one slot per column. */
  public readonly rows: InputSignal<readonly HeatmapRow[]> =
    input.required<readonly HeatmapRow[]>();

  /** Column labels under the grid; an empty string leaves a column unnamed. */
  public readonly columns: InputSignal<readonly string[]> = input.required<readonly string[]>();

  /** Name of the grid and caption of its table view. */
  public readonly label: InputSignal<string> = input.required<string>();

  /** Low end of the scale legend. */
  public readonly lessLabel: InputSignal<string> = input<string>($localize`:@@ui.chart.less:Moins`);

  /** High end of the scale legend. */
  public readonly moreLabel: InputSignal<string> = input<string>($localize`:@@ui.chart.more:Plus`);

  /** Description of the keyboard model, read with the focused grid. */
  public readonly keyboardHint: InputSignal<string> = input<string>(
    $localize`:@@ui.chart.heatmapKeyboardHint:Flèches pour parcourir les cases.`,
  );

  /** Dims the grid while newer values load, without moving it. */
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
    (): boolean =>
      !this.rows().some((row: HeatmapRow): boolean =>
        row.cells.some((cell: HeatmapCell | null): boolean => cell !== null),
      ),
  );

  protected readonly emptyClasses: string = cn(CHART_EMPTY_CLASSES, 'h-52');

  /** Extra host classes. */
  public readonly class: InputSignal<string> = input<string>('');

  protected readonly hintId: string = inject<RenderIdService>(RenderIdService).next('ui-heatmap-');

  /** Swatches of the scale legend. */
  protected readonly steps: readonly string[] = [CHART_EMPTY_FILL, ...CHART_HEAT_STEPS].map(
    (step: string): string => cn('size-2.5 rounded-2xs', step),
  );

  /** Row and column of the active slot. */
  protected readonly active: WritableSignal<{ row: number; column: number } | null> = signal<{
    row: number;
    column: number;
  } | null>(null);

  private readonly width: Signal<number> = computed<number>((): number =>
    Math.max(
      this.columns().length,
      ...this.rows().map((row: HeatmapRow): number => row.cells.length),
    ),
  );

  /**
   * Label gutter as wide as its labels, then equal columns sharing the full width; the 28 px row
   * height stays fixed, so a short window draws wide cells rather than oversized squares.
   */
  protected readonly template: Signal<string> = computed<string>(
    (): string => `max-content repeat(${this.width()}, minmax(0, 1fr))`,
  );

  private readonly max: Signal<number> = computed<number>((): number =>
    Math.max(
      0,
      ...this.rows().flatMap((row: HeatmapRow): number[] =>
        row.cells.map((cell: HeatmapCell | null): number => cell?.value ?? 0),
      ),
    ),
  );

  protected readonly lines: Signal<readonly Line[]> = computed<readonly Line[]>(
    (): readonly Line[] => {
      const active: { row: number; column: number } | null = this.active();
      return this.rows().map((row: HeatmapRow, index: number): Line => ({
        index,
        row,
        slots: Array.from({ length: this.width() }, (_: unknown, column: number): Slot => {
          const cell: HeatmapCell | null = row.cells[column] ?? null;
          const current: boolean = active?.row === index && active.column === column;
          return {
            column,
            cell,
            classes: cn(
              'h-7 min-w-0 rounded-2xs',
              cell === null ? CHART_EMPTY_FILL : this.step(cell.value),
              current && 'ring-2 ring-fg ring-offset-1 ring-offset-surface',
            ),
          };
        }),
      }));
    },
  );

  protected readonly activeCell: Signal<HeatmapCell | null> = computed<HeatmapCell | null>(
    (): HeatmapCell | null => {
      const active: { row: number; column: number } | null = this.active();
      return active ? (this.rows()[active.row]?.cells[active.column] ?? null) : null;
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
  protected pointerEntered(row: number, column: number): void {
    this.active.set({ row, column });
  }

  protected pointerLeft(): void {
    if (!this.focused()) this.active.set(null);
  }

  /**
   * Method focusEntered
   * @method focusEntered
   *
   * @description
   * Activates the last measured cell, the most recent day of a calendar.
   *
   * @returns {void}
   */
  protected focusEntered(): void {
    this.focused.set(true);
    if (this.active() !== null) return;
    const width: number = this.width();
    for (let column: number = width - 1; column >= 0; column--) {
      for (let row: number = this.rows().length - 1; row >= 0; row--) {
        if (this.rows()[row]?.cells[column]) {
          this.active.set({ row, column });
          return;
        }
      }
    }
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
   * Moves the active slot one row or column with the arrows; Escape clears it.
   *
   * @param {KeyboardEvent} event - Key on the focused grid.
   * @returns {void}
   */
  protected keyPressed(event: KeyboardEvent): void {
    const current: { row: number; column: number } | null = this.active();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.active.set(null);
      return;
    }
    const moves: Readonly<Record<string, readonly [number, number]>> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move: readonly [number, number] | undefined = moves[event.key];
    if (!move || !current) return;
    event.preventDefault();
    this.active.set({
      row: Math.min(this.rows().length - 1, Math.max(0, current.row + move[0])),
      column: Math.min(this.width() - 1, Math.max(0, current.column + move[1])),
    });
  }

  /** Ramp step of a value relative to the largest cell; zero takes the hover surface. */
  private step(value: number): string {
    const max: number = this.max();
    if (value <= 0 || max <= 0) return CHART_EMPTY_FILL;
    const index: number = Math.min(
      CHART_HEAT_STEPS.length - 1,
      Math.ceil((value / max) * CHART_HEAT_STEPS.length) - 1,
    );
    return CHART_HEAT_STEPS[index] ?? 'bg-chart-1';
  }
  // #endregion
}
