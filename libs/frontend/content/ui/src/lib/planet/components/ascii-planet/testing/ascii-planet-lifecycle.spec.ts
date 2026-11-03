import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AsciiPlanetComponent } from '@internal/content-web-ui/lib/planet/components/ascii-planet/ascii-planet.component';

// Preloaded so that the component's lazy import resolves before the test ends.
import '@internal/content-web-ui/lib/planet/renderers/planet/planet-renderer';

/**
 * Function fakeContext
 *
 * @description
 * Creates a proxy 2D context for jsdom and records drawing calls used by lifecycle assertions.
 *
 * @returns {{ context: CanvasRenderingContext2D; calls: string[] }} Proxy context and recorded method names.
 */
function fakeContext(): { context: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const values: Map<PropertyKey, unknown> = new Map<PropertyKey, unknown>();
  const context: CanvasRenderingContext2D = new Proxy(
    {},
    {
      get: (_: object, key: string | symbol): unknown =>
        values.has(key)
          ? values.get(key)
          : (): { a: number; e: number; f: number } | undefined => {
              calls.push(String(key));
              return key === 'getTransform' ? { a: 1, e: 0, f: 0 } : undefined;
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
 * Function fakeGl
 *
 * @description
 * Creates a WebGL proxy with successful shader and program checks plus two active uniforms.
 *
 * @returns {{ gl: WebGLRenderingContext; calls: string[] }} Proxy context and recorded method names.
 */
function fakeGl(): { gl: WebGLRenderingContext; calls: string[] } {
  const calls: string[] = [];
  const constants: Record<string, number> = {
    COMPILE_STATUS: 1,
    LINK_STATUS: 2,
    ACTIVE_UNIFORMS: 3,
  };
  const methods: Record<string, (...args: unknown[]) => unknown> = {
    getShaderParameter: (): boolean => true,
    getProgramParameter: (_program: unknown, name: unknown): true | 2 => (name === 3 ? 2 : true),
    getActiveUniform: (_program: unknown, index: unknown): { name: string } => ({
      name: index === 0 ? 'uView' : 'uTime',
    }),
  };
  const gl: WebGLRenderingContext = new Proxy(
    {},
    {
      get: (
        _: object,
        key: string | symbol,
      ): number | ((...args: unknown[]) => unknown) | undefined => {
        if (typeof key === 'string' && key in constants) return constants[key];
        return (...args: unknown[]): unknown => {
          calls.push(String(key));
          const method: ((...args: unknown[]) => unknown) | undefined =
            typeof key === 'string' ? methods[key] : undefined;
          return method ? method(...args) : {};
        };
      },
    },
  ) as WebGLRenderingContext;
  return { gl, calls };
}

/**
 * Class FakeObserver
 * @class FakeObserver
 *
 * @description
 * Minimal observer fake that tracks live instances for cleanup assertions.
 */
class FakeObserver {
  // #region Properties
  /**
   * Property live
   * @readonly
   *
   * @description
   * Observer instances that have not yet been disconnected.
   *
   * @type {Set<FakeObserver>}
   */
  public static readonly live: Set<FakeObserver> = new Set<FakeObserver>();
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Adds this observer to the set used to verify teardown.
   */
  public constructor() {
    FakeObserver.live.add(this);
  }
  // #endregion

  // #region Methods
  /**
   * Method observe
   * @method observe
   *
   * @description
   * Implements the observer surface without delivering observations in the test environment.
   *
   * @returns {void}
   */
  public observe(): void {
    // Observations are never delivered in these tests.
  }

  /**
   * Method disconnect
   * @method disconnect
   *
   * @description
   * Removes this observer from the live set when renderer teardown disconnects it.
   *
   * @returns {void}
   */
  public disconnect(): void {
    FakeObserver.live.delete(this);
  }
  // #endregion
}

describe('AsciiPlanetComponent', (): void => {
  let frames: number;
  let cancelled: number;

  beforeEach((): void => {
    frames = 0;
    cancelled = 0;
    FakeObserver.live.clear();
    vi.stubGlobal('ResizeObserver', FakeObserver);
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    // Only the planet loop (`tick`) is counted: Angular schedules frames of its own.
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback): number =>
      callback.name === 'tick' ? ++frames : 0,
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((): void => {
      cancelled++;
    });
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const reducedMotion = (reduce: boolean): typeof vi =>
    vi.stubGlobal(
      'matchMedia',
      (query: string): MediaQueryList =>
        ({
          matches: query.includes('reduced-motion') ? reduce : false,
          addEventListener: (): undefined => undefined,
          removeEventListener: (): undefined => undefined,
        }) as unknown as MediaQueryList,
    );

  const mount: () => Promise<ComponentFixture<AsciiPlanetComponent>> = async (): Promise<
    ComponentFixture<AsciiPlanetComponent>
  > => {
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    fixture.componentRef.setInput('height', 200);
    await fixture.whenStable();
    await new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
      setTimeout(resolve),
    );
    return fixture;
  };

  it('falls back to the 2D canvas when WebGL is missing, and draws', async (): Promise<void> => {
    reducedMotion(false);
    const { context, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | null =>
      kind === '2d' ? context : null) as HTMLCanvasElement['getContext']);
    const fixture: ComponentFixture<AsciiPlanetComponent> = await mount();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-renderer')).toBe('2d');
    expect(calls).toContain('clearRect');
    expect(frames).toBeGreaterThan(0);
  });

  it('draws a single still frame with reduced motion', async (): Promise<void> => {
    reducedMotion(true);
    const { context, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | null =>
      kind === '2d' ? context : null) as HTMLCanvasElement['getContext']);
    await mount();
    expect(calls.filter((call: string): boolean => call === 'clearRect')).toHaveLength(1);
    expect(frames).toBe(0);
  });

  it('stops the loop, the observers and removes its canvas when destroyed', async (): Promise<void> => {
    reducedMotion(false);
    const { context } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | null =>
      kind === '2d' ? context : null) as HTMLCanvasElement['getContext']);
    const fixture: ComponentFixture<AsciiPlanetComponent> = await mount();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('canvas')).not.toBeNull();
    expect(FakeObserver.live.size).toBeGreaterThan(0);
    fixture.destroy();
    expect(host.querySelector('canvas')).toBeNull();
    expect(cancelled).toBeGreaterThan(0);
    expect(FakeObserver.live.size).toBe(0);
  });

  it('keeps an empty canvas without any context, without throwing', async (): Promise<void> => {
    reducedMotion(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const fixture: ComponentFixture<AsciiPlanetComponent> = await mount();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-renderer')).toBe('2d');
    expect(frames).toBe(0);
    expect(FakeObserver.live.size).toBe(0);
  });

  it('renders with WebGL when available, and falls back to 2D once the context is lost', async (): Promise<void> => {
    reducedMotion(false);
    const { gl, calls } = fakeGl();
    const { context } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | WebGLRenderingContext =>
      kind === 'webgl' ? gl : context) as HTMLCanvasElement['getContext']);
    const fixture: ComponentFixture<AsciiPlanetComponent> = await mount();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-renderer')).toBe('webgl');
    expect(calls).toContain('linkProgram');
    expect(
      calls.filter((call: string): boolean => call === 'drawArrays').length,
    ).toBeGreaterThanOrEqual(2);
    host
      .querySelector('canvas')
      ?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    await fixture.whenStable();
    await new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
      setTimeout(resolve),
    );
    expect(host.getAttribute('data-renderer')).toBe('2d');
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('gives up WebGL when a shader does not compile', async (): Promise<void> => {
    reducedMotion(true);
    const { gl } = fakeGl();
    const broken: WebGLRenderingContext = new Proxy(gl, {
      get: (target: WebGLRenderingContext, key: string | symbol) =>
        key === 'getShaderParameter' ? (): boolean => false : Reflect.get(target, key),
    });
    const { context } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | WebGLRenderingContext =>
      kind === 'webgl' ? broken : context) as HTMLCanvasElement['getContext']);
    const fixture: ComponentFixture<AsciiPlanetComponent> = await mount();
    expect((fixture.nativeElement as HTMLElement).getAttribute('data-renderer')).toBe('2d');
  });

  it('follows the pointer and the window scroll when pinned behind the page', async (): Promise<void> => {
    reducedMotion(false);
    vi.stubGlobal(
      'matchMedia',
      (query: string): MediaQueryList =>
        ({
          matches: query.includes('pointer: fine'),
          addEventListener: (): undefined => undefined,
          removeEventListener: (): undefined => undefined,
        }) as unknown as MediaQueryList,
    );
    const { context, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ): CanvasRenderingContext2D | null =>
      kind === '2d' ? context : null) as HTMLCanvasElement['getContext']);
    const parent: HTMLDivElement = document.createElement('div');
    document.body.append(parent);
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    parent.append(fixture.nativeElement as HTMLElement);
    fixture.componentRef.setInput('fixed', true);
    fixture.componentRef.setInput('renderer', '2d');
    await fixture.whenStable();
    await new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
      setTimeout(resolve),
    );
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));
    document.documentElement.dispatchEvent(new Event('pointerleave'));
    expect(calls).toContain('clearRect');
    fixture.destroy();
    parent.remove();
  });
});
