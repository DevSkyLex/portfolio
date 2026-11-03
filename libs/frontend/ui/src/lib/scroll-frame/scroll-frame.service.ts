import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import type { ScrollFrameTask } from '@internal/ui/lib/scroll-frame/models/scroll-frame/scroll-frame-task.interface';

/**
 * Service ScrollFrameService
 * @class ScrollFrameService
 *
 * @description
 * Shares passive scroll and resize listeners and one animation frame across registered tasks. It batches all reads
 * before writes and schedules a settling frame when a task changes the DOM.
 */
@Injectable({ providedIn: 'root' })
export class ScrollFrameService {
  // #region Properties
  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window associated with the injected document; `null` during server rendering.
   *
   * @type {Window | null}
   */
  private readonly view: (Window & typeof globalThis) | null =
    inject<Document>(DOCUMENT).defaultView;

  /**
   * Property tasks
   * @readonly
   *
   * @description
   * Active scroll-linked tasks sharing the global listeners and animation-frame batch.
   *
   * @type {Set<ScrollFrameTask>}
   */
  private readonly tasks: Set<ScrollFrameTask> = new Set<ScrollFrameTask>();

  /**
   * Property frame
   *
   * @description
   * Pending animation-frame handle, or zero when no frame is queued.
   *
   * @type {number}
   */
  private frame: number = 0;

  /**
   * Property late
   *
   * @description
   * Delayed request handle used to remeasure after deferred content changes page height.
   *
   * @type {number}
   */
  private late: number = 0;

  /**
   * Property flush
   * @readonly
   *
   * @description
   * Runs all measurements before writes and requests a settling frame if any task changed the DOM.
   *
   * @type {() => void}
   */
  private readonly flush: () => void = (): void => {
    this.frame = 0;
    const tasks: ScrollFrameTask[] = [...this.tasks];
    for (const task of tasks) task.read();
    let changed: boolean = false;
    for (const task of tasks) changed = task.write() || changed;
    if (changed) this.request();
  };
  // #endregion

  // #region Methods
  /**
   * Method request
   * @method request
   *
   * @description
   * Queues one shared animation frame when a browser window and at least one task are active.
   *
   * @returns {void}
   */
  public readonly request: () => void = (): void => {
    if (!this.frame && this.view && this.tasks.size)
      this.frame = this.view.requestAnimationFrame(this.flush);
  };

  /**
   * Method add
   * @method add
   *
   * @description
   * Registers and immediately runs a task, then shares scroll and resize frames with it until its returned cleanup
   * function runs. A delayed request accounts for deferred blocks that change page height after initial render.
   *
   * @param {ScrollFrameTask} task - Measurement and write callbacks to add to the shared frame batch.
   * @returns {() => void} Idempotent cleanup that removes the task and detaches shared listeners when it was last.
   */
  public add(task: ScrollFrameTask): () => void {
    const view: (Window & typeof globalThis) | null = this.view;
    if (!view) return (): undefined => undefined;
    if (!this.tasks.size) {
      view.addEventListener('scroll', this.request, { passive: true });
      view.addEventListener('resize', this.request);
    }
    this.tasks.add(task);
    task.read();
    task.write();
    view.clearTimeout(this.late);
    this.late = view.setTimeout(this.request, 900);
    return (): void => {
      if (!this.tasks.delete(task) || this.tasks.size) return;
      view.removeEventListener('scroll', this.request);
      view.removeEventListener('resize', this.request);
      view.clearTimeout(this.late);
      if (this.frame) view.cancelAnimationFrame(this.frame);
      this.frame = 0;
    };
  }
  // #endregion
}
