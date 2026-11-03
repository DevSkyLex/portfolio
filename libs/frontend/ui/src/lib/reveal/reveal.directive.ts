import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Directive RevealDirective
 * @class RevealDirective
 *
 * @description
 * Observes the host with a 12% intersection threshold and marks it visible on the first intersecting callback. Browser
 * work starts after rendering; reduced motion and browsers without `IntersectionObserver` expose the host immediately.
 */
@Directive({ selector: '[uiReveal]' })
export class RevealDirective {
  // #region Properties
  /**
   * Property element
   * @readonly
   *
   * @description
   * Native host element receiving the `data-in` state consumed by reveal styles.
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
   * Defers viewport observation until the browser's next render and releases the observer with the directive.
   */
  public constructor() {
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const reduced: boolean =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (reduced || typeof IntersectionObserver === 'undefined') {
        this.element.setAttribute('data-in', '');
        return;
      }
      const observer: IntersectionObserver = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]): void => {
          if (entries.some((entry: IntersectionObserverEntry): boolean => entry.isIntersecting)) {
            this.element.setAttribute('data-in', '');
            observer.disconnect();
          }
        },
        { threshold: 0.12 },
      );
      observer.observe(this.element);
      destroyRef.onDestroy((): void => observer.disconnect());
    });
  }
  // #endregion
}
