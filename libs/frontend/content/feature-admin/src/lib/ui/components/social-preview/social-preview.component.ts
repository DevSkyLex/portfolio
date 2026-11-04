import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideImage } from '@ng-icons/lucide';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { SocialPreview } from '@internal/content-web-feature-admin/lib/models/social-preview/social-preview.interface';

/**
 * Component SocialPreviewComponent
 * @class SocialPreviewComponent
 *
 * @description
 * « Aperçu sur les réseaux sociaux »: the project page as a generic link card (a 1.91:1 cover or a
 * neutral placeholder, then the domain, title and description), in neutral colours and without any
 * network's branding (D41). It sits beside « Aperçu dans Google » and shares its frame.
 */
@Component({
  selector: 'content-social-preview',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0' },
  template: `
    <figure
      class="flex w-full min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface-raised px-4 py-3.5"
      data-slot="social-preview"
      [attr.aria-labelledby]="captionId()"
    >
      <figcaption
        class="mb-2 text-[12px]/4 font-medium text-fg-faint"
        i18n="@@admin.project.seo.socialPreview"
        [id]="captionId()"
      >
        Aperçu sur les réseaux sociaux
      </figcaption>
      <div
        class="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface"
        [attr.lang]="language()"
      >
        @if (preview().image; as image) {
          <img
            class="aspect-[1.91/1] w-full bg-surface-sunk object-cover"
            data-slot="social-preview-image"
            [src]="image.src"
            [alt]="image.alt"
          />
        } @else {
          <div
            class="grid aspect-[1.91/1] w-full place-items-center bg-surface-sunk text-fg-faint"
            data-slot="social-preview-placeholder"
            aria-hidden="true"
          >
            <ng-icon [svg]="icons.image" size="24" />
          </div>
        }
        <div class="flex min-w-0 flex-col gap-0.5 border-t border-border px-3 py-2.5">
          <span
            class="truncate text-[12px]/4 text-fg-faint"
            data-slot="social-preview-domain"
            lang="en"
            >{{ preview().domain }}</span
          >
          <span
            class="line-clamp-2 text-[14px]/5 font-semibold text-fg"
            data-slot="social-preview-title"
            >{{ preview().title }}</span
          >
          <span
            class="line-clamp-2 text-[13px]/5 text-fg-muted"
            data-slot="social-preview-description"
            >{{ preview().description }}</span
          >
        </div>
      </div>
    </figure>
  `,
})
export class SocialPreviewComponent {
  // #region Properties
  /**
   * Property preview
   * @readonly
   *
   * @description
   * Card to display.
   *
   * @type {InputSignal<SocialPreview>}
   */
  public readonly preview: InputSignal<SocialPreview> = input.required<SocialPreview>();

  /**
   * Property language
   * @readonly
   *
   * @description
   * Language of the card texts.
   *
   * @type {InputSignal<ContentLocale>}
   */
  public readonly language: InputSignal<ContentLocale> = input<ContentLocale>('fr');

  /**
   * Property captionId
   * @readonly
   *
   * @description
   * Id of the caption naming the figure, unique per language tab.
   *
   * @type {InputSignal<string>}
   */
  public readonly captionId: InputSignal<string> = input.required<string>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Image pictogram of the placeholder shown without cover.
   */
  protected readonly icons: { readonly image: typeof lucideImage } = {
    image: lucideImage,
  } as const;
  // #endregion
}
