import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { TechIconComponent } from '@internal/content-web-ui/lib/tech/components/tech-icon/tech-icon.component';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

/**
 * Class TechTagsComponent
 * @class TechTagsComponent
 *
 * @description
 * Renders technology names as bordered pills with their decorative catalogue icons. With a `limit`, the
 * first ones show and a « +N » pill stands for the rest, whose names stay available to assistive
 * technologies.
 */
@Component({
  selector: 'content-tech-tags',
  imports: [TechIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-wrap gap-2" role="list">
      @for (tech of shown(); track tech) {
        <li
          class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border pr-3 pl-2.5 font-mono text-xs leading-4 text-fg-muted"
        >
          <content-tech-icon class="size-3.5" [tech]="tech" />
          {{ label(tech) }}
        </li>
      }
      @if (rest(); as rest) {
        <li
          class="inline-flex h-7 items-center rounded-full border border-border px-2.5 font-mono text-xs leading-4 text-fg-muted"
        >
          <span aria-hidden="true">+{{ rest.count }}</span>
          <span class="sr-only">{{ rest.label }}</span>
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
   * Property limit
   * @readonly
   *
   * @description
   * Most pills shown before the « +N » pill; `null` shows them all.
   *
   * @type {InputSignal<number | null>}
   */
  public readonly limit: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Technologies drawn as pills: all of them, or the first `limit` when more remain.
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly shown: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const techs: readonly string[] = this.techs();
    const limit: number | null = this.limit();
    return limit === null || techs.length <= limit ? techs : techs.slice(0, limit);
  });

  /**
   * Property rest
   * @readonly
   *
   * @description
   * Count and accessible description of the technologies left out, or `null` when all show.
   *
   * @type {Signal<{ readonly count: number; readonly label: string } | null>}
   */
  protected readonly rest: Signal<{ readonly count: number; readonly label: string } | null> =
    computed<{ readonly count: number; readonly label: string } | null>(() => {
      const hidden: readonly string[] = this.techs().slice(this.shown().length);
      if (hidden.length === 0) return null;
      const names: string = hidden.map((tech: string): string => this.label(tech)).join(', ');
      return {
        count: hidden.length,
        label: $localize`:@@tech.more:et ${hidden.length}:COUNT: autres : ${names}:NAMES:`,
      };
    });

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
