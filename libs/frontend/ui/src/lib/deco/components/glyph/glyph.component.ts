import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { GlyphShape } from '@internal/ui/lib/deco/models/deco/glyph-shape.type';
import { SHAPES } from '@internal/ui/lib/deco/constants/glyph.constants';

/**
 * Class GlyphComponent
 * @class GlyphComponent
 *
 * @description
 * Renders a decorative dot, square or cross sized in em units and coloured by the inherited text color.
 */
@Component({
  selector: 'ui-glyph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', 'data-slot': 'glyph', '[class]': 'classes()' },
  template: '',
})
export class GlyphComponent {
  // #region Properties
  /**
   * Property shape
   * @readonly
   *
   * @description
   * Geometric mark to render using the corresponding shared shape class.
   *
   * @type {InputSignal<GlyphShape>}
   */
  public readonly shape: InputSignal<GlyphShape> = input.required<GlyphShape>();

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Block sizing and shape-specific styles derived from the current input.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(
    () => `block flex-none ${SHAPES[this.shape()]}`,
  );
  // #endregion
}
