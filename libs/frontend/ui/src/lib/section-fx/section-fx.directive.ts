import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { ScrollFrameService } from '@internal/ui/lib/scroll-frame/scroll-frame.service';
import { sectionProgress } from '@internal/ui/lib/section-fx/utils/section-fx/section-fx.utils';

/**
 * Directive SectionFxDirective
 * @class SectionFxDirective
 *
 * @description
 * Publishes section entry and exit progress as host custom properties while scrolling is meaningful and motion is
 * allowed. Removes the marker and properties when the page or viewport no longer supports the effect.
 */
@Directive({ selector: '[uiSectionFx]' })
export class SectionFxDirective {
  // #region Properties
  /**
   * Property element
   * @readonly
   *
   * @description
   * Native host receiving the section effect marker and progress custom properties.
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
   * Registers shared-frame updates after rendering and releases the scroll task when the directive is destroyed.
   */
  public constructor() {
    const frames: ScrollFrameService = inject<ScrollFrameService>(ScrollFrameService);
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const view: (Window & typeof globalThis) | null = this.element.ownerDocument.defaultView;
      if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const root: HTMLElement = this.element.ownerDocument.documentElement;
      const style: CSSStyleDeclaration = this.element.style;
      let live: boolean = false;
      let next: { in: string; out: string } | null = null;
      const remove: () => void = frames.add({
        read: (): void => {
          const vh: number = view.innerHeight;
          if (vh >= 1600 || root.scrollHeight - vh <= 40) {
            next = null;
            return;
          }
          const progress: { in: number; out: number } = sectionProgress(
            this.element.getBoundingClientRect(),
            vh,
          );
          next = { in: progress.in.toFixed(3), out: progress.out.toFixed(3) };
        },
        write: (): boolean => {
          if (!next) {
            if (!live) return false;
            live = false;
            this.element.removeAttribute('data-secfx');
            style.removeProperty('--in');
            style.removeProperty('--out');
            return true;
          }
          if (!live) {
            live = true;
            this.element.setAttribute('data-secfx', '');
          } else if (
            style.getPropertyValue('--in') === next.in &&
            style.getPropertyValue('--out') === next.out
          )
            return false;
          style.setProperty('--in', next.in);
          style.setProperty('--out', next.out);
          return true;
        },
      });
      destroyRef.onDestroy(remove);
    });
  }
  // #endregion
}
