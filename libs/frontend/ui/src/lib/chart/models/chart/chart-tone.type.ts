/**
 * Type ChartTone
 * @type ChartTone
 *
 * @description
 * Colour job of a mark (D51): `chart-1` to `chart-3` tell series apart in this fixed order; the status
 * tones are reserved for marks that mean good, warning, bad or neutral information, always named by a
 * legend; `muted` is the de-emphasis grey of context marks.
 */
export type ChartTone =
  'chart-1' | 'chart-2' | 'chart-3' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
