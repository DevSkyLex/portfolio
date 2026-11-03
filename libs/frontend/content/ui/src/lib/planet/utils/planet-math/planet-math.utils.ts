import type { Rgb } from '@internal/content-web-ui/lib/models/rgb/rgb.type';
import { AURORA_STOP_POSITIONS } from '@internal/content-web-ui/lib/planet/constants/aurora-stop-positions.constants';
import type { AuroraStops } from '@internal/content-web-ui/lib/planet/models/aurora-stops/aurora-stops.type';
import type { FormPath } from '@internal/content-web-ui/lib/planet/models/form-path/form-path.type';
import type { PixelGrid } from '@internal/content-web-ui/lib/planet/models/pixel-grid/pixel-grid.interface';
import type { PlanetForm } from '@internal/content-web-ui/lib/planet/models/planet-form/planet-form.type';
import {
  PLANET_FORMS,
  type PlanetForms,
} from '@internal/content-web-ui/lib/planet/models/planet-forms/planet-forms.model';
import type { PlanetGeometry } from '@internal/content-web-ui/lib/planet/models/planet-geometry/planet-geometry.interface';
import type { PlanetRamp } from '@internal/content-web-ui/lib/planet/models/planet-ramp/planet-ramp.type';
import type { PlanetSide } from '@internal/content-web-ui/lib/planet/models/planet-side/planet-side.type';

/**
 * Function formsOf
 *
 * @description
 * Resolves a named form ramp and falls back to the mixed ramp for unknown names.
 *
 * @returns {PlanetRamp} Named ramp, falling back to the mixed form ramp for unknown names.
 * @param {string} name - Ramp key from `PLANET_FORMS`; unknown names select the mixed ramp.
 */
export function formsOf(name: string): PlanetRamp {
  return name in PLANET_FORMS ? PLANET_FORMS[name as PlanetForms] : PLANET_FORMS.mixed;
}

/**
 * Function formLevel
 *
 * @description
 * Maps normalized luminance to a non-empty ramp index while reserving zero for empty cells.
 *
 * @returns {number} Ramp index for the luminance, reserving zero for empty cells.
 * @param {number} l - Normalized luminance used to select a mark density.
 * @param {PlanetRamp} ramp - Ordered ramp whose index zero represents an empty cell.
 */
export function formLevel(l: number, ramp: PlanetRamp): number {
  if (!(l > 0)) return 0;
  return 1 + Math.min(ramp.length - 2, Math.floor(l * (ramp.length - 1)));
}

/**
 * Function addForm
 *
 * @description
 * Adds one centered mark to the current path, maintaining a one-physical-pixel minimum and snapping edges when a grid transform is supplied.
 *
 * @returns {void}
 * @param {FormPath} ctx - Canvas path surface receiving the mark geometry.
 * @param {PlanetForm} f - Mark kind and dimensions expressed as fractions of the cell.
 * @param {number} x - Cell left edge in CSS pixels.
 * @param {number} y - Cell top edge in CSS pixels.
 * @param {number} c - Square cell size in CSS pixels.
 * @param {PixelGrid | null} g - Optional canvas transform used to snap mark edges to physical pixels.
 */
