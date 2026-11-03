import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { SkillColumn } from '@vfortin/content-web-model';
import { GlyphComponent, RevealDirective } from '@vfortin/ui';
import { COLUMN_MARKS } from '@internal/content-web-ui/lib/skill-columns/constants/column-marks.constants';
import type { ColumnMark } from '@internal/content-web-ui/lib/skill-columns/models/column-mark/column-mark.interface';
import { TechIconComponent } from '@internal/content-web-ui/lib/tech/components/tech-icon/tech-icon.component';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

/**
 * Class SkillColumnsComponent
 * @class SkillColumnsComponent
 *
 * @description
 * Displays skill columns whose three-row subgrids align domains, technologies and usage notes.
 * The parent must establish an `@container` for the responsive layout and hover effects.
 */
@Component({
  selector: 'content-skill-columns',
  imports: [GlyphComponent, RevealDirective, TechIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skill-columns.component.html',
  host: { class: 'block' },
})
export class SkillColumnsComponent {
  // #region Properties
  /**
   * Property columns
   * @readonly
   *
   * @description
   * Skill column content in the order used by the template.
   *
   * @type {InputSignal<readonly SkillColumn[]>}
   */
  public readonly columns: InputSignal<readonly SkillColumn[]> =
    input.required<readonly SkillColumn[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Resolves a technology's display label, including the unknown-key fallback.
   *
   * @type {(tech: string) => string}
   */
  protected readonly label: (tech: string) => string = (tech: string): string =>
    techDefinition(tech).label;

  /**
   * Property mark
   * @readonly
   *
   * @description
   * Selects the positional glyph and tint, wrapping when there are more columns than marks.
   *
   * @type {(index: number) => ColumnMark}
   */
  protected readonly mark: (index: number) => ColumnMark = (index: number): ColumnMark =>
    COLUMN_MARKS[index % COLUMN_MARKS.length] ?? COLUMN_MARKS[0];
  // #endregion
}
