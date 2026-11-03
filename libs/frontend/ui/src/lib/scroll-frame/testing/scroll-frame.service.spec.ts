import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScrollFrameService } from '@internal/ui/lib/scroll-frame/scroll-frame.service';

describe('ScrollFrameService', (): void => {
  let frames: FrameRequestCallback[];

  beforeEach((): void => {
    frames = [];
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback): number => {
        frames.push(callback);
        return frames.length;
      },
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((): undefined => undefined);
  });

  afterEach((): void => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Function flush
   * @function flush
   *
   * @description
   * Runs the animation-frame callbacks currently queued by the test window.
   *
   * @returns {void}
   */
  const flush = (): void =>
    frames.splice(0).forEach((callback: FrameRequestCallback): void => callback(0));

  it('runs a task at once, then every read before any write on one frame per scroll', (): void => {
    const service: ScrollFrameService = TestBed.inject<ScrollFrameService>(ScrollFrameService);
    const log: string[] = [];
    /**
     * Function task
     * @function task
     *
     * @description
     * Creates a frame task that records its read and write phases in the shared test log.
     *
     * @param {string} name - Identifier included in the recorded phase entries.
     * @returns {{ read: () => number; write: () => boolean }} Task callbacks used to verify batch ordering.
     */
    const task = (name: string): { read: () => number; write: () => boolean } => ({
      read: (): number => log.push(`read ${name}`),
      write: (): boolean => {
        log.push(`write ${name}`);
        return false;
      },
    });
    service.add(task('a'));
    service.add(task('b'));
    expect(log).toEqual(['read a', 'write a', 'read b', 'write b']);
    log.length = 0;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(1);
    flush();
    expect(log).toEqual(['read a', 'read b', 'write a', 'write b']);
  });

  it('asks for one more frame while writes change something, and once more after 900ms', (): void => {
    const service: ScrollFrameService = TestBed.inject<ScrollFrameService>(ScrollFrameService);
    let changes: number = 2;
    const read: Mock<() => void> = vi.fn<() => void>();
    service.add({ read, write: (): boolean => changes-- > 0 });
    read.mockClear();
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(frames).toHaveLength(1);
    flush();
    expect(frames).toHaveLength(0);
    expect(read).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(900);
    expect(frames).toHaveLength(1);
  });

  it('stops listening once the last task leaves', (): void => {
    const service: ScrollFrameService = TestBed.inject<ScrollFrameService>(ScrollFrameService);
    const read: Mock<() => void> = vi.fn<() => void>();
    const remove: () => void = service.add({ read, write: (): false => false });
    window.dispatchEvent(new Event('scroll'));
    remove();
    remove();
    read.mockClear();
    window.dispatchEvent(new Event('scroll'));
    expect(read).not.toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
