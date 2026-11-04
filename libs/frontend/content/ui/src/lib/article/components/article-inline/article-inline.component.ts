import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  type InputSignal,
} from '@angular/core';
import type { ArticleInline } from '@vfortin/content-web-model';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

/**
 * Component ArticleInlineComponent
 * @class ArticleInlineComponent
 *
 * @description
 * Renders the inline tree of a paragraph or subheading, each mark as its own element nested in the
 * order of the tree (D40). Text is interpolated, never parsed as HTML; the template stays on tight
 * lines because any whitespace between the nodes would show up as text.
 */
@Component({
  selector: 'content-article-inline',
  // Recursive: the marks nest the same component (forwardRef also serves the JIT test compiler).
  imports: [forwardRef((): typeof ArticleInlineComponent => ArticleInlineComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (node of nodes(); track $index) {
    @switch (node.kind) {
      @case ('text') {
        <ng-container>{{ node.text }}</ng-container>
      }
      @case ('break') {
        <br />
      }
      @case ('bold') {
        <strong [class]="typography.bold"><content-article-inline [nodes]="node.content" /></strong>
      }
      @case ('italic') {
        <em [class]="typography.italic"><content-article-inline [nodes]="node.content" /></em>
      }
      @case ('code') {
        <code [class]="typography.inlineCode"
          ><content-article-inline [nodes]="node.content"
        /></code>
      }
      @case ('link') {
        <a
          [class]="typography.link"
          [href]="node.href"
          [attr.rel]="node.external ? 'noopener noreferrer' : null"
          ><content-article-inline [nodes]="node.content"
        /></a>
      }
    }
  }`,
})
export class ArticleInlineComponent {
  // #region Properties
  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Inline nodes to render, in reading order.
   *
   * @type {InputSignal<readonly ArticleInline[]>}
   */
  public readonly nodes: InputSignal<readonly ArticleInline[]> =
    input.required<readonly ArticleInline[]>();

  /**
   * Property typography
   * @readonly
   *
   * @description
   * Classes of the marks, shared with the administrator editor.
   *
   * @type {typeof ARTICLE_TYPOGRAPHY}
   */
  protected readonly typography: typeof ARTICLE_TYPOGRAPHY = ARTICLE_TYPOGRAPHY;
  // #endregion
}
