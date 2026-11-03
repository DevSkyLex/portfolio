import type { PlanetForm } from '@internal/content-web-ui/lib/planet/models/planet-form/planet-form.type';

/**
 * Type PlanetRamp
 * @type PlanetRamp
 *
 * @description
 * Ordered mark levels, with `null` at index zero to represent an empty cell.
 */
export type PlanetRamp = readonly (PlanetForm | null)[];
