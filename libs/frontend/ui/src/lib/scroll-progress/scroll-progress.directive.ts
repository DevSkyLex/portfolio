import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { ScrollFrameService } from '@internal/ui/lib/scroll-frame/scroll-frame.service';
import {
  pageScrolls,
  scrollEntry,
  scrollProgress,
} from '@internal/ui/lib/scroll-progress/utils/scroll-progress/scroll-progress.utils';

/**
 * Directive ScrollProgressDirective
 * @class ScrollProgressDirective
 *
 * @description
 * Updates host variables `--p` and `--e` in shared scroll frames when the page scrolls and motion is allowed. The
 * variables remain unset for short pages or reduced-motion preferences so CSS can use its resting-state fallbacks.
 */
@Directive({ selector: '[uiScrollProgress]' })
export class ScrollProgressDirective {
  // #region Properties
  /**
   * Property element
   * @readonly
   *
   * @description
   * Native host receiving the computed scroll progress custom properties.
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
   * Registers the host with the shared scroll frame service after render and releases that registration on destroy.
   */
  public constructor() {
    const frames: ScrollFrameService = inject<ScrollFrameService>(ScrollFrameService);
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const view: (Window & typeof globalThis) | null = this.element.ownerDocument.defaultView;
      if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const root: HTMLElement = this.element.ownerDocument.documentElement;
      const style: CSSStyleDeclaration = this.element.style;
      let next: [string, string] | null = null;
      const remove: () => void = frames.add({
        read: (): void => {
          const vh: number = view.innerHeight;
          if (!pageScrolls(vh, root.scrollHeight)) {
            next = null;
            return;
          }
          const rect: DOMRect = this.element.getBoundingClientRect();
          next = [scrollProgress(rect, vh).toFixed(4), scrollEntry(rect, vh).toFixed(4)];
        },
        write: (): boolean => {
          const p: string = next?.[0] ?? '';
          const e: string = next?.[1] ?? '';
          if (style.getPropertyValue('--p') === p && style.getPropertyValue('--e') === e)
            return false;
          if (next) {
            style.setProperty('--p', p);
            style.setProperty('--e', e);
          } else {
            style.removeProperty('--p');
            style.removeProperty('--e');
          }
          return true;
        },
      });
      destroyRef.onDestroy(remove);
    });
  }
  // #endregion
}
