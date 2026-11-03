import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  type Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  booleanAttribute,
  type InputSignal,
  type InputSignalWithTransform,
  type WritableSignal,
} from '@angular/core';
import type { PlanetForms } from '@internal/content-web-ui/lib/planet/models/planet-forms/planet-forms.model';
import type { PlanetOptions } from '@internal/content-web-ui/lib/planet/models/planet-options/planet-options.interface';
import type { PlanetRenderer } from '@internal/content-web-ui/lib/planet/models/planet-renderer/planet-renderer.type';
import type { PlanetRendererLoader } from '@internal/content-web-ui/lib/planet/models/planet-renderer-loader/planet-renderer-loader.type';
import type { PlanetSide } from '@internal/content-web-ui/lib/planet/models/planet-side/planet-side.type';
import { PLANET_RENDERER_LOADER } from '@internal/content-web-ui/lib/planet/tokens/planet-renderer-loader/planet-renderer-loader.token';

/**
 * Class AsciiPlanetComponent
 * @class AsciiPlanetComponent
 *
 * @description
 * Renders a decorative ASCII planet with WebGL and a 2D canvas fallback, loading browser-only rendering after the first render.
 * An unavailable renderer leaves a stationary token gradient. Fixed mode responds to page scroll and
 * pointer input; inline mode uses the configured height.
 */
@Component({
  selector: 'content-ascii-planet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    '[class]': 'hostClass()',
    '[style.height.px]': 'fixed() ? null : height()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
    '[attr.data-static]': "unavailable() ? '' : null",
  },
})
export class AsciiPlanetComponent {
  // #region Properties
  /**
   * Property forms
   * @readonly
   *
   * @description
   * Cell mark ramp used to render the planet surface.
   *
   * @type {InputSignal<PlanetForms>}
   */
  public readonly forms: InputSignal<'mixed' | 'plus' | 'dots' | 'squares'> =
    input<PlanetForms>('mixed');

  /**
   * Property scale
   * @readonly
   *
   * @description
   * Radius multiplier that leaves the component's layout box unchanged.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly scale: InputSignalWithTransform<number, unknown> = input<number, unknown>(1, {
    transform: numberAttribute,
  });

  /**
   * Property lift
   * @readonly
   *
   * @description
   * Raises the planet center by a fraction of its radius.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly lift: InputSignalWithTransform<number, unknown> = input<number, unknown>(0, {
    transform: numberAttribute,
  });

  /**
   * Property height
   * @readonly
   *
   * @description
   * Inline-mode canvas height in CSS pixels.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly height: InputSignalWithTransform<number, unknown> = input<number, unknown>(420, {
    transform: numberAttribute,
  });

  /**
   * Property fixed
   * @readonly
   *
   * @description
   * Pins the canvas behind the page and enables page-scroll positioning.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly fixed: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property side
   * @readonly
   *
   * @description
   * Horizontal edge from which the planet enters the canvas frame.
   *
   * @type {InputSignal<PlanetSide>}
   */
  public readonly side: InputSignal<PlanetSide> = input<PlanetSide>('right');

  /**
   * Property interactive
   * @readonly
   *
   * @description
   * Enables the pointer lens when the device supports fine hover input.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly interactive: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property blend
   * @readonly
   *
   * @description
   * Blend amount between the lit scene and the glyph rendering.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly blend: InputSignalWithTransform<number, unknown> = input<number, unknown>(0.5, {
    transform: numberAttribute,
  });

  /**
   * Property quality
   * @readonly
   *
   * @description
   * Selects the canvas pixel ratio cap used by the WebGL renderer.
   *
   * @type {InputSignal<'medium' | 'high'>}
   */
  public readonly quality: InputSignal<'medium' | 'high'> = input<'medium' | 'high'>('medium');

