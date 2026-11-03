import type { PlanetForm } from '@internal/content-web-ui/lib/planet/models/planet-form/planet-form.type';
import type { PixelGrid } from '@internal/content-web-ui/lib/planet/models/pixel-grid/pixel-grid.interface';
import type { PlanetRamp } from '@internal/content-web-ui/lib/planet/models/planet-ramp/planet-ramp.type';
import { addForm } from '@internal/content-web-ui/lib/planet/utils/planet-math/planet-math.utils';

/**
 * Class FormBuckets
 * @class FormBuckets
 *
 * @description
 * Groups positioned form levels by colour so each colour can be rendered with one canvas fill.
 */
export class FormBuckets {
  // #region Properties
  /**
   * Property map
   * @readonly
   *
   * @description
   * Collected triples of level, x and y indexed by fill colour.
   *
   * @type {Map<string, number[]>}
   */
  private readonly map: Map<string, number[]> = new Map<string, number[]>();
  // #endregion

  // #region Methods
  /**
   * Method push
   * @method push
   *
   * @description
   * Appends one mark position to the group for its colour.
   *
   * @returns {void}
   * @param {string} color - Canvas fill-style key grouping this mark with other marks.
   * @param {number} level - Index into the ramp used to select this cell’s form.
   * @param {number} x - Cell left edge in CSS pixels.
   * @param {number} y - Cell top edge in CSS pixels.
   */
  public push(color: string, level: number, x: number, y: number): void {
    let list: number[] | undefined = this.map.get(color);
    if (!list) {
      list = [];
      this.map.set(color, list);
    }
    list.push(level, x, y);
  }

  /**
   * Method draw
   * @method draw
   *
   * @description
   * Builds a path for each colour group and fills the marks selected by their ramp levels.
   *
   * @returns {void}
   * @param {CanvasRenderingContext2D} ctx - 2D context whose transform supplies the physical pixel grid and whose path receives marks.
   * @param {PlanetRamp} ramp - Ordered forms indexed by each queued mark level.
   * @param {number} cell - Square cell dimension in CSS pixels.
   */
  public draw(ctx: CanvasRenderingContext2D, ramp: PlanetRamp, cell: number): void {
    const t: DOMMatrix = ctx.getTransform();
    const g: PixelGrid = { k: t.a, x: t.e, y: t.f };
    for (const [color, list] of this.map) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let j: number = 0; j < list.length; j += 3) {
        const form: PlanetForm | null | undefined = ramp[list[j] ?? 0];
        if (form) addForm(ctx, form, list[j + 1] ?? 0, list[j + 2] ?? 0, cell, g);
      }
      ctx.fill();
    }
  }
  // #endregion
}
