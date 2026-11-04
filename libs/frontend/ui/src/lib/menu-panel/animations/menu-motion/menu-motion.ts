import type { MenuLayout } from '@internal/ui/lib/menu-panel/models/menu-panel/menu-layout.interface';
import type { MenuMotionParts } from '@internal/ui/lib/menu-panel/models/menu-panel/menu-motion-parts.interface';
import {
  CLOSE_SECONDS,
  GAP,
  LIP,
  OPEN_SECONDS,
  RADIUS,
  TRIGGER_RADIUS,
  REDUCED_SECONDS,
  SHADOW,
  W0,
  WD,
  ZETA,
} from '@internal/ui/lib/menu-panel/constants/menu-motion.constants';
import type { MenuRun } from '@internal/ui/lib/menu-panel/models/menu-panel/menu-run.interface';

/**
 * Function clamp01
 *
 * @description
 * Bounds a normalized progress value to the closed interval from zero to one.
 *
 * @param {number} value - Progress or interpolation factor to clamp.
 * @returns {number} Value within the unit interval.
 */
export const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Function lerp
 *
 * @description
 * Interpolates linearly between two values using an unbounded factor.
 *
 * @param {number} from - Starting value.
 * @param {number} to - Ending value.
 * @param {number} t - Interpolation factor.
 * @returns {number} Interpolated value.
 */
const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * Function ramp
 *
 * @description
 * Maps a value from the supplied interval to normalized progress, clamping values beyond either endpoint.
 *
 * @param {number} value - Value to map.
 * @param {number} start - Input value mapped to zero.
 * @param {number} end - Input value mapped to one.
 * @returns {number} Clamped progress within the interval.
 */
const ramp = (value: number, start: number, end: number): number =>
  clamp01((value - start) / (end - start));

/**
 * Function spring
 *
 * @description
 * Evaluates the zero-initial-velocity damped spring used to open the list.
 *
 * @param {number} from - Starting progress.
 * @param {number} to - Target progress.
 * @param {number} t - Elapsed time in seconds.
 * @returns {number} Spring progress at the requested elapsed time.
 */
export function spring(from: number, to: number, t: number): number {
  const decay: number = Math.exp(-ZETA * W0 * t);
  return to - (to - from) * decay * (Math.cos(WD * t) + ((ZETA * W0) / WD) * Math.sin(WD * t));
}

/**
 * Function bezier
 *
 * @description
 * Evaluates one cubic Bezier coordinate with endpoints fixed at zero and one.
 *
 * @param {number} t - Curve parameter.
 * @param {number} a - First control point coordinate.
 * @param {number} b - Second control point coordinate.
 * @returns {number} Evaluated curve coordinate.
 */
const bezier = (t: number, a: number, b: number): number => {
  const u: number = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
};

/**
 * Function easeOut
 *
 * @description
 * Solves the x coordinate of the menu closing cubic-bezier curve by bisection and returns its y coordinate.
 *
 * @param {number} x - Normalized elapsed progress.
 * @returns {number} Eased progress on the curve.
 */
export function easeOut(x: number): number {
  let low: number = 0;
  let high: number = 1;
  let t: number = x;
  for (let i: number = 0; i < 24; i++) {
    t = (low + high) / 2;
    if (bezier(t, 0.16, 0.3) < x) low = t;
    else high = t;
  }
  return bezier(t, 1, 1);
}

/**
 * Function progressAt
 *
 * @description
 * Computes animation progress and completion for opening spring, closing ease-out or reduced-motion fade.
 *
 * @param {number} from - Progress at the start or interruption point.
 * @param {boolean} open - Whether this run is opening the menu.
 * @param {number} t - Elapsed seconds since the run began.
 * @param {boolean} reduced - Whether reduced motion should use the short linear fade.
 * @returns {{ p: number; done: boolean }} Current progress and whether the run has reached its target.
 */
