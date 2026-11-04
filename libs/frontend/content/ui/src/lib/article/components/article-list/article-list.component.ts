import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  type InputSignal,
} from '@angular/core';
import type { ArticleList } from '@vfortin/content-web-model';
import { ArticleInlineComponent } from '@internal/content-web-ui/lib/article/components/article-inline/article-inline.component';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

/**
 * Component ArticleListComponent
 * @class ArticleListComponent
 *
 * @description
 * Renders a bullet or ordered list of an article and, recursively, the lists nested in its items. The
 * host stays a block so that a parent can animate it; the list element itself keeps only `li` children.
 */
@Component({
  selector: 'content-article-list',
  // Recursive: nested lists use the same component (forwardRef also serves the JIT test compiler).
  imports: [
    ArticleInlineComponent,
    forwardRef((): typeof ArticleListComponent => ArticleListComponent),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `@let current = list();
    @if (current.ordered) {
      <ol
        [class]="typography.orderedList"
        [attr.start]="current.start === 1 ? null : current.start"
      >
        @for (item of current.items; track $index) {
          <li [class]="typography.orderedItem">
            @for (block of item; track $index) {
              @switch (block.kind) {
                @case ('paragraph') {
                  <p><content-article-inline [nodes]="block.content" /></p>
                }
                @case ('list') {
                  <content-article-list [class]="typography.nestedList" [list]="block" />
                }
              }
            }
          </li>
        }
      </ol>
    } @else {
      <!-- role="list" keeps the list semantics that Safari drops when list-style is none. -->
      <ul [class]="typography.bulletList" role="list">
        @for (item of current.items; track $index) {
          <li [class]="typography.bulletItem">
            @for (block of item; track $index) {
              @switch (block.kind) {
                @case ('paragraph') {
                  <p><content-article-inline [nodes]="block.content" /></p>
                }
                @case ('list') {
                  <content-article-list [class]="typography.nestedList" [list]="block" />
                }
              }
            }
          </li>
        }
      </ul>
    }`,
})
export class ArticleListComponent {
  // #region Properties
  /**
   * Property list
   * @readonly
   *
   * @description
   * List to render with its items.
   *
   * @type {InputSignal<ArticleList>}
   */
  public readonly list: InputSignal<ArticleList> = input.required<ArticleList>();

  /**
   * Property typography
   * @readonly
   *
   * @description
   * Classes of the list nodes, shared with the administrator editor.
   *
   * @type {typeof ARTICLE_TYPOGRAPHY}
   */
  protected readonly typography: typeof ARTICLE_TYPOGRAPHY = ARTICLE_TYPOGRAPHY;
  // #endregion
}
