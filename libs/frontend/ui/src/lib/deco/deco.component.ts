import type { DecoTint } from '@internal/ui/lib/deco/models/deco/deco-tint.type';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { ScrollProgressDirective } from '@internal/ui/lib/scroll-progress/scroll-progress.directive';
import { GlyphComponent } from '@internal/ui/lib/deco/components/glyph/glyph.component';
import type { DecoGlyph } from '@internal/ui/lib/deco/models/deco/deco-glyph.interface';
import { TINTS } from '@internal/ui/lib/deco/constants/deco.constants';

/**
 * Class DecoComponent
 * @class DecoComponent
 *
 * @description
 * Places aria-hidden floating glyphs in a relative container and links their parallax movement to the
 * section scroll progress, with reduced motion and narrow-container styles.
 */
@Component({
  selector: 'ui-deco',
  imports: [GlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ScrollProgressDirective],
  host: {
    class: 'pointer-events-none absolute inset-0 z-0 block',
    'aria-hidden': 'true',
    'data-slot': 'deco',
  },
  template: `
    @for (glyph of glyphs(); track $index) {
      <span
        class="absolute [transform:translate(-50%,-50%)_translateY(calc((var(--p,0.5)-0.5)*var(--z)*-180px))] text-[length:var(--fs)] opacity-[clamp(0,calc(var(--p,0.5)*4),0.85)] motion-reduce:[transform:translate(-50%,-50%)] motion-reduce:opacity-85 @max-[768px]:text-[length:calc(var(--fs)*0.5)]"
        [class]="tints[glyph.tint] + (glyph.mid ? ' @max-[768px]:hidden' : '')"
        [style.left.%]="glyph.x"
        [style.top.%]="glyph.y"
        [style.--fs.px]="glyph.size"
        [style.--z]="glyph.depth"
        [style.--t]="glyph.phase"
      >
        <ui-glyph
          class="animate-float [animation-delay:calc(var(--t)*-1s)] [animation-duration:calc(6s+var(--t)*0.7s)] motion-reduce:animate-none"
          [shape]="glyph.shape"
        />
      </span>
    }
  `,
})
export class DecoComponent {
  // #region Properties
  /**
   * Property glyphs
   * @readonly
   *
   * @description
   * Glyph definitions rendered at their configured section-relative positions.
   *
   * @type {InputSignal<readonly DecoGlyph[]>}
   */
  public readonly glyphs: InputSignal<readonly DecoGlyph[]> =
    input.required<readonly DecoGlyph[]>();

  /**
   * Property tints
   * @readonly
   *
   * @description
   * Tint classes consumed by the glyph template.
   *
   * @type {Readonly<Record<DecoTint, string>>}
   */
  protected readonly tints: Readonly<Record<DecoTint, string>> = TINTS;
  // #endregion
}
