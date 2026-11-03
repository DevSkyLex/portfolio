import type { mountPlanet } from '@internal/content-web-ui/lib/planet/renderers/planet/planet-renderer';

/** Loads the browser-only renderer without making it an eager component dependency. */
export type PlanetRendererLoader = () => Promise<{ mountPlanet: typeof mountPlanet }>;