export function progressAt(
  from: number,
  open: boolean,
  t: number,
  reduced: boolean,
): { p: number; done: boolean } {
  if (reduced)
    return {
      p: lerp(from, open ? 1 : 0, clamp01(t / REDUCED_SECONDS)),
      done: t >= REDUCED_SECONDS,
    };
  if (open) return t < OPEN_SECONDS ? { p: spring(from, 1, t), done: false } : { p: 1, done: true };
  return { p: lerp(from, 0, easeOut(clamp01(t / CLOSE_SECONDS))), done: t >= CLOSE_SECONDS };
}

/**
 * Function paintMenu
 *
 * @description
 * Applies list reveal, shadow clip, trigger corner and chevron styles for one animation frame.
 * Reduced motion only fades opacity and updates the chevron rotation.
 *
 * @param {MenuMotionParts} parts - Elements to style.
 * @param {number} p - Current animation progress.
 * @param {boolean} open - Whether the target state is open.
 * @param {MenuLayout} layout - Cached list side and height for this run.
 * @param {boolean} reduced - Whether to omit geometric animation.
 * @returns {void} Styles are written directly to the supplied elements.
 */
export function paintMenu(
  parts: MenuMotionParts,
  p: number,
  open: boolean,
  layout: MenuLayout,
  reduced: boolean,
): void {
  const { trigger, list, chevron } = parts;
  if (reduced) {
    list.style.opacity = String(clamp01(p));
    if (chevron) chevron.style.rotate = open ? '180deg' : '';
    return;
  }
  const { above, height } = layout;
  const reveal: number = clamp01(p);
  const detach: number = ramp(p, 0.4, 1);
  const near: number = RADIUS * detach;
  const corners: string = above
    ? `${RADIUS}px ${RADIUS}px ${near}px ${near}px`
    : `${near}px ${near}px ${RADIUS}px ${RADIUS}px`;
  const hidden: number = Math.max(0, (height - LIP) * (1 - reveal));
  list.style.translate = `0 ${lerp(above ? GAP : -GAP, 0, detach).toFixed(2)}px`;
  list.style.borderRadius = corners;

  // The clip lets the shadow overflow on the sides, then on both edges as the list detaches and unrolls.
  const far: string = `${(hidden - SHADOW * ramp(reveal, 0.85, 1)).toFixed(1)}px`;
  const nearEdge: string = `${(-SHADOW * detach).toFixed(1)}px`;
  const side: string = `${-SHADOW}px`;
  const box: string[] = above ? [far, side, nearEdge, side] : [nearEdge, side, far, side];
  list.style.clipPath = `inset(${box.join(' ')} round ${corners})`;
  list.style.opacity = String(ramp(p, 0, 0.12));

  // The trigger edge facing the list flattens while they touch, then rounds again as it detaches.
  const edge: number =
    p <= 0.2
      ? lerp(TRIGGER_RADIUS, 0, ramp(p, 0, 0.2))
      : p < 0.4
        ? 0
        : lerp(0, TRIGGER_RADIUS, ramp(p, 0.4, 1));
  const radius: string = `${edge.toFixed(2)}px`;
  trigger.style.borderTopLeftRadius = trigger.style.borderTopRightRadius = above ? radius : '';
  trigger.style.borderBottomLeftRadius = trigger.style.borderBottomRightRadius = above
    ? ''
    : radius;
  if (chevron) chevron.style.rotate = `${(reveal * 180).toFixed(1)}deg`;
}

/**
 * Class MenuMotion
 * @class MenuMotion
 *
 * @description
 * Animates menu elements with progress preserved across interruptions so an opening run can reverse smoothly into closing.
 */
export class MenuMotion {
  // #region Properties
  /**
   * Property progress
   *
   * @description
   * Last painted progress retained as the starting point of an interrupted run.
   *
   * @type {number}
   */
  private progress: number = 0;

  /**
   * Property frame
   *
   * @description
   * Pending animation frame identifier, or zero when no frame is scheduled.
   *
   * @type {number}
   */
  private frame: number = 0;

