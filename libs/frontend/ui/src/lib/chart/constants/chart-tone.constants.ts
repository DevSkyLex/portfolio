import type { ChartTone } from '@internal/ui/lib/chart/models/chart/chart-tone.type';

/**
 * Constant CHART_TONE_FILLS
 *
 * @description
 * Background class of each tone, for bars, segments, dots and legend swatches. Literal strings, so
 * that Tailwind finds every class.
 */
export const CHART_TONE_FILLS: Readonly<Record<ChartTone, string>> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-fg-faint',
};

/**
 * Constant CHART_TONE_STROKES
 *
 * @description
 * Stroke class of each tone, for SVG lines.
 */
export const CHART_TONE_STROKES: Readonly<Record<ChartTone, string>> = {
  'chart-1': 'stroke-chart-1',
  'chart-2': 'stroke-chart-2',
  'chart-3': 'stroke-chart-3',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
  info: 'stroke-info',
  muted: 'stroke-fg-faint',
};

/**
 * Constant CHART_EMPTY_FILL
 *
 * @description
 * Surface of an empty mark, one step off the background: a heatmap slot without any value and the
 * unfilled track of a bar, so that the full extent of every mark stays visible.
 */
export const CHART_EMPTY_FILL: string = 'bg-surface-raised';

/**
 * Constant CHART_HEAT_STEPS
 *
 * @description
 * Sequential ramp of `chart-1` over the surface, from the faintest to the full hue (more is stronger):
 * four steps, the faintest still 2:1 against the surface in both themes (D51). A zero or a slot
 * without any value takes CHART_EMPTY_FILL instead, so that it never reads as a small value.
 */
export const CHART_HEAT_STEPS: readonly string[] = [
  'bg-chart-1/50',
  'bg-chart-1/65',
  'bg-chart-1/80',
  'bg-chart-1',
];

/**
 * Constant CHART_TOOLTIP_CLASSES
 *
 * @description
 * Floating readout shared by the charts, above the mark it describes.
 */
export const CHART_TOOLTIP_CLASSES: string =
  'pointer-events-none absolute bottom-full z-10 mb-2 flex flex-col gap-1 rounded-sm border border-border bg-surface-float px-2 py-1.5 text-[12px]/4 whitespace-nowrap text-fg shadow-float';
