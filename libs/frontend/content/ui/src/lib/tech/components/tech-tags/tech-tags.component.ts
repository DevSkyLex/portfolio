import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { ArticleTerm } from '@vfortin/content-web-model';
import { TechIconComponent } from '@internal/content-web-ui/lib/tech/components/tech-icon/tech-icon.component';
import { publicationTags } from '@internal/content-web-ui/lib/tech/utils/publication-tags/publication-tags.utils';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

/**
 * Class TechTagsComponent
 * @class TechTagsComponent
 *
 * @description
 * Renders tags as bordered pills with decorative catalogue icons when available. With a `limit`, the
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
      @for (tag of shown(); track tag.key) {
        <li
          class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 font-mono text-xs leading-4 text-fg-muted"
        >
          <content-tech-icon class="size-3.5" [tech]="tag.key" />
          {{ tag.label }}
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
  /** Explicit article tags take precedence over technology keys from older snapshots. */
  public readonly tags: InputSignal<readonly ArticleTerm[] | undefined> =
    input<readonly ArticleTerm[]>();

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys rendered in the order provided by the caller.
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly techs: InputSignal<readonly string[]> = input<readonly string[]>([]);

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

  private readonly terms: Signal<readonly ArticleTerm[]> = computed(() => {
    const tags: readonly ArticleTerm[] | undefined = this.tags();
    return tags === undefined
      ? this.techs().map((key) => ({ key, label: techDefinition(key).label }))
      : publicationTags(tags, this.techs());
  });

  protected readonly shown: Signal<readonly ArticleTerm[]> = computed(() => {
    const terms: readonly ArticleTerm[] = this.terms();
    const limit: number | null = this.limit();
    return limit === null ? terms : terms.slice(0, limit);
  });

  /**
   * Property rest
   * @readonly
   *
   * @description
   * Count and accessible description of the tags left out, or `null` when all show.
   *
   * @type {Signal<{ readonly count: number; readonly label: string } | null>}
   */
  protected readonly rest: Signal<{ readonly count: number; readonly label: string } | null> =
    computed<{ readonly count: number; readonly label: string } | null>(() => {
      const hidden: readonly ArticleTerm[] = this.terms().slice(this.shown().length);
      if (hidden.length === 0) return null;
      const names: string = hidden.map((tag): string => tag.label).join(', ');
      return {
        count: hidden.length,
        label: $localize`:@@tech.more:et ${hidden.length}:COUNT: autres : ${names}:NAMES:`,
      };
    });

  // #endregion
}