  /**
   * Property cell
   * @readonly
   *
   * @description
   * Glyph cell size in CSS pixels, clamped by the renderer before drawing.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly cell: InputSignalWithTransform<number, unknown> = input<number, unknown>(10, {
    transform: numberAttribute,
  });

  /**
   * Property renderer
   * @readonly
   *
   * @description
   * Preferred renderer; WebGL requests may fall back to 2D after context loss.
   *
   * @type {InputSignal<PlanetRenderer>}
   */
  public readonly renderer: InputSignal<PlanetRenderer> = input<PlanetRenderer>('webgl');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name that exposes the canvas host as an image when provided.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property hostClass
   * @readonly
   *
   * @description
   * Host layout classes selected for fixed or inline mode, with a stationary gradient after renderer failure.
   *
   * @type {Signal<string>}
   */
  protected readonly hostClass: Signal<string> = computed<string>((): string =>
    [
      this.fixed()
        ? 'pointer-events-none fixed inset-0 z-0 block w-full light:opacity-42'
        : 'relative block w-full light:opacity-42',
      this.unavailable()
        ? 'bg-radial-[at_75%_100%] from-aurora-violet/15 via-aurora-blue/8 to-transparent'
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  /** A stationary token gradient replaces an unavailable decorative renderer. */
  protected readonly unavailable: WritableSignal<boolean> = signal<boolean>(false);

  /** Keeps renderer code lazy while making rejected and late loads explicit owner behavior. */
  private readonly loadRenderer: PlanetRendererLoader =
    inject<PlanetRendererLoader>(PLANET_RENDERER_LOADER);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Injected document used to resolve the browser window after rendering.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property host
   * @readonly
   *
   * @description
   * Injected host element that receives the renderer canvas.
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector passed to the reactive effect created after rendering.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Lifecycle reference used to unregister media query listeners.
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property fallback
   * @readonly
   *
   * @description
   * Becomes true after WebGL initialization or context loss so later renders use 2D.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly fallback: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the renderer effect after the host renders, handles unavailable chunks and cancels pending
   * renderer work on cleanup. Late load results never mutate a destroyed or replaced view.
   */
  public constructor() {
    afterNextRender((): void => {
      const win: (Window & typeof globalThis) | null = this.document.defaultView;
      if (!win) return;
      const reduced: Signal<boolean> = this.media(win, '(prefers-reduced-motion: reduce)', false);
      const fine: Signal<boolean> = this.media(win, '(hover: hover) and (pointer: fine)', true);
      effect(
        (onCleanup): void => {
          const opts: PlanetOptions = {
            reduced: reduced(),
            fixed: this.fixed(),
            side: this.side() === 'left' ? ('left' as const) : ('right' as const),
            lens: this.interactive() && fine() && !reduced(),
            blend: Math.max(0, Math.min(1, this.blend())),
            quality: this.quality() === 'high' ? ('high' as const) : ('medium' as const),
            cell: Math.max(5, this.cell() || 10),
            forms: this.forms(),
            scale: this.scale() > 0 ? this.scale() : 1,
            lift: this.lift() > 0 ? this.lift() : 0,
          };
          const preferred: PlanetRenderer =
            this.fallback() || this.renderer() === '2d' ? '2d' : 'webgl';
          let cancelled: boolean = false;
          let stop: (() => void) | null = null;
          this.unavailable.set(false);
          const fail: () => void = (): void => {
            if (cancelled || this.destroyRef.destroyed) return;
            stop?.();
            stop = null;
            this.host.nativeElement
              .querySelectorAll('canvas')
              .forEach((canvas: HTMLCanvasElement): void => canvas.remove());
            this.host.nativeElement.setAttribute('data-renderer', 'static');
            this.unavailable.set(true);
          };
          void this.loadRenderer()
            .then(({ mountPlanet }): void => {
              if (cancelled || this.destroyRef.destroyed) return;
              stop = mountPlanet(
                this.host.nativeElement,
                opts,
                preferred,
                (used: PlanetRenderer): void => {
                  if (cancelled || this.destroyRef.destroyed) return;
                  if (used === '2d' && preferred === 'webgl') this.fallback.set(true);
                },
              );
            })
            .catch(fail);
          onCleanup((): void => {
            cancelled = true;
            stop?.();
          });
        },
        { injector: this.injector },
      );
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method media
   * @method media
   *
   * @description
   * Tracks a media query as a read-only signal and unregisters its listener with the component lifecycle.
   *
   * @returns {Signal<boolean>} Read-only signal updated by the media query, with the supplied fallback when unavailable.
   * @param {Window} win - Browser window that owns `matchMedia` and its change listener.
   * @param {string} query - Media feature query whose match state is exposed as a signal.
   * @param {boolean} fallback - Initial match value used when the browser does not implement `matchMedia`.
   */
  private media(win: Window, query: string, fallback: boolean): Signal<boolean> {
    const mq: MediaQueryList = win.matchMedia?.(query);
    if (!mq) return signal<boolean>(fallback).asReadonly();
    const value: WritableSignal<boolean> = signal<boolean>(mq.matches);
    const on: () => void = (): void => value.set(mq.matches);
    mq.addEventListener('change', on);
    this.destroyRef.onDestroy((): void => mq.removeEventListener('change', on));
    return value.asReadonly();
  }
  // #endregion
}
