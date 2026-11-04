import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { ArticleBlock, ProjectImage } from '@vfortin/content-web-model';
import { RevealDirective } from '@vfortin/ui';
import { ArticleCodeComponent } from '@internal/content-web-ui/lib/article/components/article-code/article-code.component';
import { ArticleInlineComponent } from '@internal/content-web-ui/lib/article/components/article-inline/article-inline.component';
import { ArticleListComponent } from '@internal/content-web-ui/lib/article/components/article-list/article-list.component';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';
import { imageSrcset } from '@internal/content-web-ui/lib/article/utils/image-srcset/image-srcset.utils';

/**
 * Component ArticleBlocksComponent
 * @class ArticleBlocksComponent
 *
 * @description
 * Renders the top-level blocks of an article document (D40) with the classes of `ARTICLE_TYPOGRAPHY`,
 * without `innerHTML`. Every block carries `uiReveal` and the `reveal` classes, so the page reveals
 * them one by one. The host is `display: contents`: the blocks join the parent's flow and gap.
 */
@Component({
  selector: 'content-article-blocks',
  imports: [ArticleCodeComponent, ArticleInlineComponent, ArticleListComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `@for (block of blocks(); track $index) {
    @switch (block.kind) {
      @case ('paragraph') {
        <p [class]="typography.paragraph + ' ' + reveal()" uiReveal>
          <content-article-inline [nodes]="block.content" />
        </p>
      }
      @case ('subheading') {
        <h3 [class]="typography.h3 + ' ' + reveal()" uiReveal>
          <content-article-inline [nodes]="block.content" />
        </h3>
      }
      @case ('list') {
        <content-article-list [class]="reveal()" [list]="block" uiReveal />
      }
      @case ('blockquote') {
        <blockquote [class]="typography.blockquote + ' ' + reveal()" uiReveal>
          @for (child of block.blocks; track $index) {
            @switch (child.kind) {
              @case ('paragraph') {
                <p><content-article-inline [nodes]="child.content" /></p>
              }
              @case ('list') {
                <content-article-list [list]="child" />
              }
            }
          }
        </blockquote>
      }
      @case ('code') {
        <content-article-code
          [class]="typography.codeFrame + ' ' + reveal()"
          [code]="block"
          uiReveal
        />
      }
      @case ('rule') {
        <hr [class]="typography.horizontalRule + ' ' + reveal()" uiReveal />
      }
      @case ('figure') {
        <figure [class]="typography.figure + ' ' + reveal()" uiReveal>
          <img
            [class]="typography.image"
            [src]="block.image.src"
            [attr.srcset]="srcset(block.image)"
            [attr.sizes]="block.image.small === null ? null : sizes"
            [width]="block.image.width"
            [height]="block.image.height"
            [alt]="block.image.alt"
            loading="lazy"
            decoding="async"
          />
          @if (block.caption) {
            <figcaption [class]="typography.caption">{{ block.caption }}</figcaption>
          }
        </figure>
      }
    }
  }`,
})
export class ArticleBlocksComponent {
  // #region Properties
  /**
   * Property blocks
   * @readonly
   *
   * @description
   * Top-level blocks to render, in document order.
   *
   * @type {InputSignal<readonly ArticleBlock[]>}
   */
  public readonly blocks: InputSignal<readonly ArticleBlock[]> =
    input.required<readonly ArticleBlock[]>();

  /**
   * Property reveal
   * @readonly
   *
   * @description
   * Literal classes of the page's one-time scroll reveal, driven by `uiReveal` and its `data-in`
   * state; empty for a static rendering.
   *
   * @type {InputSignal<string>}
   */
  public readonly reveal: InputSignal<string> = input<string>('');

  /**
   * Property typography
   * @readonly
   *
   * @description
   * Classes of the article nodes, shared with the administrator editor.
   *
   * @type {typeof ARTICLE_TYPOGRAPHY}
   */
  protected readonly typography: typeof ARTICLE_TYPOGRAPHY = ARTICLE_TYPOGRAPHY;

  /**
   * Property sizes
   * @readonly
   *
   * @description
   * Rendered width of a figure: the article column beside the table of contents (1200 px page column
   * minus the 220 px contents and the 64 px gap) from 1024 px, the viewport below.
   *
   * @type {string}
   */
  protected readonly sizes: string = '(min-width: 1024px) 916px, 100vw';
  // #endregion

  // #region Methods
  /**
   * Method srcset
   * @method srcset
   *
   * @description
   * Lists the renditions of a figure image.
   *
   * @param {ProjectImage} image - Figure image.
   *
   * @returns {string | null} `srcset` value, or `null` without a 960 px rendition.
   */
  protected srcset(image: ProjectImage): string | null {
    return imageSrcset(image);
  }
  // #endregion
}
