import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactSectionComponent } from '@vfortin/contact-web-feature';
import { ContentSectionsComponent, HeroSectionComponent } from '@vfortin/content-web-feature';

/**
 * Component HomePageComponent
 * @class HomePageComponent
 *
 * @description
 * Composes the public hero and content sections with the contact section deferred until it approaches
 * the viewport while preserving prerendered markup for hydration.
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
      <contact-section />
    } @placeholder {
      <div class="min-h-screen scroll-mt-24" id="contact"></div>
    }
  `,
})
export class HomePageComponent {}
