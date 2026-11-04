import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { ResizableLayout } from '@internal/ui/lib/resizable/models/resizable/resizable-layout.interface';
import type { PanelPixels } from '@internal/ui/lib/resizable/models/resizable/panel-pixels.interface';
import {
  storedPanelPixels,
  storedPanelSizes,
} from '@internal/ui/lib/resizable/utils/resizable/resizable.utils';

/**
 * Service ResizableLayoutService
 * @class ResizableLayoutService
 *
 * @description
 * Remembers the layout of a resizable panel group per viewer in `localStorage`. Read the sizes
 * synchronously to bind them as the panels' `defaultSize` (no layout jump on load) and write the
 * group's `layoutChange` back. A layout with a `pixels` panel stores that panel's length instead
 * (`readPixels`, `writePixels`), so a sidebar keeps its width when the window changes. Storage is
 * touched in the browser only; a refused or failing storage (private mode, quota, blocked site data)
 * or an invalid or out-of-bounds stored value falls back to the defaults.
 */
@Injectable({ providedIn: 'root' })
export class ResizableLayoutService {
  // #region Properties
  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window whose storage holds the layouts; `null` while prerendering.
   *
   * @type {Window | null}
   */
  private readonly view: Window | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? inject<Document>(DOCUMENT).defaultView
    : null;
  // #endregion

  // #region Methods
  /**
   * Method read
   * @method read
   *
   * @description
   * Returns the stored panel percentages of a group when they are valid for its layout.
   *
   * @param {ResizableLayout} layout - Storage key, defaults and bounds of the group.
   * @returns {readonly number[]} Stored sizes, or the layout's defaults.
   */
  public read(layout: ResizableLayout): readonly number[] {
    try {
      return storedPanelSizes(this.view?.localStorage.getItem(layout.key) ?? null, layout);
    } catch {
      return layout.sizes;
    }
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Stores a group's panel percentages, rounded to two decimals.
   *
   * @param {ResizableLayout} layout - Group whose key receives the sizes.
   * @param {readonly number[]} sizes - Percentages emitted by `layoutChange`.
   * @returns {void} Leaves the layout unsaved when storage refuses it.
   */
  public write(layout: ResizableLayout, sizes: readonly number[]): void {
    try {
      this.view?.localStorage.setItem(
        layout.key,
        JSON.stringify(sizes.map((size: number): number => Math.round(size * 100) / 100)),
      );
    } catch {
      // Storage refused: the layout lasts for the page only.
    }
  }

  /**
   * Method readPixels
   * @method readPixels
   *
   * @description
   * Returns the stored length of the layout's pixel panel when it lies within that panel's pixel
   * bounds; a missing, invalid or out-of-bounds value (a percentage layout stored before) gives the
   * default.
   *
   * @param {ResizableLayout & { readonly pixels: PanelPixels }} layout - Group with a pixel panel.
   * @returns {number} Length in pixels, to bind as `'<n>px'`.
   */
  public readPixels(layout: ResizableLayout & { readonly pixels: PanelPixels }): number {
    try {
      return storedPanelPixels(
        this.view?.localStorage.getItem(layout.key) ?? null,
        layout,
        layout.pixels,
      );
    } catch {
      return layout.pixels.default;
    }
  }

  /**
   * Method writePixels
   * @method writePixels
   *
   * @description
   * Stores the length of the layout's pixel panel, rounded to the pixel.
   *
   * @param {ResizableLayout} layout - Group whose key receives the length.
   * @param {number} pixels - Length of the panel, from the group's `pixelSizes()`.
   * @returns {void} Leaves the layout unsaved when storage refuses it or the length is not finite.
   */
  public writePixels(layout: ResizableLayout, pixels: number): void {
    if (!Number.isFinite(pixels)) return;
    try {
      this.view?.localStorage.setItem(layout.key, JSON.stringify(Math.round(pixels)));
    } catch {
      // Storage refused: the layout lasts for the page only.
    }
  }
  // #endregion
}
