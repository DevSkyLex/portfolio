import type { Rgb } from '@internal/content-web-ui/lib/models/rgb/rgb.type';
import {
  activeStep,
  aurora,
  clamp,
  hex,
  isLive,
  lerp,
  mix,
  rgba,
  sceneProgress,
  smoothProgress,
  timeSpan,
} from '@internal/content-web-ui/lib/timeline/utils/scene-maths/scene-maths.utils';
import type { Palette } from '@internal/content-web-ui/lib/timeline/models/palette/palette.interface';
import type { Span } from '@internal/content-web-ui/lib/timeline/models/span/span.interface';

/**
 * Type Ctx
 * @type Ctx
 *
 * @description
 * Canvas context used to draw the timeline scene.
 */
type Ctx = CanvasRenderingContext2D;

/**
 * Interface Item
 * @interface Item
 *
 * @description
 * Timeline span associated with the list item that receives active and past state attributes.
 */
interface Item extends Span {
  // #region Properties
  /**
   * Property li
   * @readonly
   *
   * @description
   * DOM list item whose state attributes mirror the canvas cursor.
   *
   * @type {HTMLElement}
   */
  readonly li: HTMLElement;
  // #endregion
}

/**
 * Interface Track
 * @interface Track
 *
 * @description
 * One education or experience row read from the timeline section markup.
 */
interface Track {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Track identifier used to select its ordered list in the section.
   *
   * @type {'edu' | 'xp'}
   */
  readonly key: 'edu' | 'xp';

  /**
   * Property row
   * @readonly
   *
   * @description
   * Vertical row index: education is above experience.
   *
   * @type {0 | 1}
   */
  readonly row: 0 | 1;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible label copied from the ordered list.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Ordered time spans and DOM elements belonging to this track.
   *
   * @type {readonly Item[]}
   */
  readonly items: readonly Item[];

  /**
   * Property on
   *
   * @description
   * Current active item index, or a sentinel value before the first scene update.
   *
   * @type {number}
   */
  on: number;
  // #endregion
}

/**
 * Interface Fonts
 * @interface Fonts
 *
 * @description
 * Font families read from the section's computed CSS custom properties.
 */
interface Fonts {
  // #region Properties
  /**
   * Property sans
   * @readonly
   *
   * @description
   * Sans-serif family used for track labels.
   *
   * @type {string}
   */
  readonly sans: string;

  /**
   * Property mono
   * @readonly
   *
   * @description
   * Monospaced family used for year labels.
   *
   * @type {string}
   */
  readonly mono: string;
  // #endregion
}

/**
 * Function square
 *
 * @description
 * Draws a centered square mark on the scene canvas.
 *
 * @returns {void}
 * @param {Ctx} ctx - Canvas context receiving the mark.
 * @param {number} x - Horizontal center of the square in canvas CSS pixels.
 * @param {number} y - Vertical center of the square in canvas CSS pixels.
 * @param {number} s - Square side length in canvas CSS pixels.
 */
function square(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
}

/**
 * Function cross
 *
 * @description
 * Draws a centered cross from perpendicular canvas rectangles.
 *
 * @returns {void}
 * @param {Ctx} ctx - Canvas context receiving both rectangles.
 * @param {number} x - Horizontal center of the cross in canvas CSS pixels.
 * @param {number} y - Vertical center of the cross in canvas CSS pixels.
 * @param {number} s - Overall horizontal and vertical extent in canvas CSS pixels.
 * @param {number} w - Thickness of each perpendicular bar in canvas CSS pixels.
 */
function cross(ctx: Ctx, x: number, y: number, s: number, w: number): void {
  ctx.fillRect(x - s / 2, y - w / 2, s, w);
  ctx.fillRect(x - w / 2, y - s / 2, w, s);
}

/**
 * Function readPalette
 *
 * @description
 * Reads scene colour tokens from computed styles and supplies defaults when a token is invalid.
 *
 * @returns {Palette} Theme palette parsed from the element styles with per-token defaults.
 * @param {Element} el - Element whose computed theme tokens supply the canvas palette.
 */
function readPalette(el: Element): Palette {
  const cs: CSSStyleDeclaration = getComputedStyle(el);
  const g: (n: string) => string = (n: string): string => cs.getPropertyValue(n);
  return {
    star: hex(g('--fg'), [238, 237, 251]),
    muted: hex(g('--fg-muted'), [170, 168, 200]),
    pink: hex(g('--aurora-pink'), [255, 79, 174]),
    violet: hex(g('--aurora-violet'), [155, 109, 255]),
    blue: hex(g('--aurora-blue'), [79, 128, 255]),
    cyan: hex(g('--aurora-cyan'), [79, 230, 255]),
    void: hex(g('--surface'), [5, 5, 11]),
  };
}

