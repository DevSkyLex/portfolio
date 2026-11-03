import type { Rgb } from '@internal/content-web-ui/lib/models/rgb/rgb.type';

/**
 * Type AuroraStops
 * @type AuroraStops
 *
 * @description
 * Four RGB colours sampled by the planet's aurora gradient.
 */
export type AuroraStops = readonly [Rgb, Rgb, Rgb, Rgb];
