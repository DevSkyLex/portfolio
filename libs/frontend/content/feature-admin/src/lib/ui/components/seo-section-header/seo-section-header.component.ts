import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component SeoSectionHeaderComponent
 * @class SeoSectionHeaderComponent
 *
 * @description
 * Heading of a section of a « Tableau de bord » tab (D51): its title, which names the section for
 * assistive technologies (`id`, referenced by the section's `aria-labelledby`), and one factual line
 * on what the section shows, over the section's full width and above a hairline.
 */
@Component({
  selector: 'content-seo-section-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-1 border-b border-border px-6 pt-8 pb-4 @max-[640px]:px-4',
  },
  template: `
    <h2 class="text-[15px]/6 font-semibold text-fg" [id]="headingId()">{{ heading() }}</h2>
    <p class="max-w-[80ch] text-[13px]/5 text-fg-muted">{{ description() }}</p>
  `,
})
export class SeoSectionHeaderComponent {
  // #region Properties
  /** Title of the section. */
  public readonly heading: InputSignal<string> = input.required<string>();

  /** What the section shows, in one sentence. */
  public readonly description: InputSignal<string> = input.required<string>();

  /** Id of the title, referenced by the section's `aria-labelledby`. */
  public readonly headingId: InputSignal<string> = input.required<string>();
  // #endregion
}
