import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  contentChild,
  contentChildren,
  forwardRef,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { CarouselOrientation } from '@internal/ui/lib/carousel/models/carousel/carousel-orientation.type';
import { navButtonClass } from '@internal/ui/lib/carousel/constants/carousel.constants';

/**
 * Directive CarouselDirective
 * @class CarouselDirective
 *
 * @description
 * Provides a labelled, non-rotating carousel region. Native CSS scroll snap handles slide layout while arrow keys and controls advance one slide at a time.
 */
@Directive({
  selector: '[uiCarousel]',
  exportAs: 'uiCarousel',
  host: {
    role: 'region',
    'aria-roledescription': 'carousel',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
    'data-slot': 'carousel',
    '[attr.data-orientation]': 'orientation()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class CarouselDirective {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Axis used for scroll measurements, keyboard mapping and control icon orientation; defaults to horizontal.
   *
   * @type {InputSignal<CarouselOrientation>}
   */
  public readonly orientation: InputSignal<CarouselOrientation> =
    input<CarouselOrientation>('horizontal');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the carousel region, defaulting to the French localized label.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.carousel.label:Carrousel`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the carousel host's positioning style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property content
   * @readonly
   *
   * @description
   * Descendant viewport directive used to measure and scroll the visible track.
   *
   * @type {Signal<CarouselContentDirective | undefined>}
   */
  private readonly content: Signal<CarouselContentDirective | undefined> =
    contentChild<CarouselContentDirective>(
      forwardRef(() => CarouselContentDirective),
      {
        descendants: true,
      },
    );

  /**
   * Property items
   * @readonly
   *
   * @description
   * Descendant slides in render order, used to calculate the next unaligned slide offset and accessible positions.
   *
   * @type {Signal<readonly CarouselItemDirective[]>}
   */
  public readonly items: Signal<readonly CarouselItemDirective[]> =
    contentChildren<CarouselItemDirective>(
      forwardRef(() => CarouselItemDirective),
      {
        descendants: true,
      },
    );

  /**
   * Property canScrollPrev
   * @readonly
   *
   * @description
   * Whether the viewport has more than one pixel of scrollable content before its current position.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly canScrollPrev: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canScrollNext
   * @readonly
   *
   * @description
   * Whether the viewport has more than one pixel of scrollable content after its current position.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly canScrollNext: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Injected document used to access the current window's computed direction and motion preference.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged caller classes and the relative positioning needed by carousel controls.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() => cn('relative', this.class()));
  // #endregion

  // #region Methods
  /**
   * Method scrollPrev
   * @method scrollPrev
   *
   * @description
   * Advances to the nearest slide offset before the current viewport position.
   *
   * @returns {void} Completes after attempting previous-slide navigation.
   */
  public scrollPrev(): void {
    this.step(-1);
  }

  /**
   * Method scrollNext
   * @method scrollNext
   *
   * @description
   * Advances to the nearest slide offset after the current viewport position.
   *
   * @returns {void} Completes after attempting next-slide navigation.
   */
  public scrollNext(): void {
    this.step(1);
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Recomputes whether the viewport can scroll in either direction from its current scroll offset.
   *
   * @returns {void}
   */
  public update(): void {
    const viewport: HTMLElement | undefined = this.content()?.element;
    if (!viewport) return;
    if (this.orientation() === 'horizontal') {
      const position: number = Math.abs(viewport.scrollLeft);
      this.canScrollPrev.set(position > 1);
      this.canScrollNext.set(position + viewport.clientWidth < viewport.scrollWidth - 1);
    } else {
      this.canScrollPrev.set(viewport.scrollTop > 1);
      this.canScrollNext.set(
        viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1,
      );
    }
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Maps orientation-aware arrow keys to previous and next navigation, reversing horizontal direction in RTL. Editable descendants keep their native arrow-key behavior.
   *
   * @param {KeyboardEvent} event - Keydown event received by the carousel region.
   *
   * @returns {void} Completes after navigation or leaves the event untouched when no carousel key applies.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const target: HTMLElement = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    const horizontal: boolean = this.orientation() === 'horizontal';
    const rtl: boolean = horizontal && this.isRtl();
    const keys: { prev: string; next: string } = horizontal
      ? rtl
        ? { prev: 'ArrowRight', next: 'ArrowLeft' }
        : { prev: 'ArrowLeft', next: 'ArrowRight' }
      : { prev: 'ArrowUp', next: 'ArrowDown' };
    if (event.key === keys.prev) this.scrollPrev();
    else if (event.key === keys.next) this.scrollNext();
    else return;
    event.preventDefault();
  }

  /**
   * Method step
   * @method step
   *
   * @description
   * Scrolls by the nearest unaligned item offset in the requested direction, respecting horizontal
   * RTL layout and reduced-motion preferences.
   *
   * @param {1 | -1} direction - Positive for next, negative for previous.
   *
   * @returns {void}
   */
  private step(direction: 1 | -1): void {
    const viewport: HTMLElement | undefined = this.content()?.element;
    if (!viewport) return;
    const horizontal: boolean = this.orientation() === 'horizontal';
    const rtl: boolean = horizontal && this.isRtl();
    const box: DOMRect = viewport.getBoundingClientRect();
    const offsets: number[] = this.items().map((item) => {
      const rect: DOMRect = item.element.getBoundingClientRect();
      if (!horizontal) return rect.top - box.top;
      return rtl ? box.right - rect.right : rect.left - box.left;
    });
    const candidates: number[] =
      direction > 0 ? offsets.filter((offset) => offset > 1) : offsets.filter((o) => o < -1);
    if (!candidates.length) return;
    const offset: number = direction > 0 ? Math.min(...candidates) : Math.max(...candidates);
    const reduced: boolean =
      this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    if (horizontal) viewport.scrollBy({ left: rtl ? -offset : offset, behavior });
    else viewport.scrollBy({ top: offset, behavior });
  }

  /**
   * Method isRtl
   * @method isRtl
   *
   * @description
   * Reads the viewport's computed direction from the current document window; missing viewport or window defaults to left-to-right behavior.
   *
   * @returns {boolean} Whether the viewport is rendered right-to-left.
   */
  private isRtl(): boolean {
    const viewport: HTMLElement | undefined = this.content()?.element;
    const view: (Window & typeof globalThis) | null = this.document.defaultView;
    return !!viewport && !!view && view.getComputedStyle(viewport).direction === 'rtl';
  }
  // #endregion
}

/**
 * Directive CarouselContentDirective
 * @class CarouselContentDirective
 *
 * @description
 * Marks the scrollable carousel track and updates its owning carousel after scrolling, rendering and resize changes.
 */
@Directive({
  selector: '[uiCarouselContent]',
  host: {
    '[class]': 'classes()',
    'data-slot': 'carousel-content',
    '(scroll)': 'carousel.update()',
  },
})
export class CarouselContentDirective {
  // #region Properties
  /**
   * Property carousel
   * @readonly
   *
   * @description
   * Owning carousel directive used to recalculate previous and next control availability.
   *
   * @type {CarouselDirective}
   */
  protected readonly carousel: CarouselDirective = inject<CarouselDirective>(CarouselDirective);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native viewport element measured by the carousel and used as the scroll target.
   *
   * @type {HTMLElement}
   */
  public readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the orientation-specific overflow and scroll-snap layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged viewport layout and caller classes applied to the track host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex [scrollbar-width:none] gap-4 overscroll-contain [&::-webkit-scrollbar]:hidden',
      'scroll-smooth motion-reduce:scroll-auto',
      this.carousel.orientation() === 'horizontal'
        ? 'snap-x snap-mandatory overflow-x-auto overflow-y-hidden'
        : 'snap-y snap-mandatory flex-col overflow-x-hidden overflow-y-auto',
      this.class(),
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Schedules an initial measurement after rendering and observes viewport resizes when `ResizeObserver` is available. The observer is disconnected with the directive's destroy lifecycle.
   */
  public constructor() {
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender(() => {
      this.carousel.update();
      if (typeof ResizeObserver === 'undefined') return;
      const observer: ResizeObserver = new ResizeObserver(() => this.carousel.update());
      observer.observe(this.element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
  // #endregion
}

/**
 * Directive CarouselItemDirective
 * @class CarouselItemDirective
 *
 * @description
 * Marks one slide as an accessible group; the caller's width utility controls how many slides fit in the viewport.
 */
@Directive({
  selector: '[uiCarouselItem]',
  host: {
    role: 'group',
    'aria-roledescription': 'slide',
    '[attr.aria-label]': 'ariaLabel()',
    '[class]': 'classes()',
    'data-slot': 'carousel-item',
  },
})
export class CarouselItemDirective {
  // #region Properties
  /**
   * Property carousel
   * @readonly
   *
   * @description
   * Owning carousel used to derive this slide's position and total count.
   *
   * @type {CarouselDirective}
   */
  private readonly carousel: CarouselDirective = inject<CarouselDirective>(CarouselDirective);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native slide element measured by the carousel for navigation offsets.
   *
   * @type {HTMLElement}
   */
  public readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional caller-provided accessible name; when omitted, the slide receives its localized position and total count.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the slide's shrink, snap and basis styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Uses the explicit slide label when provided; otherwise derives a one-based position and total from the owning carousel.
   *
   * @type {Signal<string>}
   */
  protected readonly ariaLabel: Signal<string> = computed<string>(() => {
    const label: string | undefined = this.label();
    if (label) return label;
    const items: readonly CarouselItemDirective[] = this.carousel.items();
    const index: number = items.indexOf(this) + 1;
    return $localize`:@@ui.carousel.slide:${index}:INDEX: sur ${items.length}:TOTAL:`;
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged slide layout and caller classes applied to the slide host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('min-w-0 shrink-0 grow-0 basis-full snap-start', this.class()),
  );
  // #endregion
}

/**
 * Component CarouselPreviousComponent
 * @class CarouselPreviousComponent
 *
 * @description
 * Renders a previous-slide control that disables when the viewport is at its beginning.
 */
@Component({
  selector: 'ui-carousel-previous',
  imports: [ButtonDirective, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'carousel-previous' },
  template: `<button
    uiBtn
    type="button"
    variant="secondary"
    size="sm"
    [class]="buttonClass"
    [attr.aria-label]="label()"
    [disabled]="!carousel.canScrollPrev()"
    (click)="carousel.scrollPrev()"
  >
    <ng-icon
      [svg]="icons.arrow"
      size="16"
      aria-hidden="true"
      [class]="carousel.orientation() === 'vertical' ? 'rotate-90' : 'rtl:-scale-x-100'"
    />
  </button>`,
})
export class CarouselPreviousComponent {
  // #region Properties
  /**
   * Property carousel
   * @readonly
   *
   * @description
   * Owning carousel directive providing scroll state and previous-slide navigation.
   *
   * @type {CarouselDirective}
   */
  protected readonly carousel: CarouselDirective = inject<CarouselDirective>(CarouselDirective);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide left-arrow icon displayed by the previous control.
   *
   * @type {{ readonly arrow: typeof lucideArrowLeft }}
   */
  protected readonly icons: { readonly arrow: typeof lucideArrowLeft } = {
    arrow: lucideArrowLeft,
  } as const;

  /**
   * Property buttonClass
   * @readonly
   *
   * @description
   * Shared compact width and padding applied to the native button.
   *
   * @type {string}
   */
  protected readonly buttonClass: string = navButtonClass;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible button name, defaulting to the French localized previous-slide text.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.carousel.previous:Diapositive précédente`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the component's inline-flex host layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged caller classes applied to the component host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex', this.class()),
  );
  // #endregion
}