  /**
   * Property layout
   *
   * @description
   * Geometry cached for the active run and discarded when the overlay changes position.
   *
   * @type {MenuLayout | null}
   */
  private layout: MenuLayout | null = null;
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Cancels any pending frame, paints from the current progress, and schedules frames until the requested state is reached.
   * In non-browser contexts it updates progress immediately and calls `done` when closing.
   *
   * @param {MenuMotionParts} parts - Trigger, list and optional chevron to animate.
   * @param {boolean} open - Whether the target state is open.
   * @param {MenuRun} options - Reduced-motion choice, known placement and frame/close callbacks.
   * @returns {void} Schedules frame updates through the list document's window when available; without `requestAnimationFrame`, updates progress and invokes the close callback synchronously.
   */
  public run(parts: MenuMotionParts, open: boolean, options: MenuRun): void {
    const view: (Window & typeof globalThis) | null = parts.list.ownerDocument.defaultView;
    if (!view?.requestAnimationFrame) {
      this.progress = open ? 1 : 0;
      if (!open) options.done?.();
      return;
    }
    view.cancelAnimationFrame(this.frame);
    this.layout = null;
    const from: number = this.progress;
    const start: number = view.performance.now();
    const paint = (p: number): void => {
      this.layout ??= measure(parts, options.above);
      paintMenu(parts, p, open, this.layout, options.reduced);
      options.onFrame?.(p);
    };
    paint(from);
    const step = (now: number): void => {
      const { p, done } = progressAt(from, open, (now - start) / 1000, options.reduced);
      this.progress = p;
      paint(p);
      if (!done) {
        this.frame = view.requestAnimationFrame(step);
        return;
      }
      this.frame = 0;
      if (!open) {
        reset(parts);
        options.done?.();
      }
    };
    this.frame = view.requestAnimationFrame(step);
  }

  /**
   * Method invalidate
   * @method invalidate
   *
   * @description
   * Clears cached geometry so the next animation frame rereads the list position and height.
   *
   * @returns {void} The next paint lazily measures layout again.
   */
  public invalidate(): void {
    this.layout = null;
  }

  /**
   * Method stop
   * @method stop
   *
   * @description
   * Cancels the pending frame, resets progress and removes inline animation styles when the list leaves the page.
   *
   * @param {Pick<MenuMotionParts, 'trigger' | 'chevron'>} parts - Elements whose inline styles must be reset.
   * @returns {void} No close callback is run for an interrupted animation.
   */
  public stop(parts: Pick<MenuMotionParts, 'trigger' | 'chevron'>): void {
    if (this.frame) parts.trigger.ownerDocument.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.progress = 0;
    reset(parts);
  }
  // #endregion
}

/**
 * Function measure
 *
 * @description
 * Reads whether the list is above its trigger and captures the list height for a run.
 * An explicit side takes precedence when a component owns placement.
 *
 * @param {MenuMotionParts} parts - Trigger and list whose geometry is measured.
 * @param {boolean | undefined} above - Optional placement override.
 * @returns {MenuLayout} Side and height used by the paint calculations.
 */
function measure(parts: MenuMotionParts, above: boolean | undefined): MenuLayout {
  return {
    above:
      above ??
      parts.list.getBoundingClientRect().bottom <= parts.trigger.getBoundingClientRect().top + 1,
    height: parts.list.offsetHeight,
  };
}

/**
 * Function reset
 *
 * @description
 * Removes inline corner radius and chevron rotation applied by menu animation.
 *
 * @param {Pick<MenuMotionParts, 'trigger' | 'chevron'>} parts - Trigger and optional chevron to restore.
 * @returns {void} Inline animation styles are removed.
 */
function reset({ trigger, chevron }: Pick<MenuMotionParts, 'trigger' | 'chevron'>): void {
  trigger.style.removeProperty('border-radius');
  trigger.style.borderTopLeftRadius = trigger.style.borderTopRightRadius = '';
  trigger.style.borderBottomLeftRadius = trigger.style.borderBottomRightRadius = '';
  if (chevron) chevron.style.rotate = '';
}
