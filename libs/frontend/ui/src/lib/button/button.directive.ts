import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type ButtonSize,
  type ButtonVariant,
  buttonVariants,
} from '@internal/ui/lib/button/constants/button.variants';

/**
 * Directive ButtonDirective
 * @class ButtonDirective
 *
 * @description
 * Applies Orbite variant and size styles to a native button or link and triggers a point-origin
 * ripple for pointer, Enter, and Space activation when motion is permitted.
 */
@Directive({
  selector: 'button[uiBtn], a[uiBtn]',
  host: {
    '[class]': 'classes()',
    'data-slot': 'button',
    '(pointerdown)': 'ripple($event)',
    '(keydown.enter)': 'ripple()',
    '(keydown.space)': 'ripple()',
  },
})
export class ButtonDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Semantic appearance selected from the supported button variants.
   *
   * @type {InputSignal<ButtonVariant>}
   */
  public readonly variant: InputSignal<ButtonVariant> = input<ButtonVariant>('primary');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Height and horizontal padding selected from the supported button sizes.
   *
   * @type {InputSignal<ButtonSize>}
   */
  public readonly size: InputSignal<ButtonSize> = input<ButtonSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged after the selected variant and size classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native button or anchor receiving ripple styles and pointer-relative coordinates.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Classes produced by the selected variant and size together with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(buttonVariants({ variant: this.variant(), size: this.size() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method ripple
   * @method ripple
   *
   * @description
   * Animates the pseudo-element from the pointer position or button center when Web Animations are
   * available and reduced motion is not requested. Missing browser animation support skips feedback.
   *
   * @param {Event} event - Optional pointer event used to locate the ripple origin.
   *
   * @returns {void}
   */
  protected ripple(event?: Event): void {
    const view: (Window & typeof globalThis) | null = this.element.ownerDocument.defaultView;
    if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof this.element.animate !== 'function') return;
    const box: DOMRect = this.element.getBoundingClientRect();
    const pointer: PointerEvent | undefined = event as PointerEvent | undefined;
    const x: number = pointer ? pointer.clientX - box.left : box.width / 2;
    const y: number = pointer ? pointer.clientY - box.top : box.height / 2;
    const size: number = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y)) * 2;
    this.element.style.setProperty('--rx', `${x.toFixed(1)}px`);
    this.element.style.setProperty('--ry', `${y.toFixed(1)}px`);
    this.element.style.setProperty('--rs', `${size.toFixed(1)}px`);
    this.element.animate(
      [
        { opacity: 0.28, scale: 0 },
        { opacity: 0, scale: 1 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::after' },
    );
  }
  // #endregion
}
