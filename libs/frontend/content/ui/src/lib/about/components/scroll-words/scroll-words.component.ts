import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { ScrollFrameService, pageScrolls } from '@vfortin/ui';
import { readingProgress } from '@internal/content-web-ui/lib/about/components/scroll-words/utils/reading-progress/reading-progress.utils';

/**
 * Class ScrollWordsComponent
 * @class ScrollWordsComponent
 *
 * @description
 * Reveals paragraph words progressively while the block crosses the viewport, keeping all words readable when scrolling is unavailable.
 */
@Component({
  selector: 'content-scroll-words',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', role: 'paragraph', '[style.--n]': 'words().length' },
  template: `
    @for (word of words(); track $index) {
      <span
        class="opacity-[clamp(0.42,calc(var(--wp,1)*(var(--n)+3)-var(--k)),1)] transition-opacity duration-240 ease-linear motion-reduce:opacity-100 motion-reduce:transition-none"
        [style.--k]="$index"
        >{{ word }}
      </span>
    }
  `,
})
export class ScrollWordsComponent {
  // #region Properties
  /**
   * Property text
   * @readonly
   *
   * @description
   * Paragraph content split into the words rendered by the template.
   *
   * @type {InputSignal<string>}
   */
  public readonly text: InputSignal<string> = input.required<string>();

  /**
   * Property words
   * @readonly
   *
   * @description
   * Words derived from the input text, preserving its space-separated order.
   *
   * @type {Signal<string[]>}
   */
  protected readonly words: Signal<string[]> = computed<string[]>((): string[] =>
    this.text().split(' '),
  );

  /**
   * Property element
   * @readonly
   *
   * @description
   * Host element whose scroll position controls the CSS reading progress.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers frame reads and writes after render and removes the subscription on destruction.
   */
  public constructor() {
    const frames: ScrollFrameService = inject<ScrollFrameService>(ScrollFrameService);
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const view: (Window & typeof globalThis) | null = this.element.ownerDocument.defaultView;
      if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const root: HTMLElement = this.element.ownerDocument.documentElement;
      let next: string = '1';
      const remove: () => void = frames.add({
        read: (): void => {
          const height: number = view.innerHeight;
          next = pageScrolls(height, root.scrollHeight)
            ? readingProgress(this.element.getBoundingClientRect(), height).toFixed(4)
            : '1';
        },
        write: (): boolean => {
          if (this.element.style.getPropertyValue('--wp') === next) return false;
          this.element.style.setProperty('--wp', next);
          return true;
        },
      });
      destroyRef.onDestroy(remove);
    });
  }
  // #endregion
}