/**
 * Component CarouselNextComponent
 * @class CarouselNextComponent
 *
 * @description
 * Renders a next-slide control that disables when the viewport is at its end.
 */
@Component({
  selector: 'ui-carousel-next',
  imports: [ButtonDirective, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'carousel-next' },
  template: `<button
    uiBtn
    type="button"
    variant="secondary"
    size="sm"
    [class]="buttonClass"
    [attr.aria-label]="label()"
    [disabled]="!carousel.canScrollNext()"
    (click)="carousel.scrollNext()"
  >
    <ng-icon
      [svg]="icons.arrow"
      size="16"
      aria-hidden="true"
      [class]="carousel.orientation() === 'vertical' ? 'rotate-90' : 'rtl:-scale-x-100'"
    />
  </button>`,
})
export class CarouselNextComponent {
  // #region Properties
  /**
   * Property carousel
   * @readonly
   *
   * @description
   * Owning carousel directive providing scroll state and next-slide navigation.
   *
   * @type {CarouselDirective}
   */
  protected readonly carousel: CarouselDirective = inject<CarouselDirective>(CarouselDirective);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide right-arrow icon displayed by the next control.
   *
   * @type {{ readonly arrow: typeof lucideArrowRight }}
   */
  protected readonly icons: { readonly arrow: typeof lucideArrowRight } = {
    arrow: lucideArrowRight,
  } as const;

  /**
   * Property buttonClass
   * @readonly
   *
   * @description
   * Shared compact width and padding applied to the native button.
   *
   * @type {string}
   */
  protected readonly buttonClass: string = navButtonClass;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible button name, defaulting to the French localized next-slide text.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.carousel.next:Diapositive suivante`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the component's inline-flex host layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged caller classes applied to the component host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('inline-flex', this.class()),
  );
  // #endregion
}