/**
 * Function readFonts
 *
 * @description
 * Reads the scene font tokens and falls back to the bundled system font stacks.
 *
 * @returns {Fonts} Sans and monospace families, including their system fallbacks.
 * @param {Element} el - Element whose computed typography tokens supply the canvas font families.
 */
function readFonts(el: Element): Fonts {
  const cs: CSSStyleDeclaration = getComputedStyle(el);
  return {
    sans: cs.getPropertyValue('--font-sans').trim() || '"Geist Variable", system-ui, sans-serif',
    mono:
      cs.getPropertyValue('--font-mono').trim() || '"Geist Mono Variable", ui-monospace, monospace',
  };
}

/**
 * Function dotSphere
 *
 * @description
 * Draws a square-cell sphere shaded by a normalized light vector for education markers.
 *
 * @returns {void}
 * @param {Ctx} ctx - Canvas context used to draw the square-cell sphere.
 * @param {Palette} P - Palette supplying the surface gradient and star highlight colours.
 * @param {number} cx - Horizontal center of the sphere in canvas CSS pixels.
 * @param {number} cy - Vertical center of the sphere in canvas CSS pixels.
 * @param {number} R - Sphere radius in canvas CSS pixels.
 * @param {number} lx - Horizontal component of the lighting direction.
 * @param {number} ly - Vertical component of the lighting direction.
 * @param {number} lz - Depth component of the lighting direction.
 * @param {number} rot - Rotation offset in radians applied to the sphere longitude.
 * @param {number} colT - Normalized aurora position used to colour this marker.
 * @param {boolean} glow - When true, uses the glow shading instead of directional lighting.
 */
function dotSphere(
  ctx: Ctx,
  P: Palette,
  cx: number,
  cy: number,
  R: number,
  lx: number,
  ly: number,
  lz: number,
  rot: number,
  colT: number,
  glow: boolean,
): void {
  if (R < 1.5) {
    ctx.fillStyle = rgba(aurora(P, colT), 0.9);
    square(ctx, cx, cy, Math.max(1.5, R * 1.6));
    return;
  }
  const N: number = Math.max(5, Math.min(26, Math.round(R / 3.2)));
  const cell: number = (R / N) * 2;
  const lm: number = Math.hypot(lx, ly, lz) || 1;
  lx /= lm;
  ly /= lm;
  lz /= lm;
  for (let gy: number = -N; gy < N; gy++) {
    for (let gx: number = -N; gx < N; gx++) {
      const u: number = (gx + 0.5) / N;
      const v: number = (gy + 0.5) / N;
      const q: number = u * u + v * v;
      if (q >= 1) continue;
      const nz: number = Math.sqrt(1 - q);
      const lon: number = Math.atan2(u, nz) + rot;
      const lat: number = Math.asin(-v);
      const band: number = 0.5 + 0.5 * Math.sin(lat * 5 + Math.sin(lon * 2 + lat) * 1.3);
      const d: number = glow ? 0.75 + 0.25 * nz : Math.max(0, u * lx + v * ly + nz * lz);
      const val: number = d * (0.5 + 0.5 * band) + 0.04;
      const s: number = cell * 0.92 * Math.pow(clamp(val * 1.3, 0, 1), 0.8);
      if (s < 0.5) continue;
      ctx.fillStyle = rgba(
        mix(
          aurora(P, colT + (u - v) * 0.12),
          P.star,
          glow ? 0.35 + 0.4 * nz : Math.max(0, d - 0.8) * 2,
        ),
        1,
      );
      square(ctx, cx + u * R, cy + v * R, s);
    }
  }
}

/**
 * Function readTracks
 *
 * @description
 * Reads the education and experience lists in fixed row order, including each step's data time bounds.
 *
 * @returns {[Track, Track]} Education and experience tracks in fixed row order.
 * @param {HTMLElement} sec - Timeline section containing `ol[data-track]` lists and their step data attributes.
 */
