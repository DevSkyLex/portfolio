import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  type InputSignal,
} from '@angular/core';
import type { LegalInline } from '@internal/legal-web-feature/lib/models/legal-document/legal-inline.type';

/**
 * Component LegalInlineComponent
 * @class LegalInlineComponent
 *
 * @description
 * Renders the inline content of a legal paragraph node by node, without `innerHTML` (D40); the
 * links take the legal article's underline style from their container.
 */
@Component({
  selector: 'legal-inline',
  // Recursive: the marks nest the same component (forwardRef also serves the JIT test compiler).
  imports: [forwardRef((): typeof LegalInlineComponent => LegalInlineComponent)],
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
        <strong class="font-semibold text-fg"><legal-inline [nodes]="node.content" /></strong>
      }
      @case ('italic') {
        <em class="italic"><legal-inline [nodes]="node.content" /></em>
      }
      @case ('code') {
        <code class="rounded-xs bg-surface-raised px-1.5 py-0.5 font-mono text-[0.85em] text-fg"
          ><legal-inline [nodes]="node.content"
        /></code>
      }
      @case ('link') {
        <a [href]="node.href" [attr.rel]="node.external ? 'noopener noreferrer' : null"
          ><legal-inline [nodes]="node.content"
        /></a>
      }
    }
  }`,
})
export class LegalInlineComponent {
  // #region Properties
  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Inline nodes to render, in order.
   *
   * @type {InputSignal<readonly LegalInline[]>}
   */
  public readonly nodes: InputSignal<readonly LegalInline[]> =
    input.required<readonly LegalInline[]>();
  // #endregion
}
