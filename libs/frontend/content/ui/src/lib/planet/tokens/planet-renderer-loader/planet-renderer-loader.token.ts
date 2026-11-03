import { InjectionToken } from '@angular/core';
import type { PlanetRendererLoader } from '@internal/content-web-ui/lib/planet/models/planet-renderer-loader/planet-renderer-loader.type';

/** Owner-private loading boundary for renderer availability and lifecycle tests. */
export const PLANET_RENDERER_LOADER: InjectionToken<PlanetRendererLoader> =
  new InjectionToken<PlanetRendererLoader>('PLANET_RENDERER_LOADER', {
    providedIn: 'root',
    factory: (): PlanetRendererLoader => (): ReturnType<PlanetRendererLoader> =>
      import('@internal/content-web-ui/lib/planet/renderers/planet/planet-renderer'),
  });
