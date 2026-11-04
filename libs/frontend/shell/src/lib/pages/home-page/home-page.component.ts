import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ContactSectionComponent } from '@vfortin/contact-web-feature';
import { PageSeoService, SiteContentService } from '@vfortin/content-web-data-access';
import { ContentSectionsComponent, HeroSectionComponent } from '@vfortin/content-web-feature';
import { SITE_DESCRIPTION } from '@internal/web-shell/lib/layout/site-layout/constants/site-description.constants';
import { HOME_TITLE } from '@internal/web-shell/lib/pages/home-page/constants/home-title.constants';

/**
 * Component HomePageComponent
 * @class HomePageComponent
 *
 * @description
 * Composes the public hero and content sections with the contact section deferred until it approaches
 * the viewport while preserving prerendered markup for hydration. The contact section receives the
 * public links from the content snapshot, since the contact context reads no content library.
 */
@Component({
  selector: 'app-home-page',
  imports: [ContactSectionComponent, ContentSectionsComponent, HeroSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <content-hero-section />
    <content-sections />
    <!-- Below the fold: prerendered HTML, code (form, HTTP, store) loaded on approach. -->
    @defer (hydrate on viewport) {
      <contact-section [links]="content.profile().links" />
    } @placeholder {
      <div class="min-h-screen scroll-mt-24" id="contact"></div>
    }
  `,
})
export class HomePageComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Snapshot content, read once the public route has loaded it.
   *
   * @type {SiteContentService}
   */
  protected readonly content: SiteContentService = inject<SiteContentService>(SiteContentService);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Writes the canonical, `hreflang` and Open Graph tags of the home page (D42), prerendering included,
   * and removes them when the page leaves.
   */
  public constructor() {
    const seo: PageSeoService = inject<PageSeoService>(PageSeoService);
    seo.website({ title: HOME_TITLE, description: SITE_DESCRIPTION, path: '/' });
    inject<DestroyRef>(DestroyRef).onDestroy((): void => seo.clear());
  }
  // #endregion
}