export function addForm(
  ctx: FormPath,
  f: PlanetForm,
  x: number,
  y: number,
  c: number,
  g?: PixelGrid | null,
): void {
  const k: number = g ? g.k : 1;
  const ox: number = g ? g.x : 0;
  const oy: number = g ? g.y : 0;
  const one: number = Math.max(1, Math.round(k));
  const cx: number = x + c / 2;
  const cy: number = y + c / 2;
  const sx: (v: number) => number = (v: number): number => (Math.round(v * k + ox) - ox) / k;
  const sy: (v: number) => number = (v: number): number => (Math.round(v * k + oy) - oy) / k;
  if (f[0] === 'dot') {
    const r: number = Math.max(0.5, f[1] * c);
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (f[0] === 'square') {
    const q: number = Math.max(one, Math.round(f[1] * c * k)) / k;
    ctx.rect(sx(cx - q / 2), sy(cy - q / 2), q, q);
  } else {
    const w: number = Math.max(one, Math.round(f[2] * c * k)) / k;
    const e: number = Math.max(one, Math.round((f[1] * c - w / 2) * k)) / k;
    const left: number = sx(cx - w / 2);
    const top: number = sy(cy - w / 2);
    ctx.rect(left - e, top, w + e * 2, w);
    ctx.rect(left, top - e, w, w + e * 2);
  }
}

/**
 * Function hash2
 *
 * @description
 * Produces a deterministic pseudo-random value in `[0, 1)` for integer grid coordinates.
 *
 * @returns {number} Deterministic pseudo-random value in the unit interval.
 * @param {number} x - Integer horizontal grid coordinate.
 * @param {number} y - Integer vertical grid coordinate.
 */
export function hash2(x: number, y: number): number {
  let n: number = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

/**
 * Function vnoise
 *
 * @description
 * Bilinearly interpolates four deterministic hash samples using a smooth cell curve.
 *
 * @returns {number} Smooth interpolation of the four surrounding hash samples.
 * @param {number} x - Horizontal sample coordinate in the noise field.
 * @param {number} y - Vertical sample coordinate in the noise field.
 */
export function vnoise(x: number, y: number): number {
  const xi: number = Math.floor(x);
  const yi: number = Math.floor(y);
  const xf: number = x - xi;
  const yf: number = y - yi;
  const u: number = xf * xf * (3 - 2 * xf);
  const v: number = yf * yf * (3 - 2 * yf);
  const a: number = hash2(xi, yi);
  const b: number = hash2(xi + 1, yi);
  const c: number = hash2(xi, yi + 1);
  const d: number = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Function fbm
 *
 * @description
 * Combines three noise frequencies with decreasing weights and normalizes their total weight.
 *
 * @returns {number} Normalized three-frequency noise value.
 * @param {number} x - Horizontal sample coordinate shared by the three noise frequencies.
 * @param {number} y - Vertical sample coordinate shared by the three noise frequencies.
 */
export function fbm(x: number, y: number): number {
  return (vnoise(x, y) * 0.5 + vnoise(x * 2, y * 2) * 0.25 + vnoise(x * 4, y * 4) * 0.125) / 0.875;
}

/**
 * Function parseColor
 *
 * @description
 * Parses supported hexadecimal or RGB CSS colour forms and returns null for missing or unsupported values.
 *
 * @returns {Rgb | null} Parsed RGB channels for supported CSS syntax, or null for unsupported input.
 * @param {string | null | undefined} value - CSS hexadecimal or RGB(A) colour text; unsupported or absent syntax returns null.
 */
export function parseColor(value: string | null | undefined): Rgb | null {
  if (!value) return null;
  const v: string = value.trim();
  const hex: string | undefined = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)?.[1];
  if (hex) {
    const x: string = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex;
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
  }
  const rgb: RegExpExecArray | null = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(v);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

/**
 * Function auroraAt
 *
 * @description
 * Interpolates between the four aurora stops after clamping progress to the unit interval.
 *
 * @returns {Rgb} Interpolated RGB colour after progress is clamped to the unit interval.
 * @param {AuroraStops} stops - Ordered pink, violet, blue and cyan colours for the gradient.
 * @param {number} t - Gradient position, clamped to the normalized interval `[0, 1]`.
 */
export function auroraAt(stops: AuroraStops, t: number): Rgb {
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const i: 1 | 2 | 3 = t <= AURORA_STOP_POSITIONS[1] ? 1 : t <= AURORA_STOP_POSITIONS[2] ? 2 : 3;
  const from: number = AURORA_STOP_POSITIONS[i - 1] as number;
  const k: number = (t - from) / (AURORA_STOP_POSITIONS[i] - from);
  const a: Rgb = stops[i - 1] as Rgb;
  const b: Rgb = stops[i];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * Function colorKey
 *
 * @description
 * Formats a colour with alpha quantized to one of eight levels to reduce distinct canvas fill styles.
 *
 * @returns {string} Canvas RGBA string with alpha quantized to eighths.
 * @param {Rgb} c - RGB channels to format in the canvas fill style.
 * @param {number} a - Opacity quantized to one of eight fill-style levels.
 */
export function colorKey(c: Rgb, a: number): string {
  const q: number = Math.max(1, Math.min(8, Math.round(a * 8))) / 8;
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${q})`;
}

/**
 * Function planetGeometry
 *
 * @description
 * Places the planet partly outside the selected horizontal edge and lowers it as page scroll increases.
 *
 * @returns {PlanetGeometry} Radius and canvas center after side, scale, lift and scroll are applied.
 * @param {number} w - Canvas width in CSS pixels.
 * @param {number} hh - Canvas height in CSS pixels.
 * @param {PlanetSide} side - Horizontal edge from which the planet is positioned outside the frame.
 * @param {number} scroll - Normalized page scroll that shifts the planet vertically.
 * @param {number} scale - Positive radius multiplier; non-positive values use the default scale.
 * @param {number} lift - Positive fraction of the radius that raises the center; non-positive values add no lift.
 */
export function planetGeometry(
  w: number,
  hh: number,
  side: PlanetSide,
  scroll: number,
  scale: number,
  lift: number,
): PlanetGeometry {
  const R: number = Math.max(w, hh) * 1.1 * (scale > 0 ? scale : 1);
  const up: number = lift > 0 ? lift : 0;
  return {
    R,
    x: side === 'left' ? -R * 0.38 : w + R * 0.38,
    y: hh + R * (0.42 - up + 0.22 * scroll),
  };
}
