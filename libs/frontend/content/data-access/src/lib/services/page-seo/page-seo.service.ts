import {
  DOCUMENT,
  Injectable,
  LOCALE_ID,
  RendererFactory2,
  inject,
  type Renderer2,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { ProjectArticle, SiteLocale } from '@vfortin/content-web-model';
import type { PageSeoMetaTag } from '@internal/content-web-data-access/lib/models/page-seo/page-seo-meta-tag.interface';
import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
import { SITE_ORIGIN } from '@internal/content-web-data-access/lib/tokens/site-origin/site-origin.token';
import { jsonLdText } from '@internal/content-web-data-access/lib/utils/json-ld/json-ld.utils';
import {
  PAGE_SEO_REMOVABLE_TAGS,
  metaTagSelector,
  pageSeoMetaTags,
} from '@internal/content-web-data-access/lib/utils/page-seo-meta/page-seo-meta.utils';
import { pageSeo } from '@internal/content-web-data-access/lib/utils/page-seo/page-seo.utils';
import { projectPageSeo } from '@internal/content-web-data-access/lib/utils/project-page-seo/project-page-seo.utils';
import { localeOf } from '@internal/content-web-data-access/lib/utils/site-locale/site-locale.utils';

/**
 * Constant OWNED
 *
 * @description
 * Attribute marking the `link` and `script` elements this service writes in `<head>`; they are
 * replaced on every page, including the copies left by the prerendered HTML.
 */
const OWNED: string = 'data-page-seo';

/**
 * Service PageSeoService
 * @class PageSeoService
 *
 * @description
 * Writes the search and sharing metadata of public pages (D42) through `Title`, `Meta`, `DOCUMENT` and a
 * `Renderer2`, so it runs the same way while prerendering and in the browser: title, description,
 * keywords, canonical and `hreflang` links, Open Graph, Twitter card and a JSON-LD data block. Each
 * call replaces the previous page's tags; `clear` removes them and restores the site description.
 */
@Injectable({ providedIn: 'root' })
export class PageSeoService {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Document title service.
   *
   * @type {Title}
   */
  private readonly title: Title = inject<Title>(Title);

  /**
   * Property meta
   * @readonly
   *
   * @description
   * Meta tag service.
   *
   * @type {Meta}
   */
  private readonly meta: Meta = inject<Meta>(Meta);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Rendered document, the server document while prerendering.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property renderer
   * @readonly
   *
   * @description
   * Renderer setting the attributes and text of the `link` and `script` elements of `<head>`.
   *
   * @type {Renderer2}
   */
  private readonly renderer: Renderer2 = inject<RendererFactory2>(RendererFactory2).createRenderer(
    null,
    null,
  );

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Locale of the build being rendered.
   *
   * @type {SiteLocale}
   */
  private readonly locale: SiteLocale = localeOf(inject<string>(LOCALE_ID));

  /**
   * Property origin
   * @readonly
   *
   * @description
   * Public origin of the absolute addresses.
   *
   * @type {string}
   */
  private readonly origin: string = inject<string>(SITE_ORIGIN);

  /**
   * Property siteDescription
   *
   * @description
   * Description restored when a page with its own metadata leaves, set by the site layout.
   *
   * @type {string | null}
   */
  private siteDescription: string | null = null;
  // #endregion

  // #region Methods
  /**
   * Method setSiteDescription
   * @method setSiteDescription
   *
   * @description
   * Writes the site-wide meta description and keeps it as the value `clear` restores.
   *
   * @param {string} description - Localized site description.
   *
   * @returns {void}
   */
  public setSiteDescription(description: string): void {
    this.siteDescription = description;
    this.meta.updateTag({ name: 'description', content: description });
  }

  /**
   * Method website
   * @method website
   *
   * @description
   * Writes the metadata of a page of type `website` (the home page), without an image or JSON-LD.
   *
   * @param {{ title: string; description: string; path: string }} page - Texts and locale-independent path.
   *
   * @returns {void}
   */
  public website(page: {
    readonly title: string;
    readonly description: string;
    readonly path: string;
  }): void {
    this.apply(
      pageSeo(
        { ...page, type: 'website', image: null, structuredData: null },
        this.locale,
        this.origin,
      ),
    );
  }

  /**
   * Method project
   * @method project
   *
   * @description
   * Writes the metadata of a case study, replacing those of the previous project.
   *
   * @param {ProjectArticle} project - Case study in the active locale.
   *
   * @returns {void}
   */
  public project(project: ProjectArticle): void {
    this.apply(projectPageSeo(project, this.locale, this.origin));
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Removes the canonical, alternate, keywords, social and JSON-LD tags and restores the site
   * description; the next route sets its own title.
   *
   * @returns {void}
   */
  public clear(): void {
    for (const selector of PAGE_SEO_REMOVABLE_TAGS) this.meta.removeTag(selector);
    this.removeOwned();
    if (this.siteDescription !== null) {
      this.meta.updateTag({ name: 'description', content: this.siteDescription });
    }
  }

  /**
   * Method apply
   * @method apply
   *
   * @description
   * Writes resolved metadata, the `<meta>` tags from `pageSeoMetaTags` (shared with the administrator
   * editor's list of generated tags); tags without a value on this page (keywords, image, JSON-LD)
   * are removed.
   *
   * @param {PageSeo} page - Metadata of the page.
   *
   * @returns {void}
   */
  private apply(page: PageSeo): void {
    this.title.setTitle(page.title);
    const tags: readonly PageSeoMetaTag[] = pageSeoMetaTags(page);
    for (const tag of tags) {
      this.meta.updateTag({ [tag.attribute]: tag.key, content: tag.content });
    }
    const written: ReadonlySet<string> = new Set<string>(tags.map(metaTagSelector));
    for (const selector of PAGE_SEO_REMOVABLE_TAGS) {
      if (!written.has(selector)) this.meta.removeTag(selector);
    }

    this.removeOwned();
    this.append('link', { rel: 'canonical', href: page.canonical });
    for (const alternate of page.alternates) {
      this.append('link', { rel: 'alternate', hreflang: alternate.hreflang, href: alternate.href });
    }
    if (page.structuredData) {
      const script: Element = this.append('script', { type: 'application/ld+json' });
      // A data block, never executed: the CSP `script-src 'self'` does not apply to it (D20).
      this.renderer.appendChild(script, this.renderer.createText(jsonLdText(page.structuredData)));
    }
  }

  /**
   * Method append
   * @method append
   *
   * @description
   * Appends an owned element with the given attributes to `<head>`.
   *
   * @param {'link' | 'script'} name - Element name.
   * @param {Readonly<Record<string, string>>} attributes - Attributes to set.
   *
   * @returns {Element} The appended element.
   */
  private append(name: 'link' | 'script', attributes: Readonly<Record<string, string>>): Element {
    const element: HTMLLinkElement | HTMLScriptElement = this.document.createElement(name);
    this.renderer.setAttribute(element, OWNED, '');
    for (const [key, value] of Object.entries(attributes)) {
      this.renderer.setAttribute(element, key, value);
    }
    this.renderer.appendChild(this.document.head, element);
    return element;
  }

  /**
   * Method removeOwned
   * @method removeOwned
   *
   * @description
   * Removes the elements previously written by the service, including those of the prerendered page.
   *
   * @returns {void}
   */
  private removeOwned(): void {
    this.document.head
      .querySelectorAll(`[${OWNED}]`)
      .forEach((element: Element): void => this.renderer.removeChild(this.document.head, element));
  }
  // #endregion
}
