import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideInfo,
  lucideTriangleAlert,
  lucideX,
} from '@ng-icons/lucide';
import { buttonVariants } from '@internal/ui/lib/button/constants/button.variants';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { ToastService } from '@internal/ui/lib/sonner/services/toast/toast.service';
import type { Toast } from '@internal/ui/lib/sonner/models/toast/toast.interface';
import type { ToastAction } from '@internal/ui/lib/sonner/models/toast/toast-action.interface';
import { toastVariants } from '@internal/ui/lib/sonner/components/toaster/constants/toast.variants';
import {
  type ToasterPosition,
  toasterVariants,
} from '@internal/ui/lib/sonner/components/toaster/constants/toaster.variants';

/**
 * Component ToasterComponent
 * @class ToasterComponent
 *
 * @description
 * Renders the newest visible toast entries in a labelled region. Normal notices use polite status
 * announcements, errors use assertive alerts, and hover or focus pauses their countdowns.
 */
@Component({
  selector: 'ui-toaster',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toaster.component.html',
  host: {
    role: 'region',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
    'data-slot': 'toaster',
    '(pointerenter)': 'toasts.pause()',
    '(pointerleave)': 'toasts.resume()',
    '(focusin)': 'toasts.pause()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ToasterComponent {
  // #region Properties
  /**
   * Property position
   * @readonly
   *
   * @description
   * Screen position and stack direction of the notification region.
   *
   * @type {InputSignal<ToasterPosition>}
   */
  public readonly position: InputSignal<ToasterPosition> = input<ToasterPosition>('bottom-right');

  /**
   * Property visibleToasts
   * @readonly
   *
   * @description
   * Maximum number of recent toast entries rendered at once; older entries remain queued.
   *
   * @type {InputSignal<number>}
   */
  public readonly visibleToasts: InputSignal<number> = input<number>(3);

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the notifications region.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@ui.sonner.region:Notifications`,
  );

  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * Accessible label applied to each toast dismissal button.
   *
   * @type {InputSignal<string>}
   */
  public readonly closeLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.sonner.close:Fermer la notification`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the selected region position.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Service managing toast entries, lifetimes and pointer/focus pause state.
   *
   * @type {ToastService}
   */
  protected readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Status (success, warning, info, error) and close icons rendered by toast entries.
   *
   * @type {{ readonly success: typeof lucideCircleCheck; readonly warning: typeof lucideTriangleAlert; readonly info: typeof lucideInfo; readonly error: typeof lucideCircleAlert; readonly x: typeof lucideX }}
   */
  protected readonly icons: {
    readonly success: typeof lucideCircleCheck;
    readonly warning: typeof lucideTriangleAlert;
    readonly info: typeof lucideInfo;
    readonly error: typeof lucideCircleAlert;
    readonly x: typeof lucideX;
  } = {
    success: lucideCircleCheck,
    warning: lucideTriangleAlert,
    info: lucideInfo,
    error: lucideCircleAlert,
    x: lucideX,
  } as const;

  /**
   * Property toastClasses
   * @readonly
   *
   * @description
   * Shared surface and entrance classes applied to each toast entry.
   *
   * @type {string}
   */
  protected readonly toastClasses: string = toastVariants();

  /**
   * Property actionClasses
   * @readonly
   *
   * @description
   * Secondary button classes for an optional toast action.
   *
   * @type {string}
   */
  protected readonly actionClasses: string = cn(
    buttonVariants({ variant: 'secondary', size: 'sm' }),
    '-my-1 h-8 shrink-0 px-3',
  );

  /**
   * Property closeClasses
   * @readonly
   *
   * @description
   * Compact ghost button classes for dismissing a toast.
   *
   * @type {string}
   */
  protected readonly closeClasses: string = cn(
    buttonVariants({ variant: 'ghost', size: 'sm' }),
    '-my-1.5 -mr-2 h-8 w-8 shrink-0 px-0',
  );

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Most recent toast entries limited to at least one visible item.
   *
   * @type {Signal<readonly Toast[]>}
   */
  protected readonly visible: Signal<Toast[]> = computed<Toast[]>((): Toast[] =>
    this.toasts.toasts().slice(-Math.max(this.visibleToasts(), 1)),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Region positioning classes merged with caller-provided utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(toasterVariants({ position: this.position() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method act
   * @method act
   *
   * @description
   * Runs the selected action callback and then dismisses its toast.
   *
   * @param {Toast} toast - Toast containing the selected action.
   * @param {ToastAction} action - Callback and label for the activated action.
   * @returns {void}
   */
  protected act(toast: Toast, action: ToastAction): void {
    action.onClick();
    this.toasts.dismiss(toast.id);
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Resumes toast countdowns only when focus leaves the toaster region.
   *
   * @param {FocusEvent} event - Focus transition from within the region.
   * @returns {void}
   */
  protected onFocusOut(event: FocusEvent): void {
    const host: EventTarget | null = event.currentTarget;
    const next: EventTarget | null = event.relatedTarget;
    if (!(host instanceof Node && next instanceof Node && host.contains(next))) {
      this.toasts.resume();
    }
  }
  // #endregion
}
