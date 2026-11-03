import { ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Function injectCascadeIndex
 *
 * @description
 * Assigns the row's zero-based position among menu items to `--i` after rendering so the cascade
 * animation can read it before its first painted frame.
 *
 * @returns {void} The row receives the CSS custom property after Angular renders.
 */
export function injectCascadeIndex(): void {
  const element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  afterNextRender(() => {
    const rows: NodeListOf<Element> | undefined = element
      .closest('[role="menu"]')
      ?.querySelectorAll('[role^="menuitem"]');
    const index: number = rows ? Array.prototype.indexOf.call(rows, element) : 0;
    element.style.setProperty('--i', String(Math.max(index, 0)));
  });
}
