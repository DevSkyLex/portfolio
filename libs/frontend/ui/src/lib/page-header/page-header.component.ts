import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Component PageHeaderComponent
 * @class PageHeaderComponent
 *
 * @description
 * Title band of an application page, below its navigation bar: the `uiPageHeaderTitle` heading and
 * its `uiPageHeaderMeta` lines on the left, the `uiPageHeaderActions` of the page on the right, and
 * optional `uiPageHeaderTabs` underneath, whose underline rests on the band's hairline. When the title
 * and the actions no longer fit side by side, the actions wrap under the title, left-aligned; the inset
 * narrows below a 640 px container, as the admin pages do. The band keeps the page surface:
 * only the hairline separates it from the content (D36, D41). It renders no text of its own.
 */
@Component({
  selector: 'ui-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'page-header' },
  template: `
    <div class="flex flex-wrap items-start gap-x-6 gap-y-3 px-6 pt-5 pb-4 @max-[640px]:px-4">
      <div class="flex min-w-0 flex-[1_1_20rem] flex-col gap-1.5">
        <ng-content select="[uiPageHeaderTitle]" />
        <ng-content select="[uiPageHeaderMeta]" />
      </div>
      <ng-content select="[uiPageHeaderActions]" />
    </div>
    <ng-content select="[uiPageHeaderTabs]" />
    <ng-content />
  `,
})
export class PageHeaderComponent {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the band layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Hairline band on the page surface.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('block border-b border-border bg-surface', this.class()),
  );
  // #endregion
}
