import type { Mock, MockInstance } from 'vitest';
import {
  MenuMotion,
  easeOut,
  paintMenu,
  progressAt,
  spring,
} from '@internal/ui/lib/menu-panel/animations/menu-motion/menu-motion';

/**
 * Function parts
 *
 * @description
 * Creates detached test elements for a menu trigger, panel and chevron and fixes the panel height for motion assertions.
 *
 * @returns {{ trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement }} Elements mutated by menu-motion helpers.
 */
function parts(): { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } {
  const trigger: HTMLButtonElement = document.createElement('button');
  const list: HTMLUListElement = document.createElement('ul');
  const chevron: HTMLSpanElement = document.createElement('span');
  document.body.append(trigger, list);
  Object.defineProperty(list, 'offsetHeight', { value: 108 });
  return { trigger, list, chevron };
}

describe('menu motion maths', () => {
  it('springs from 0 past 1 and settles on 1', () => {
    expect(spring(0, 1, 0)).toBeCloseTo(0);
    const peak: number = Math.max(...Array.from({ length: 60 }, (_, i) => spring(0, 1, i / 100)));
    expect(peak).toBeGreaterThan(1);
    expect(spring(0, 1, 0.6)).toBeCloseTo(1, 2);
  });

  it('eases out from 0 to 1', () => {
    expect(easeOut(0)).toBeCloseTo(0);
    expect(easeOut(0.5)).toBeGreaterThan(0.8);
    expect(easeOut(1)).toBeCloseTo(1);
  });

  it('runs 0.6s to open, 0.2s to close, 0.12s with reduced motion', () => {
    expect(progressAt(0, true, 0.7, false)).toEqual({ p: 1, done: true });
    expect(progressAt(0, true, 0.1, false).done).toBe(false);
    expect(progressAt(1, false, 0.2, false)).toEqual({ p: 0, done: true });
    expect(progressAt(1, false, 0.1, false).p).toBeGreaterThan(0);
    expect(progressAt(0, true, 0.06, true).p).toBeCloseTo(0.5);
    expect(progressAt(0, true, 0.12, true).done).toBe(true);
    expect(progressAt(1, false, 0.06, true).p).toBeCloseTo(0.5);
  });
});

describe('paintMenu', () => {
  it('starts rolled up against the trigger, below it', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    paintMenu(p, 0, true, { above: false, height: 108 }, false);
    expect(p.list.style.translate).toBe('0 -4.00px');
    expect(p.list.style.opacity).toBe('0');
    expect(p.list.style.clipPath).toBe('inset(0.0px -64px 100.0px -64px round 0px 0px 10px 10px)');
    expect(p.trigger.style.borderBottomLeftRadius).toBe('8.00px');
    expect(p.trigger.style.borderTopLeftRadius).toBe('');
    expect(p.chevron.style.rotate).toBe('0.0deg');
  });

  it('flattens the facing trigger edge while touching, then detaches and rounds it', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    paintMenu(p, 0.3, true, { above: true, height: 108 }, false);
    expect(p.trigger.style.borderTopLeftRadius).toBe('0.00px');
    expect(p.list.style.borderRadius).toBe('10px 10px 0px 0px');
    paintMenu(p, 1, true, { above: true, height: 108 }, false);
    expect(p.list.style.translate).toBe('0 0.00px');
    expect(p.list.style.clipPath).toContain('-64px');
    expect(p.trigger.style.borderTopLeftRadius).toBe('8.00px');
    expect(p.chevron.style.rotate).toBe('180.0deg');
  });

  it('only fades with reduced motion', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    paintMenu(p, 0.5, true, { above: false, height: 108 }, true);
    expect(p.list.style.opacity).toBe('0.5');
    expect(p.list.style.translate).toBe('');
    expect(p.chevron.style.rotate).toBe('180deg');
    paintMenu(p, 0.5, false, { above: false, height: 108 }, true);
    expect(p.chevron.style.rotate).toBe('');
  });
});

