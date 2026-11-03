import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { isPlatformBrowser } from '@angular/common';
import {
  type Signal,
  type WritableSignal,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import type { Countdown } from '@internal/ui/lib/sonner/services/toast/models/countdown.interface';
import type { ToastOptions } from '@internal/ui/lib/sonner/models/toast/toast-options.interface';
import type { ToastType } from '@internal/ui/lib/sonner/models/toast/toast-type.type';
import { TOAST_DURATION } from '@internal/ui/lib/sonner/services/toast/constants/toast.constants';
import type { Toast } from '@internal/ui/lib/sonner/models/toast/toast.interface';

/**
 * Service ToastService
 * @class ToastService
 *
 * @description
 * Stores the toast queue and manages browser-only dismissal timers. The toaster can pause every
 * countdown while hovered or focused, preserving each toast's remaining time.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  // #region Properties
  /**
   * Property ids
   *
   * @description
   * Application-owned sequence for default toast identifiers.
   */
  private readonly ids: RenderIdService = inject<RenderIdService>(RenderIdService);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether automatic dismissal timers may run in this platform.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property list
   * @readonly
   *
   * @description
   * Internal ordered queue of currently visible toast entries.
   *
   * @type {WritableSignal<readonly Toast[]>}
   */
  private readonly list: WritableSignal<readonly Toast[]> = signal<readonly Toast[]>([]);

  /**
   * Property countdowns
   * @readonly
   *
   * @description
   * Remaining-time state indexed by the id of each toast with an active lifetime.
   *
   * @type {Map<string, Countdown>}
   */
  private readonly countdowns: Map<string, Countdown> = new Map<string, Countdown>();

  /**
   * Property paused
   *
   * @description
   * Whether countdowns are frozen because the toaster is hovered or contains focus.
   *
   * @type {boolean}
   */
  private paused: boolean = false;

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Readonly view of the ordered toast queue consumed by the toaster component.
   *
   * @type {Signal<readonly Toast[]>}
   */
  public readonly toasts: Signal<readonly Toast[]> = this.list.asReadonly();
  // #endregion

  // #region Methods
  /**
   * Method show
   * @method show
   *
   * @description
   * Adds a neutral toast and returns its stable identifier.
   *
   * @param {string} message - Primary message displayed by the toast.
   * @param {ToastOptions} options - Optional id, description, lifetime and action.
   * @returns {string} Identifier used to replace or dismiss the toast.
   */
  public show(message: string, options: ToastOptions = {}): string {
    return this.add('default', message, options);
  }

  /**
   * Method success
   * @method success
   *
   * @description
   * Adds a success toast and returns its stable identifier.
   *
   * @param {string} message - Primary message displayed by the toast.
   * @param {ToastOptions} options - Optional id, description, lifetime and action.
   * @returns {string} Identifier used to replace or dismiss the toast.
   */
  public success(message: string, options: ToastOptions = {}): string {
    return this.add('success', message, options);
  }

  /**
   * Method error
   * @method error
   *
   * @description
   * Adds an error toast, which the toaster announces assertively, and returns its identifier.
   *
   * @param {string} message - Primary error message displayed by the toast.
   * @param {ToastOptions} options - Optional id, description, lifetime and action.
   * @returns {string} Identifier used to replace or dismiss the toast.
   */
  public error(message: string, options: ToastOptions = {}): string {
    return this.add('error', message, options);
  }

  /**
   * Method warning
   * @method warning
   *
   * @description
   * Adds a warning toast (something needs attention) and returns its identifier.
   *
   * @param {string} message - Primary message displayed by the toast.
   * @param {ToastOptions} options - Optional id, description, lifetime and action.
   * @returns {string} Identifier used to replace or dismiss the toast.
   */
  public warning(message: string, options: ToastOptions = {}): string {
    return this.add('warning', message, options);
  }

  /**
   * Method info
   * @method info
   *
   * @description
   * Adds an informative toast and returns its identifier.
   *
   * @param {string} message - Primary message displayed by the toast.
   * @param {ToastOptions} options - Optional id, description, lifetime and action.
   * @returns {string} Identifier used to replace or dismiss the toast.
   */
  public info(message: string, options: ToastOptions = {}): string {
    return this.add('info', message, options);
  }

  /**
   * Method dismiss
   * @method dismiss
   *
   * @description
   * Stops the selected toast's countdown and removes it, or clears every toast when no id is given.
   *
   * @param {string} id - Optional id of the toast to dismiss.
   * @returns {void}
   */
  public dismiss(id?: string): void {
    const ids: string[] = id === undefined ? [...this.countdowns.keys()] : [id];
    ids.forEach((one: string): void => this.stop(one));
    this.list.update((list: readonly Toast[]): Toast[] =>
      id === undefined ? [] : list.filter((toast: Toast): boolean => toast.id !== id),
    );
  }

  /**
   * Method pause
   * @method pause
   *
   * @description
   * Freezes every active countdown and subtracts elapsed time so resuming preserves remaining time.
   *
   * @returns {void}
   */
  public pause(): void {
    if (this.paused) {
      return;
    }
    this.paused = true;
    const now: number = Date.now();
    for (const countdown of this.countdowns.values()) {
      clearTimeout(countdown.handle);
      countdown.remaining -= now - countdown.startedAt;
    }
  }

  /**
   * Method resume
   * @method resume
   *
   * @description
   * Restarts each countdown from its remaining duration after a pause.
   *
   * @returns {void}
   */
  public resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    for (const id of this.countdowns.keys()) {
      this.start(id);
    }
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts or replaces a toast and starts its browser timer unless it is persistent or paused.
   *
   * @param {ToastType} type - Visual and announcement category for the toast.
   * @param {string} message - Primary message to display.
   * @param {ToastOptions} options - Optional id, description, lifetime and action.
   * @returns {string} Stable identifier of the inserted toast.
   */
  private add(type: ToastType, message: string, options: ToastOptions): string {
    const id: string = options.id ?? this.ids.next('ui-toast-');
    const toast: Toast = {
      id,
      type,
      message,
      description: options.description,
      action: options.action,
    };
    this.list.update((list: readonly Toast[]): Toast[] =>
      list.some((one: Toast): boolean => one.id === id)
        ? list.map((one: Toast): Toast => (one.id === id ? toast : one))
        : [...list, toast],
    );
    this.stop(id);
    const duration: number = options.duration ?? TOAST_DURATION;
    if (this.browser && Number.isFinite(duration) && duration > 0) {
      this.countdowns.set(id, { remaining: duration, startedAt: 0 });
      if (!this.paused) {
        this.start(id);
      }
    }
    return id;
  }

  /**
   * Method start
   * @method start
   *
   * @description
   * Starts or restarts the timeout for a tracked toast using its remaining duration.
   *
   * @param {string} id - Toast whose countdown should begin.
   * @returns {void}
   */
  private start(id: string): void {
    const countdown: Countdown | undefined = this.countdowns.get(id);
    if (countdown) {
      countdown.startedAt = Date.now();
      countdown.handle = setTimeout((): void => this.dismiss(id), Math.max(countdown.remaining, 0));
    }
  }

  /**
   * Method stop
   * @method stop
   *
   * @description
   * Clears and forgets the timeout state for one toast.
   *
   * @param {string} id - Toast whose countdown should be removed.
   * @returns {void}
   */
  private stop(id: string): void {
    clearTimeout(this.countdowns.get(id)?.handle);
    this.countdowns.delete(id);
  }
  // #endregion
}
