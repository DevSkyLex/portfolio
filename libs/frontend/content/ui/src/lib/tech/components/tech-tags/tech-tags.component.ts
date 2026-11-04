import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TechIconComponent } from '@internal/content-web-ui/lib/tech/components/tech-icon/tech-icon.component';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

/**
 * Class TechTagsComponent
 * @class TechTagsComponent
 *
 * @description
 * Renders technology names as bordered pills with their decorative catalogue icons.
 */
@Component({
  selector: 'content-tech-tags',
  imports: [TechIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-wrap gap-2" role="list">
      @for (tech of techs(); track tech) {
        <li
          class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border pr-3 pl-2.5 font-mono text-xs leading-4 text-fg-muted"
        >
          <content-tech-icon class="size-3.5" [tech]="tech" />
          {{ label(tech) }}
        </li>
      }
    </ul>
  `,
})
export class TechTagsComponent {
  // #region Properties
  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys rendered in the order provided by the caller.
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly techs: InputSignal<readonly string[]> = input.required<readonly string[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Resolves the user-facing label, retaining unknown technology keys as fallback text.
   *
   * @type {(tech: string) => string}
   */
  protected readonly label: (tech: string) => string = (tech: string): string =>
    techDefinition(tech).label;
  // #endregion
}
