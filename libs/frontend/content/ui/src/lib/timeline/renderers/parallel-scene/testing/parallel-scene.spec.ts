import { mountParallelScene } from '@internal/content-web-ui/lib/timeline/renderers/parallel-scene/parallel-scene';

/**
 * Function fakeContext
 *
 * @description
 * Creates a proxy canvas context that records called methods for jsdom, which has no native 2D context.
 *
 * @returns {{ context: CanvasRenderingContext2D; calls: Map<string, number> }} Proxy context and method call counts for canvas assertions.
 */
function fakeContext(): { context: CanvasRenderingContext2D; calls: Map<string, number> } {
  const calls: Map<string, number> = new Map<string, number>();
  const values: Map<PropertyKey, unknown> = new Map<PropertyKey, unknown>();
  const context: CanvasRenderingContext2D = new Proxy(
    {},
    {
      get: (_: object, key: string | symbol): unknown =>
        values.has(key)
          ? values.get(key)
          : (): undefined => {
              calls.set(String(key), (calls.get(String(key)) ?? 0) + 1);
              return undefined;
            },
      set: (_: object, key: string | symbol, value): boolean => {
        values.set(key, value);
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
  return { context, calls };
}

/**
 * Constant STEPS
 *
 * @description
 * Education and experience time bounds encoded in the list markup consumed by the scene.
 */
const STEPS = {
  edu: [
    ['2021.67', '2023.50'],
    ['2023.67', '2024.50'],
    ['2024.67', '2026.50'],
  ],
  xp: [
    ['2022.33', '2022.50'],
    ['2023.17', '2023.33'],
    ['2023.67', '2026.50'],
  ],
} as const;

/**
 * Function section
 *
 * @description
 * Creates and attaches a section with canvas and ordered track items for scene lifecycle tests.
 *
 * @returns {HTMLElement} Attached section containing the canvas and fixture track lists.
 */
function section(): HTMLElement {
  const sec: HTMLElement = document.createElement('section');
  sec.setAttribute('data-poster', '0.66');
  sec.innerHTML = `<canvas></canvas>${Object.entries(STEPS)
    .map(
      ([key, steps]): string =>
        `<ol data-track="${key}" aria-label="${key}">${steps
          .map(([a, b]): string => `<li data-start="${a}" data-end="${b}"></li>`)
          .join('')}</ol>`,
    )
    .join('')}`;
  document.body.append(sec);
  return sec;
}

/**
 * Constant states
 *
 * @description
 * Encodes each step's active, past or default marker state in document order.
 */
const states: (sec: HTMLElement) => string = (sec: HTMLElement): string =>
  [...sec.querySelectorAll('li')]
    .map((li: HTMLLIElement): '.' | 'O' | 'P' =>
      li.hasAttribute('data-on') ? 'O' : li.hasAttribute('data-past') ? 'P' : '.',
    )
    .join('');

describe('mountParallelScene', (): void => {
  let frames: FrameRequestCallback[];
  let top: number;
  let context: CanvasRenderingContext2D;
  let calls: Map<string, number>;
  let scrollHeight: number;
  let reduced: boolean;

  beforeEach((): void => {
    frames = [];
    top = 0;
    scrollHeight = 9000;
    reduced = false;
    ({ context, calls } = fakeContext());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | null =>
      kind === '2d' ? context : null) as HTMLCanvasElement['getContext']);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1200,
      height: 900,
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      (): DOMRect => ({ top, height: 6300, width: 1200 }) as DOMRect,
    );
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(
      (): number => scrollHeight,
    );
    vi.stubGlobal('matchMedia', (query: string): { matches: boolean } => ({
      matches: query.includes('reduced-motion') && reduced,
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        public observe(): void {
          // Always visible in these tests.
        }
        public disconnect(): void {
          // Nothing observed.
        }
      },
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback): number => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((): undefined => undefined);
  });

  afterEach((): void => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Constant run
   *
   * @description
   * Advances the queued animation frames with deterministic timestamps.
   */
  const run: (count: number, from?: number) => void = (count: number, from: number = 0): void => {
    for (let i: number = 0; i < count; i++) {
      const pending: FrameRequestCallback[] = frames.splice(0);
      for (const callback of pending) callback(from + i * 16);
    }
  };

  it('pins itself in a scrolling page and lights the step being lived as the page scrolls', (): void => {
    const sec: HTMLElement = section();
    const stop: (() => void) | null = mountParallelScene(sec);
    expect(stop).not.toBeNull();
    expect(sec.hasAttribute('data-live')).toBe(true);
    run(3);
    expect(states(sec)).not.toContain('P');
    expect(calls.get('fillRect')).toBeGreaterThan(0);

    // Halfway down the pinned section: later steps, earlier ones behind.
    top = -2700;
    window.dispatchEvent(new Event('scroll'));
    run(200, 1000);
    expect(sec.style.getPropertyValue('--sp')).toBe(
      (2700 / (6300 - window.innerHeight)).toFixed(4),
    );
    expect(states(sec)).toContain('P');
    expect(states(sec)).toContain('O');

    // Past the end of the axis: every step is behind.
    top = -5400;
    window.dispatchEvent(new Event('scroll'));
    run(300, 5000);
    expect(states(sec)).toBe('PPPPPP');
    stop?.();
  });

  it('draws the poster frame and stays still with reduced motion', (): void => {
    reduced = true;
    const sec: HTMLElement = section();
    const stop: (() => void) | null = mountParallelScene(sec);
    expect(sec.hasAttribute('data-live')).toBe(false);
    expect(sec.style.getPropertyValue('--sp')).toBe('0.6600');
    run(1);
    expect(frames).toHaveLength(0);
    stop?.();
  });

  it('reads the palette again when the theme changes and redraws on resize', async (): Promise<void> => {
    const sec: HTMLElement = section();
    const stop: (() => void) | null = mountParallelScene(sec);
    run(1);
    const before: number = calls.get('fillRect') ?? 0;
    document.documentElement.setAttribute('data-theme', 'light');
    await Promise.resolve();
    window.dispatchEvent(new Event('resize'));
    run(1, 100);
    expect(calls.get('fillRect') ?? 0).toBeGreaterThan(before);
    stop?.();
    document.documentElement.removeAttribute('data-theme');
  });

  it('leaves the pinned mode when the page stops scrolling, and stops on teardown', (): void => {
    const sec: HTMLElement = section();
    const stop: (() => void) | null = mountParallelScene(sec);
    scrollHeight = window.innerHeight + 10;
    window.dispatchEvent(new Event('resize'));
    expect(sec.hasAttribute('data-live')).toBe(false);
    stop?.();
    const pending: number = frames.length;
    window.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(pending);
  });

  it('gives up without a 2D context', (): void => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    expect(mountParallelScene(section())).toBeNull();
  });
});
