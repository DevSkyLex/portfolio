/**
 * Type PlanetForm
 * @type PlanetForm
 *
 * @description
 * Canvas mark shape with dimensions expressed as fractions of its cell.
 */
export type PlanetForm =
  readonly ['dot', number] | readonly ['square', number] | readonly ['plus', number, number];