describe('MenuMotion', () => {
  /**
   * Variable frames
   *
   * @description
   * Queued animation-frame callbacks consumed by the test clock.
   *
   * @type {FrameRequestCallback[]}
   */
  let frames: FrameRequestCallback[];

  /**
   * Variable now
   *
   * @description
   * Mock performance timestamp advanced between scheduled animation frames.
   *
   * @type {number}
   */
  let now: number;

  beforeEach(() => {
    frames = [];
    now = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => vi.restoreAllMocks());

  /**
   * Function advance
   *
   * @description
   * Advances the mocked frame clock and invokes each callback queued for the next frame.
   *
   * @param {number} ms - Elapsed milliseconds to add to the frame timestamp.
   * @returns {void} Runs the callbacks captured before this frame.
   */
  const advance = (ms: number): void => {
    now += ms;
    const run: FrameRequestCallback[] = frames.splice(0);
    for (const callback of run) callback(now);
  };

  it('opens with frames, closes, resets the trigger and reports the end', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    const motion: MenuMotion = new MenuMotion();
    const onFrame: Mock<(progress: number) => void> = vi.fn<(progress: number) => void>();
    motion.run(p, true, { reduced: false, above: false, onFrame });
    expect(onFrame).toHaveBeenCalledWith(0);
    for (let i: number = 0; i < 40; i++) advance(16);
    expect(frames).toHaveLength(0);
    expect(p.list.style.opacity).toBe('1');
    const done: Mock<() => void> = vi.fn<() => void>();
    motion.run(p, false, { reduced: false, above: false, done });
    for (let i: number = 0; i < 20; i++) advance(16);
    expect(done).toHaveBeenCalledOnce();
    expect(p.trigger.style.borderBottomLeftRadius).toBe('');
    expect(p.chevron.style.rotate).toBe('');
  });

  it('reverses from where it is when closed mid-way', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    const motion: MenuMotion = new MenuMotion();
    motion.run(p, true, { reduced: true });
    advance(60);
    const opacity: number = Number(p.list.style.opacity);
    expect(opacity).toBeCloseTo(0.5);
    motion.run(p, false, { reduced: true });
    expect(Number(p.list.style.opacity)).toBeCloseTo(opacity);
  });

  it('measures the side of the list from the rectangles, once per run unless invalidated', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    const rect: MockInstance<HTMLElement['getBoundingClientRect']> = vi.spyOn(
      p.list,
      'getBoundingClientRect',
    );
    vi.spyOn(p.trigger, 'getBoundingClientRect').mockReturnValue({ top: 200 } as DOMRect);
    rect.mockReturnValue({ bottom: 196 } as DOMRect);
    const motion: MenuMotion = new MenuMotion();
    motion.run(p, true, { reduced: false });
    advance(16);
    advance(16);
    expect(rect).toHaveBeenCalledTimes(1);
    expect(p.list.style.borderRadius.startsWith('10px 10px')).toBe(true);
    motion.invalidate();
    advance(16);
    expect(rect).toHaveBeenCalledTimes(2);
  });

  it('stops and puts the trigger back', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    const motion: MenuMotion = new MenuMotion();
    motion.run(p, true, { reduced: false, above: true });
    advance(48);
    motion.stop(p);
    expect(p.trigger.style.borderTopLeftRadius).toBe('');
    expect(p.chevron.style.rotate).toBe('');
  });

  it('jumps to the end without animation frames', () => {
    const p: { trigger: HTMLElement; list: HTMLElement; chevron: HTMLElement } = parts();
    const view: Window = p.list.ownerDocument.defaultView as Window;
    const saved: (callback: FrameRequestCallback) => number = view.requestAnimationFrame;
    Object.defineProperty(view, 'requestAnimationFrame', { value: undefined, configurable: true });
    const done: Mock<() => void> = vi.fn<() => void>();
    try {
      new MenuMotion().run(p, false, { reduced: false, done });
    } finally {
      Object.defineProperty(view, 'requestAnimationFrame', { value: saved, configurable: true });
    }
    expect(done).toHaveBeenCalledOnce();
  });
});