function readTracks(sec: HTMLElement): [Track, Track] {
  const read: (key: Track['key'], row: Track['row']) => Track = (
    key: Track['key'],
    row: Track['row'],
  ): Track => {
    const ol: HTMLElement | null = sec.querySelector<HTMLElement>(`ol[data-track="${key}"]`);
    const lis: HTMLElement[] = Array.from(ol?.querySelectorAll<HTMLElement>(':scope > li') ?? []);
    return {
      key,
      row,
      label: ol?.getAttribute('aria-label') ?? '',
      items: lis.map((li: HTMLElement): { li: HTMLElement; a: number; b: number } => ({
        li,
        a: parseFloat(li.getAttribute('data-start') ?? ''),
        b: parseFloat(li.getAttribute('data-end') ?? ''),
      })),
      on: -2,
    };
  };
  return [read('edu', 0), read('xp', 1)];
}

/**
 * Interface Scene
 * @interface Scene
 *
 * @description
 * Canvas scene contract consumed by the animation lifecycle.
 */
interface Scene {
  // #region Methods
  /**
   * Method draw
   * @method draw
   *
   * @description
   * Draws the scene at the supplied dimensions, scroll progress and animation time.
   *
   * @returns {void}
   * @param {Ctx} ctx - Canvas context to clear and paint for this frame.
   * @param {number} w - Canvas width in CSS pixels.
   * @param {number} h - Canvas height in CSS pixels.
   * @param {number} p - Normalized section scroll progress for this frame.
   * @param {number} t - Animation time in seconds.
   */
  draw(ctx: Ctx, w: number, h: number, p: number, t: number): void;
  // #endregion
}

/**
 * Function parallel
 *
 * @description
 * Creates the timeline scene model and returns its canvas drawing operation.
 *
 * @returns {Scene} Scene model that draws the tracks and updates each step state.
 * @param {Palette} P - Palette used for canvas fills and marker colours.
 * @param {Fonts} fonts - Font families used for track and year labels.
 * @param {HTMLElement} sec - Section whose ordered lists define the education and experience tracks.
 */
