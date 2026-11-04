import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { LegalBlock } from '@internal/legal-web-feature/lib/models/legal-document/legal-block.type';
import { LegalInlineComponent } from '@internal/legal-web-feature/lib/ui/components/legal-blocks/components/legal-inline/legal-inline.component';
import { LegalListComponent } from '@internal/legal-web-feature/lib/ui/components/legal-blocks/components/legal-list/legal-list.component';

/**
 * Component LegalBlocksComponent
 * @class LegalBlocksComponent
 *
 * @description
 * Renders the blocks of a legal document section node by node (a recursive `@switch`, never
 * `innerHTML`, D40). Paragraphs, headings and links take the legal article's typography from its
 * container; the host is `display: contents`, so the blocks join the section's flow and gap.
 */
@Component({
  selector: 'legal-blocks',
  imports: [LegalInlineComponent, LegalListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `@for (block of blocks(); track $index) {
    @switch (block.kind) {
      @case ('paragraph') {
        <p><legal-inline [nodes]="block.content" /></p>
      }
      @case ('subheading') {
        <h3 class="pt-2 font-display text-[22px]/[28px] font-semibold tracking-[-0.01em] text-fg">
          <legal-inline [nodes]="block.content" />
        </h3>
      }
      @case ('list') {
        <legal-list [list]="block" />
      }
      @case ('blockquote') {
        <blockquote class="flex flex-col gap-3 border-l-2 border-border-strong pl-6 text-fg-muted">
          @for (child of block.blocks; track $index) {
            @switch (child.kind) {
              @case ('paragraph') {
                <p><legal-inline [nodes]="child.content" /></p>
              }
              @case ('list') {
                <legal-list [list]="child" />
              }
            }
          }
        </blockquote>
      }
      @case ('code') {
        <pre
          class="overflow-x-auto rounded-xl bg-surface-raised p-5 font-mono text-[13px]/6 text-fg"
        ><code>{{ block.text }}</code></pre>
      }
      @case ('rule') {
        <hr class="my-4 border-0 border-t border-border" />
      }
    }
  }`,
})
export class LegalBlocksComponent {
  // #region Properties
  /**
   * Property blocks
   * @readonly
   *
   * @description
   * Blocks to render, in document order.
   *
   * @type {InputSignal<readonly LegalBlock[]>}
   */
  public readonly blocks: InputSignal<readonly LegalBlock[]> =
    input.required<readonly LegalBlock[]>();
  // #endregion
}
