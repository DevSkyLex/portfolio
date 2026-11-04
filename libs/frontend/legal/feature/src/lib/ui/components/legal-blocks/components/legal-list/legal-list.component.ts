import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  type InputSignal,
} from '@angular/core';
import type { LegalList } from '@internal/legal-web-feature/lib/models/legal-document/legal-list.interface';
import { LegalInlineComponent } from '@internal/legal-web-feature/lib/ui/components/legal-blocks/components/legal-inline/legal-inline.component';

/**
 * Component LegalListComponent
 * @class LegalListComponent
 *
 * @description
 * Renders a bullet or ordered list of a legal document, nested lists included.
 */
@Component({
  selector: 'legal-list',
  // Recursive: nested lists use the same component (forwardRef also serves the JIT test compiler).
  imports: [LegalInlineComponent, forwardRef((): typeof LegalListComponent => LegalListComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `@let current = list();
    @if (current.ordered) {
      <ol
        class="flex list-decimal flex-col gap-2 pl-6 text-[17px]/7 text-fg marker:text-fg-muted"
        [attr.start]="current.start === 1 ? null : current.start"
      >
        @for (item of current.items; track $index) {
          <li class="pl-1">
            @for (block of item; track $index) {
              @switch (block.kind) {
                @case ('paragraph') {
                  <p><legal-inline [nodes]="block.content" /></p>
                }
                @case ('list') {
                  <legal-list class="mt-2" [list]="block" />
                }
              }
            }
          </li>
        }
      </ol>
    } @else {
      <!-- role="list" keeps the list semantics that Safari drops when list-style is none. -->
      <ul class="flex flex-col gap-2 text-[17px]/7 text-fg" role="list">
        @for (item of current.items; track $index) {
          <li
            class="relative pl-[22px] before:absolute before:top-[12px] before:left-0.5 before:size-1.5 before:bg-aurora-violet"
          >
            @for (block of item; track $index) {
              @switch (block.kind) {
                @case ('paragraph') {
                  <p><legal-inline [nodes]="block.content" /></p>
                }
                @case ('list') {
                  <legal-list class="mt-2" [list]="block" />
                }
              }
            }
          </li>
        }
      </ul>
    }`,
})
export class LegalListComponent {
  // #region Properties
  /**
   * Property list
   * @readonly
   *
   * @description
   * List to render.
   *
   * @type {InputSignal<LegalList>}
   */
  public readonly list: InputSignal<LegalList> = input.required<LegalList>();
  // #endregion
}