function parallel(P: Palette, fonts: Fonts, sec: HTMLElement): Scene {
  const tracks: [Track, Track] = readTracks(sec);
  const [T0, T1] = timeSpan(tracks.map((tk: Track): readonly Item[] => tk.items));
  let pS: number | null = null;
  let lastT: number = 0;
  return {
    draw(ctx: CanvasRenderingContext2D, w: number, h: number, p: number, t: number): void {
      const dt: number = t - lastT;
      lastT = t;
      pS = smoothProgress(pS, p, dt);
      const T: number = lerp(T0, T1, pS);

      // Cards: on each line, the step that contains the instant T (the latest one when two overlap).
      for (const tk of tracks) {
        const on: number = activeStep(tk.items, T);
        if (on !== tk.on) {
          tk.on = on;
          tk.items.forEach((it: Item, k: number): void => {
            it.li.toggleAttribute('data-on', k === on);
            it.li.toggleAttribute('data-past', it.b < T && k !== on);
          });
        }
      }
      const mob: boolean = w < 768;
      const D: number = mob ? w * 0.5 : Math.min(w * 0.27, 400);
      const ax: number = mob ? w * 0.5 : w * 0.66;
      const ys: readonly [number, number] = mob ? [h * 0.29, h * 0.42] : [h * 0.38, h * 0.68];
      // Transparent: the page background runs on behind the timeline, without a starfield of its own.
      ctx.clearRect(0, 0, w, h);
      const fadeX: (px: number) => number = (px: number): number =>
        mob ? 1 : clamp((px - w * 0.4) / (w * 0.12), 0, 1);
      const X: (yr: number) => number = (yr: number): number => ax + (yr - T) * D;

      // Time axis: one mark per year under the bottom line.
      ctx.font = `500 12px ${fonts.mono}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let yr: number = Math.floor(T0); yr <= Math.ceil(T1); yr++) {
        const tx: number = X(yr);
        const fa0: number = fadeX(tx);
        if (tx < -40 || tx > w + 40 || fa0 <= 0.01) continue;
        ctx.fillStyle = rgba(P.muted, 0.35 * fa0);
        for (let yy: number = ys[0] - 18; yy <= ys[1] + 18; yy += 9) square(ctx, tx, yy, 1.2);
        ctx.fillStyle = rgba(P.muted, 0.75 * fa0);
        ctx.fillText(String(yr), tx, ys[1] + 34);
      }
      for (const tk of tracks) {
        const y: number = ys[tk.row];

        // The line: coloured behind the cursor, dotted ahead of it.
        for (let lx: number = 0; lx < w; lx += 7) {
          const at: number = T + (lx - ax) / D;
          if (at < T0 || at > T1) continue;
          const fa: number = fadeX(lx);
          if (fa <= 0.01) continue;
          if (at <= T) {
            ctx.fillStyle = rgba(aurora(P, (at - T0) / (T1 - T0)), 0.55 * fa);
            square(ctx, lx, y, 1.8);
          } else {
            ctx.fillStyle = rgba(P.muted, 0.25 * fa);
            square(ctx, lx, y, 1.4);
          }
        }

        // The steps: a bar of squares from start to end, a marker at the start.
        tk.items.forEach((it: Item, k: number): void => {
          const x0: number = X(it.a);
          const x1: number = X(it.b);
          if (x1 < -40 || x0 > w + 40) return;
          const active: boolean = k === tk.on;
          const done: boolean = it.b < T;
          const col: Rgb = aurora(P, (it.a - T0) / (T1 - T0));
          const al: 1 | 0.3 | 0.6 = active ? 1 : done ? 0.6 : 0.3;
          for (let bx: number = Math.max(x0, 0); bx <= Math.min(x1, w); bx += 6) {
            const fb: number = fadeX(bx);
            if (fb <= 0.01) continue;
            ctx.fillStyle = rgba(col, al * fb * (bx <= ax ? 1 : 0.55));
            ctx.fillRect(bx - 2.5, y - 3, 5, 6);
          }
          const fm: number = fadeX(x0);
          if (fm <= 0.01) return;
          ctx.globalAlpha = fm * (active || done ? 1 : 0.5);
          const Rb: 11 | 14 = mob ? 11 : 14;
          if (tk.key === 'edu') {
            dotSphere(
              ctx,
              P,
              x0,
              y,
              Rb,
              -0.55,
              -0.45,
              0.7,
              t * 0.12 + k,
              (it.a - T0) / (T1 - T0),
              false,
            );
          } else {
            ctx.fillStyle = rgba(P.void);
            ctx.fillRect(x0 - Rb, y - Rb, Rb * 2, Rb * 2);
            ctx.fillStyle = rgba(col, 1);
            for (let e: number = 0; e < 24; e++) {
              const u: number = (e % 6) / 6;
              const ed: number = Math.floor(e / 6);
              const qx: number = ed === 0 ? -1 + 2 * u : ed === 1 ? 1 : ed === 2 ? 1 - 2 * u : -1;
              const qy: number = ed === 0 ? -1 : ed === 1 ? -1 + 2 * u : ed === 2 ? 1 : 1 - 2 * u;
              square(ctx, x0 + qx * Rb * 0.8, y + qy * Rb * 0.8, 2.6);
            }
            ctx.fillStyle = rgba(P.star, 1);
            cross(ctx, x0, y, Rb * 0.7, 1.5);
          }
          ctx.globalAlpha = 1;
        });

        // Name of the line, discreet, at the edge of the fade.
        ctx.font = `500 13px ${fonts.sans}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = rgba(P.muted, 0.85);
        ctx.fillText(tk.label, mob ? 20 : w * 0.46, y - 22);
      }

      // Time cursor: a vertical dotted line and the current year.
      ctx.fillStyle = rgba(P.star, 0.55);
      for (let cy: number = ys[0] - 46; cy <= ys[1] + 22; cy += 6) square(ctx, ax, cy, 1.6);
      const both: boolean = tracks[0].on >= 0 && tracks[1].on >= 0;
      for (const tk of tracks) {
        if (tk.on < 0) continue;
        ctx.fillStyle = rgba(P.star, 0.2);
        square(ctx, ax, ys[tk.row], 18);
        ctx.fillStyle = rgba(P.star, 1);
        square(ctx, ax, ys[tk.row], 7);
      }
      if (both) {
        // Education and experience at the same time: the cursor lights up between the two lines.
        for (let cy2: number = ys[0] + 12; cy2 <= ys[1] - 12; cy2 += 6) {
          ctx.fillStyle = rgba(P.cyan, 0.7);
          square(ctx, ax, cy2, 2.2);
        }
      }
      ctx.font = `600 14px ${fonts.mono}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(P.star, 0.95);
      ctx.fillText(String(Math.floor(T)), ax, ys[0] - 54);
    },
  };
}

/**
 * Function mountParallelScene
 *
 * @description
 * Mounts the canvas scene using the section's track and time-bound data attributes; returns null when the required browser canvas context is unavailable.
 *
 * @returns {(() => void) | null} Teardown callback, or null when a 2D canvas context is unavailable.
 * @param {HTMLElement} sec - Section containing the canvas and track lists; the function returns null if its 2D context is unavailable.
 */
export function mountParallelScene(sec: HTMLElement): (() => void) | null {
  const doc: Document = sec.ownerDocument;
  const win: (Window & typeof globalThis) | null = doc.defaultView;
  const cv: HTMLCanvasElement | null = sec.querySelector('canvas');
  const ctx: CanvasRenderingContext2D | null | undefined = cv?.getContext('2d');
  if (!win || !cv || !ctx) return null;
  return run(sec, win, cv, ctx);
}

/**
 * Function run
 *
 * @description
 * Connects resize, scroll, visibility, theme and reduced-motion lifecycle events to the scene renderer.
 *
 * @returns {() => void} Cleanup that cancels rendering and unregisters observers and event listeners.
 * @param {HTMLElement} sec - Section whose geometry, attributes and track lists control the animation.
 * @param {Window} win - Owning browser window used for animation, viewport and event lifecycle.
 * @param {HTMLCanvasElement} cv - Canvas element resized and drawn by the scene.
 * @param {Ctx} ctx - 2D context obtained from `cv` and used for all scene drawing.
 */
function run(sec: HTMLElement, win: Window, cv: HTMLCanvasElement, ctx: Ctx): () => void {
  const doc: Document = sec.ownerDocument;
  const root: HTMLElement = doc.documentElement;
  const P: Palette = readPalette(root);
  const fonts: Fonts = readFonts(root);
  const rm: boolean = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const poster: number = parseFloat(sec.getAttribute('data-poster') ?? '0.6');
  const scene: Scene = parallel(P, fonts, sec);
  let live: boolean = false;
  let raf: number = 0;
  let dead: boolean = false;
  let visible: boolean = true;
  let w: number = 0;
  let h: number = 0;

  function resize(): void {
    const r: DOMRect = cv.getBoundingClientRect();
    const dpr: number = Math.min(win.devicePixelRatio || 1, 1.5);
    if (r.width < 2 || r.height < 2) return;
    w = r.width;
    h = r.height;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function render(t: number): void {
    if (!w) return;
    let p: number = poster;
    if (live) {
      const r: DOMRect = sec.getBoundingClientRect();
      p = sceneProgress(r.top, r.height, win.innerHeight);
    }
    sec.style.setProperty('--sp', p.toFixed(4));
    scene.draw(ctx, w, h, p, t);
  }
  function check(): void {
    const l: boolean = isLive(rm, win.innerHeight, root.scrollHeight);
    if (l !== live) {
      live = l;
      sec.toggleAttribute('data-live', l);
      resize();
    }
  }
  function frame(now: number): void {
    raf = 0;
    if (dead) return;
    const t: number = rm ? 0 : now / 1000;
    if (visible) render(t);
    if (visible && !rm) raf = win.requestAnimationFrame(frame);
  }
  function kick(): void {
    if (!raf && !dead) raf = win.requestAnimationFrame(frame);
  }
  function paintNow(): void {
    render(0);
  }
  const io: IntersectionObserver | null =
    'IntersectionObserver' in win
      ? new IntersectionObserver((es: IntersectionObserverEntry[]): void => {
          for (const e of es) visible = e.isIntersecting;
          kick();
        })
      : null;
  io?.observe(sec);
  function onResize(): void {
    check();
    resize();
    paintNow();
    kick();
  }
  win.addEventListener('resize', onResize);
  win.addEventListener('scroll', kick, { passive: true });
  check();
  resize();
  paintNow();
  kick();
  const late: number = win.setTimeout(onResize, 900);

  // Theme switch: colours are read again in place (the scene reads P on every frame).
  const themeObs: MutationObserver = new MutationObserver((): void => {
    Object.assign(P, readPalette(root));
    kick();
  });
  themeObs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // Canvas labels wait for the web fonts.
  void doc.fonts?.ready.then((): void => {
    if (dead) return;
    resize();
    paintNow();
  });
  return (): void => {
    dead = true;
    win.clearTimeout(late);
    if (raf) win.cancelAnimationFrame(raf);
    io?.disconnect();
    themeObs.disconnect();
    win.removeEventListener('resize', onResize);
    win.removeEventListener('scroll', kick);
  };
}
