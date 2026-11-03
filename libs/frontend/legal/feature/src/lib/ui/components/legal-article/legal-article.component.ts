import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { RevealDirective } from '@vfortin/ui';

/**
 * Component LegalArticleComponent
 * @class LegalArticleComponent
 *
 * @description
 * Provides the shared legal page layout: a home link, animated heading, update date, and constrained
 * article column for section content supplied by each legal page.
 */
@Component({
  selector: 'legal-article',
  imports: [NgIcon, RevealDirective, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="relative pt-6 pb-12">
      <div class="wrap">
        <a
          class="inline-flex min-h-11 items-center gap-2 text-[15px]/5 font-medium text-star-muted hover:text-star"
          routerLink="/"
          ><ng-icon
            [svg]="icons.back"
            size="16"
            strokeWidth="1.5"
            aria-hidden="true"
          /><ng-container i18n="@@legal.back">Accueil</ng-container></a
        >
        <div class="mt-8 flex flex-col gap-4">
          <h1
            class="group overflow-hidden pb-[0.08em] font-display text-[clamp(36px,7cqi,104px)] leading-none font-semibold tracking-[-0.04em] text-star"
            uiReveal
          >
            <span
              class="inline-block transition-transform duration-(--dur-reveal) ease-orbit in-data-js:group-not-data-in:translate-y-[105%] motion-reduce:transition-none"
              >{{ heading() }}</span
            >
          </h1>
          <p class="text-[14px]/5 text-star-muted" i18n="@@legal.updated">
            Dernière mise à jour : 2 novembre 2026
          </p>
        </div>
      </div>
    </section>
    <div class="wrap">
      <article
        class="flex max-w-[760px] flex-col gap-16 pb-40 @max-[768px]:pb-24 [&_a]:text-star [&_a]:underline [&_a]:decoration-line-hover [&_a]:underline-offset-3 [&_a]:transition-[text-decoration-color] [&_a]:duration-150 [&_a]:ease-orbit [&_a:focus-visible]:decoration-current [&_a:hover]:decoration-current [&_dd]:text-star @max-[768px]:[&_dd]:mb-3 [&_dl]:grid [&_dl]:grid-cols-[140px_minmax(0,1fr)] [&_dl]:gap-x-6 [&_dl]:gap-y-2 [&_dl]:text-[16px]/[26px] @max-[768px]:[&_dl]:grid-cols-1 @max-[768px]:[&_dl]:gap-0 [&_dl>div]:contents [&_dt]:text-star-muted [&_h2]:font-display [&_h2]:text-[32px]/[38px] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-star @max-[768px]:[&_h2]:text-[26px]/8 [&_p]:text-[17px]/7 [&_p]:text-star [&_section]:flex [&_section]:flex-col [&_section]:gap-3"
      >
        <ng-content />
      </article>
    </div>
  `,
})
export class LegalArticleComponent {
  // #region Properties
  /**
   * Property heading
   * @readonly
   *
   * @description
   * Required title rendered in the legal page heading.
   *
   * @type {InputSignal<string>}
   */
  public readonly heading: InputSignal<string> = input.required<string>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icon map consumed by the template for the return-to-home link.
   *
   * @type {Readonly<{ back: typeof lucideArrowLeft }>}
   */
  protected readonly icons: { readonly back: typeof lucideArrowLeft } = {
    back: lucideArrowLeft,
  } as const;
  // #endregion
}
