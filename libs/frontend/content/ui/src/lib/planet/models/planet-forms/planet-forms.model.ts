import type { PlanetRamp } from '@internal/content-web-ui/lib/planet/models/planet-ramp/planet-ramp.type';

/**
 * Constant PLANET_FORMS
 *
 * @description
 * Available cell ramps, each ordered from no mark to the densest mark.
 */
export const PLANET_FORMS = {
  mixed: [
    null,
    ['dot', 0.07],
    ['dot', 0.11],
    ['dot', 0.15],
    ['plus', 0.19, 0.07],
    ['plus', 0.23, 0.08],
    ['plus', 0.27, 0.09],
    ['plus', 0.31, 0.1],
    ['plus', 0.35, 0.11],
  ],
  dots: [
    null,
    ['dot', 0.07],
    ['dot', 0.12],
    ['dot', 0.17],
    ['dot', 0.22],
    ['dot', 0.27],
    ['dot', 0.32],
    ['dot', 0.38],
    ['dot', 0.45],
  ],
  plus: [
    null,
    ['plus', 0.12, 0.05],
    ['plus', 0.155, 0.06],
    ['plus', 0.19, 0.07],
    ['plus', 0.225, 0.08],
    ['plus', 0.26, 0.09],
    ['plus', 0.295, 0.1],
    ['plus', 0.33, 0.11],
    ['plus', 0.36, 0.12],
  ],
  squares: [
    null,
    ['square', 0.14],
    ['square', 0.22],
    ['square', 0.3],
    ['square', 0.4],
    ['square', 0.5],
    ['square', 0.6],
    ['square', 0.72],
    ['square', 0.86],
  ],
} as const satisfies Record<string, PlanetRamp>;

/**
 * Type PlanetForms
 * @type PlanetForms
 *
 * @description
 * Names of the form ramps available in `PLANET_FORMS`.
 */
export type PlanetForms = keyof typeof PLANET_FORMS;
