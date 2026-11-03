import type { PlanetGeometry } from '@internal/content-web-ui/lib/planet/models/planet-geometry/planet-geometry.interface';
import type { PlanetForm } from '@internal/content-web-ui/lib/planet/models/planet-form/planet-form.type';
/*
 * Renderers of the ASCII planet (port of Orbite.AsciiPlanet): WebGL in two passes, 2D canvas as the fallback.
 * Loaded on demand by AsciiPlanetComponent, so it stays out of the initial bundle.
 */
import type { Rgb } from '@internal/content-web-ui/lib/models/rgb/rgb.type';
import { FormBuckets } from '@internal/content-web-ui/lib/planet/utils/form-buckets/form-buckets';
import type { PlanetOptions } from '@internal/content-web-ui/lib/planet/models/planet-options/planet-options.interface';
import type { PlanetRamp } from '@internal/content-web-ui/lib/planet/models/planet-ramp/planet-ramp.type';
import type { PlanetRenderer } from '@internal/content-web-ui/lib/planet/models/planet-renderer/planet-renderer.type';
import {
  addForm,
  auroraAt,
  colorKey,
  fbm,
  formLevel,
  formsOf,
  hash2,
  parseColor,
  planetGeometry,
} from '@internal/content-web-ui/lib/planet/utils/planet-math/planet-math.utils';

/**
 * Interface PlanetState
 * @interface PlanetState
 *
 * @description
 * Frame state shared by the 2D and WebGL planet renderers.
 */
interface PlanetState {
  // #region Properties
  /**
   * Property time
   * @readonly
   *
   * @description
   * Elapsed animation time in seconds.
   *
   * @type {number}
   */
  time: number;

  /**
   * Property scroll
   * @readonly
   *
   * @description
   * Normalized page scroll used for pinned planet placement.
   *
   * @type {number}
   */
  scroll: number;

  /**
   * Property pointer
   * @readonly
   *
   * @description
   * Pointer position relative to the host, or null when outside the lens area.
   *
   * @type {{ x: number; y: number } | null}
   */
  pointer: { x: number; y: number } | null;
  // #endregion
}

/**
 * Interface Palette
 * @interface Palette
 *
 * @description
 * Theme colours sampled by the planet renderer.
 */
interface Palette {
  // #region Properties
  /**
   * Property stops
   * @readonly
   *
   * @description
   * Ordered pink, violet, blue and cyan aurora colours.
   *
   * @type {readonly [Rgb, Rgb, Rgb, Rgb]}
   */
  stops: readonly [Rgb, Rgb, Rgb, Rgb];

  /**
   * Property star
   * @readonly
   *
   * @description
   * Bright star and highlight colour.
   *
   * @type {Rgb}
   */
  star: Rgb;

  /**
   * Property signal
   * @readonly
   *
   * @description
   * Pointer lens accent colour.
   *
   * @type {Rgb}
   */
  signal: Rgb;
  // #endregion
}

/**
 * Type Stop
 * @type Stop
 *
 * @description
 * Cleanup function returned by a renderer lifecycle operation.
 */
type Stop = () => void;

/**
 * Function cssValue
 *
 * @description
 * Reads a computed CSS custom property because canvas drawing cannot resolve CSS variable references directly.
 *
 * @returns {string} Trimmed computed token value, or the fallback when the token is empty.
 * @param {string} name - CSS custom property name to read from computed styles.
 * @param {string} fallback - Value returned when the property is empty.
 * @param {Element} el - Optional style source element; the document root is used by default.
 */
function cssValue(name: string, fallback: string, el?: Element): string {
  const v: string = getComputedStyle(el ?? document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * Function cssTime
 *
 * @description
 * Converts a CSS duration token to milliseconds, using the fallback for missing or invalid values.
 *
 * @returns {number} Duration converted to milliseconds, or the fallback for missing or invalid tokens.
 * @param {string} name - CSS custom property containing a duration.
 * @param {number} fallback - Fallback duration in milliseconds for an empty or invalid token.
 */
function cssTime(name: string, fallback: number): number {
  const v: string = cssValue(name, '');
  const n: number = parseFloat(v);
  if (!v || isNaN(n)) return fallback;
  return /ms$/.test(v) ? n : n * 1000;
}

/**
 * Function readPalette
 *
 * @description
 * Reads aurora and accent colours from computed styles with fixed RGB defaults.
 *
 * @returns {Palette} Theme palette parsed from the element styles with per-token defaults.
 * @param {Element} el - Element whose computed custom properties supply the theme colours.
 */
function readPalette(el: Element): Palette {
  const cs: CSSStyleDeclaration = getComputedStyle(el);
  const g: (name: string, fallback: Rgb) => Rgb = (name: string, fallback: Rgb): Rgb =>
    parseColor(cs.getPropertyValue(name)) ?? fallback;
  return {
    stops: [
      g('--aurora-pink', [255, 79, 174]),
      g('--aurora-violet', [155, 109, 255]),
      g('--aurora-blue', [79, 128, 255]),
      g('--aurora-cyan', [79, 230, 255]),
    ],
    star: g('--star', [238, 237, 251]),
    signal: g('--signal', [79, 230, 255]),
  };
}

/**
 * Function fitCanvas
 *
 * @description
 * Sizes a 2D canvas to its element and applies the device pixel ratio transform.
 *
 * @returns {{ w: number; h: number }} Canvas dimensions in CSS pixels after applying the device pixel ratio.
 * @param {HTMLCanvasElement} cv - Canvas element whose backing dimensions are updated.
 * @param {CanvasRenderingContext2D} ctx - 2D context whose transform is scaled to the device pixel ratio.
 * @param {Element} el - Element whose bounding rectangle determines the CSS canvas dimensions.
 */
function fitCanvas(
  cv: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  el: Element,
): { w: number; h: number } {
  const r: DOMRect = el.getBoundingClientRect();
  const w: number = Math.max(1, Math.round(r.width));
  const hh: number = Math.max(1, Math.round(r.height));
  const dpr: number = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(hh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h: hh };
}

/**
 * Function watchCanvas
 *
 * @description
 * Notifies the renderer after element resizing or a document theme change and returns observer cleanup.
 *
 * @returns {Stop} Cleanup that disconnects resize and theme observers.
 * @param {Element} el - Element monitored for size and root theme changes.
 * @param {(why: 'size' | 'theme') => void} redraw - Callback invoked with the cause that requires the renderer to refresh.
 */
function watchCanvas(el: Element, redraw: (why: 'size' | 'theme') => void): Stop {
  const ro: ResizeObserver = new ResizeObserver((): void => redraw('size'));
  ro.observe(el);
  const mo: MutationObserver = new MutationObserver((): void => redraw('theme'));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return (): void => {
    ro.disconnect();
    mo.disconnect();
  };
}

/**
 * Function planetLoop
 *
 * @description
 * Runs shared renderer updates at most 30 frames per second and pauses while hidden, offscreen or reduced motion is enabled.
 *
 * @returns {{ redraw: () => void; stop: () => void }} Frame controls for redraw and lifecycle teardown.
 * @param {HTMLElement} el - Planet host used for bounds, pointer coordinates and visibility observation.
 * @param {PlanetOptions} opts - Rendering settings controlling reduced motion, pinned mode and the pointer lens.
 * @param {(s: PlanetState) => void} render - Callback drawing one frame from the current time, scroll and pointer state.
 */
function planetLoop(
  el: HTMLElement,
  opts: PlanetOptions,
  render: (s: PlanetState) => void,
): { redraw: () => void; stop: Stop } {
  const state: PlanetState = { time: 0, scroll: 0, pointer: null };
  let raf: number = 0;
  let last: number = 0;
  let alive: boolean = true;
  let visible: boolean = true;
  const t0: number = performance.now();
  const pointerHost: EventTarget = opts.fixed ? document.documentElement : el;
  const moveHost: EventTarget = opts.fixed ? window : el;
  const tick: (now: number) => void = (now: number): void => {
    raf = 0;
    if (!alive) return;
    if (now - last >= 33) {
      last = now;
      state.time = (now - t0) / 1000;
      render(state);
    }
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  const start: () => void = (): void => {
    if (!raf && alive && !opts.reduced && visible && !document.hidden) {
      raf = requestAnimationFrame(tick);
    }
  };
  const stop: () => void = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onScroll: () => void = (): void => {
    if (opts.reduced) return;
    state.scroll = Math.max(0, Math.min(1, window.scrollY / Math.max(1, window.innerHeight)));
  };
  const onMove: (e: Event) => void = (e: Event): void => {
    const p: PointerEvent = e as PointerEvent;
    if (p.pointerType === 'touch') return;
    const r: DOMRect = el.getBoundingClientRect();
    state.pointer = { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const onOut: () => void = (): void => {
    state.pointer = null;
  };
  const onVisibility: () => void = (): void => {
    if (document.hidden) stop();
    else start();
  };
  if (opts.lens) {
    moveHost.addEventListener('pointermove', onMove);
    pointerHost.addEventListener('pointerleave', onOut);
  }
  if (opts.fixed) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  const target: HTMLElement | null = opts.fixed ? el.parentElement : el;
  const io: IntersectionObserver | null = target
    ? new IntersectionObserver((entries: IntersectionObserverEntry[]): void => {
        visible = entries.at(-1)?.isIntersecting ?? false;
        if (visible) start();
        else stop();
      })
    : null;
  if (io && target) io.observe(target);
  document.addEventListener('visibilitychange', onVisibility);
  render(state);
  start();
  return {
    redraw: (): void => render(state),
    stop: (): void => {
      alive = false;
      stop();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      moveHost.removeEventListener('pointermove', onMove);
      pointerHost.removeEventListener('pointerleave', onOut);
    },
  };
}

/**
 * Function startPlanet2D
 *
 * @description
 * Starts the per-cell 2D renderer, returning null when the canvas has no 2D context.
 *
 * @returns {Stop | null} Renderer cleanup, or null when a 2D context is unavailable.
 * @param {HTMLElement} el - Planet host whose bounds and theme are rendered.
 * @param {HTMLCanvasElement} cv - Canvas that receives the 2D renderer output.
 * @param {PlanetOptions} opts - Settings for geometry, glyph density, motion and pointer response.
 */
function startPlanet2D(el: HTMLElement, cv: HTMLCanvasElement, opts: PlanetOptions): Stop | null {
  const ctx: CanvasRenderingContext2D | null = cv.getContext('2d');
  if (!ctx) return null;
  let box: { w: number; h: number } = fitCanvas(cv, ctx, el);
  let pal: Palette = readPalette(el);
  const ramp: PlanetRamp = formsOf(opts.forms);
  const period: number = cssTime('--dur-drift', 90000) / 1000;
  const C: number = opts.cell;

  const draw: (state: PlanetState) => void = (state: PlanetState): void => {
    const w: number = box.w;
    const hh: number = box.h;
    const cols: number = Math.ceil(w / C);
    const rows: number = Math.ceil(hh / C);
    const t: number = (state.time / period) * 6;
    const g: PlanetGeometry = planetGeometry(w, hh, opts.side, state.scroll, opts.scale, opts.lift);
    const R: number = g.R;
    const atm: number = R * 0.075;
    const fade: number = opts.fixed ? 1 - 0.65 * state.scroll : 1;
    const pointer: { x: number; y: number } | null = state.pointer;
    const B: FormBuckets = new FormBuckets();
    for (let row: number = 0; row < rows; row++) {
      const py: number = row * C + C / 2;
      for (let col: number = 0; col < cols; col++) {
        const px: number = col * C + C / 2;
        const dx: number = px - g.x;
        const dy: number = py - g.y;
        const d: number = Math.sqrt(dx * dx + dy * dy);
        let b: number = 0;
        let white: boolean = false;
        if (d > R + atm) {
          if (hash2(col * 7 + 3, row * 13 + 1) > 0.994) b = 0.2 + 0.4 * hash2(row, col);
        } else if (d > R) {
          const k0: number = 1 - (d - R) / atm;
          b = k0 * k0;
        } else {
          const depth: number = Math.min(1, (R - d) / (R * 0.55));
          const u: number = Math.atan2(dy, dx) * 36 + t + state.scroll * 4;
          const v: number = depth * 4.5;
          const n: number = fbm(u + 1.4 * fbm(u * 0.5 + 3.7, v + t * 0.25), v * 2.2 + 1.3);
          const limb: number = Math.pow(1 - depth, 1.8);
          b = limb * (0.45 + 0.65 * n) + 0.18 * n * (1 - limb);
          if (b > 1) b = 1;
          white = depth < 0.035 && n > 0.58;
        }
        if (pointer) {
          const qx: number = px - pointer.x;
          const qy: number = py - pointer.y;
          const pd: number = Math.sqrt(qx * qx + qy * qy);
          if (pd < 120) {
            const k: number = 1 - pd / 120;
            b = Math.min(1, b + k * k * 0.9);
          }
        }
        if (b < 0.05) continue;
        const hue: number = Math.round(Math.min(1, py / hh + (1 - b) * 0.1) * 24) / 24;
        const alpha: number = (0.2 + 0.8 * b) * fade;
        const color: string =
          white || b > 0.97
            ? colorKey(pal.star, b * fade)
            : colorKey(auroraAt(pal.stops, hue), alpha);
        B.push(color, formLevel(b, ramp), col * C, row * C);
      }
    }
    ctx.clearRect(0, 0, w, hh);
    B.draw(ctx, ramp, C);
  };

  const loop: { redraw: () => void; stop: Stop } = planetLoop(el, opts, draw);
  const unwatch: Stop = watchCanvas(el, (why: 'size' | 'theme'): void => {
    if (why === 'size') box = fitCanvas(cv, ctx, el);
    if (why === 'theme') pal = readPalette(el);
    loop.redraw();
  });
  return (): void => {
    loop.stop();
    unwatch();
  };
}

/**
 * Constant GL_HEAD
 *
 * @description
 * Shared fragment shader preamble with a precision fallback for WebGL implementations.
 */
const GL_HEAD: string = [
  '#ifdef GL_FRAGMENT_PRECISION_HIGH',
  'precision highp float;',
  '#else',
  'precision mediump float;',
  '#endif',
  'varying vec2 vUv;',
].join('\n');

/**
 * Constant GL_VERT
 *
 * @description
 * Vertex shader that maps the full-screen quad to normalized texture coordinates.
 */
const GL_VERT: string =
  'attribute vec2 aPos;\nvarying vec2 vUv;\nvoid main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

/**
 * Constant GL_SCENE
 *
 * @description
 * First WebGL pass that renders the lit aurora planet and its surrounding stars at reduced resolution.
 */
const GL_SCENE: string = [
  GL_HEAD,
  'uniform vec2 uView;',
  'uniform float uTime;',
  'uniform float uScroll;',
  'uniform vec2 uPlanet;',
  'uniform float uRadius;',
  'uniform vec3 uC0;',
  'uniform vec3 uC1;',
  'uniform vec3 uC2;',
  'uniform vec3 uC3;',
  'uniform vec3 uStar;',
  'float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'float noise(vec2 p) {',
  '  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
  '}',
  'float fbm(vec2 p) {',
  '  float s = 0.0; float a = 0.5;',
  '  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }',
  '  return s;',
  '}',
  'vec3 aurora(float t) {',
  '  t = clamp(t, 0.0, 1.0);',
  '  if (t < 0.38) return mix(uC0, uC1, t / 0.38);',
  '  if (t < 0.7) return mix(uC1, uC2, (t - 0.38) / 0.32);',
  '  return mix(uC2, uC3, (t - 0.7) / 0.3);',
  '}',
  'void main() {',
  '  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uView;',
  '  vec2 d = (px - uPlanet) / uRadius;',
  '  float r = length(d);',
  '  float hueT = clamp(px.y / uView.y, 0.0, 1.0);',
  '  vec3 col = vec3(0.0);',
  '  if (r < 1.0) {',
  '    float z = sqrt(max(0.0, 1.0 - r * r));',
  '    vec3 n = vec3(d.x, -d.y, z);',
  '    float lon = atan(n.x, n.z) + uTime * 0.02 + uScroll * 0.9;',
  '    float lat = asin(clamp(n.y, -1.0, 1.0));',
  '    vec2 q = vec2(lon * 2.4, lat * 3.2);',
  '    vec2 w = vec2(fbm(q * 0.8 + vec2(0.0, uTime * 0.03)), fbm(q * 0.8 + vec2(5.2, 1.3 - uTime * 0.02)));',
  '    float m = fbm(q * 1.6 + 3.0 * w);',
  '    float swirl = smoothstep(0.25, 0.8, m);',
  '    float bands = 0.5 + 0.5 * sin(lat * 10.0 + m * 9.0 + w.x * 4.0);',
  '    vec3 L = normalize(vec3(-0.55, 0.62, 0.55));',
  '    float diff = clamp(dot(n, L), 0.0, 1.0);',
  '    float rim = pow(1.0 - z, 2.8);',
  '    float tone = mix(swirl, bands * swirl, 0.3);',
  '    vec3 base = aurora(hueT * 0.5 + tone * 0.5) * (0.04 + 0.6 * tone * tone);',
  '    col = base * (0.2 + 0.8 * diff) + aurora(hueT) * rim * (0.5 + 1.2 * diff);',
  '    col += uStar * pow(rim, 4.0) * diff * 0.8;',
  '  } else {',
  '    float g = exp(-(r - 1.0) * 16.0);',
  '    col = aurora(hueT) * g;',
  '    vec2 cs = floor(px / 2.0);',
  '    float s = step(0.9985, hash(cs));',
  '    col += uStar * s * (0.55 + 0.45 * sin(uTime * 1.7 + hash(cs + 7.0) * 6.2831)) * (1.0 - g);',
  '  }',
  '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
  '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(lum * 1.6, 0.0, 1.0));',
  '}',
].join('\n');

/**
 * Constant GL_ASCII
 *
 * @description
 * Second WebGL pass that maps scene luminance to glyph atlas cells at full canvas resolution.
 */
const GL_ASCII: string = [
  GL_HEAD,
  'uniform sampler2D uScene;',
  'uniform sampler2D uGlyphs;',
  'uniform vec2 uView;',
  'uniform vec2 uCell;',
  'uniform float uCount;',
  'uniform float uMix;',
  'uniform vec2 uPointer;',
  'uniform vec3 uVoid;',
  'uniform vec3 uLens;',
  'uniform float uDay;',
  'uniform float uFade;',
  'void main() {',
  '  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uView;',
  '  vec2 cell = floor(px / uCell);',
  '  vec2 center = (cell + 0.5) * uCell;',
  '  vec4 sc = texture2D(uScene, vec2(center.x / uView.x, 1.0 - center.y / uView.y));',
  '  float lens = 1.0 - smoothstep(0.0, 130.0, length(center - uPointer));',
  '  float lum = clamp(sc.a * (uDay > 0.5 ? 2.2 : 1.0) + lens * 0.55, 0.0, 0.999);',
  '  float idx = floor(lum * uCount);',
  '  vec2 inCell = fract(px / uCell);',
  '  float glyph = texture2D(uGlyphs, vec2((idx + inCell.x) / uCount, inCell.y)).a;',
  '  float peak = max(sc.r, max(sc.g, sc.b));',
  '  vec3 hue = peak > 0.04 ? sc.rgb / peak : uLens;',
  '  hue = mix(hue, uLens, lens * 0.35);',
  '  vec3 raw = texture2D(uScene, vUv).rgb;',
  '  vec3 col;',
  '  if (uDay > 0.5) {',
  '    col = mix(uVoid, hue * 0.62, glyph * smoothstep(0.03, 0.25, lum));',
  '  } else {',
  '    col = uVoid + raw * uMix * 0.6 + hue * glyph * (0.3 + 0.7 * lum) * (1.0 + lens * 0.8);',
  '  }',
  '  gl_FragColor = vec4(mix(uVoid, col, uFade), 1.0);',
  '}',
].join('\n');

/**
 * Interface GlProgram
 * @interface GlProgram
 *
 * @description
 * Linked WebGL program and lookup for its active uniform locations.
 */
interface GlProgram {
  // #region Properties
  /**
   * Property p
   * @readonly
   *
   * @description
   * Linked WebGL program used for one rendering pass.
   *
   * @type {WebGLProgram}
   */
  p: WebGLProgram;

  /**
   * Property u
   * @readonly
   *
   * @description
   * Resolves a uniform location by its shader name.
   *
   * @type {(name: string) => WebGLUniformLocation | null}
   */
  u: (name: string) => WebGLUniformLocation | null;
  // #endregion
}

/**
 * Function glProgram
 *
 * @description
 * Compiles and links a WebGL program, throwing when shader or link compilation fails.
 *
 * @returns {GlProgram} Linked program and active uniform lookup; throws when compilation or linking fails.
 * @param {WebGLRenderingContext} gl - WebGL context that compiles and links the shader program.
 * @param {string} fs - Fragment shader source paired with the shared vertex shader.
 */
function glProgram(gl: WebGLRenderingContext, fs: string): GlProgram {
  const shader: (type: number, src: string) => WebGLShader = (
    type: number,
    src: string,
  ): WebGLShader => {
    const s: WebGLShader | null = gl.createShader(type);
    if (!s) throw new Error('shader');
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p: WebGLProgram = gl.createProgram();
  if (!p) throw new Error('program');
  gl.attachShader(p, shader(gl.VERTEX_SHADER, GL_VERT));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || 'link');
  const locations: Map<string, WebGLUniformLocation | null> = new Map<
    string,
    WebGLUniformLocation | null
  >();
  const count: number = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i: number = 0; i < count; i++) {
    const info: WebGLActiveInfo | null = gl.getActiveUniform(p, i);
    if (info) locations.set(info.name, gl.getUniformLocation(p, info.name));
  }
  return { p, u: (name: string): WebGLUniformLocation | null => locations.get(name) ?? null };
}

/**
 * Function glTexture
 *
 * @description
 * Creates a linearly filtered texture clamped to its edges.
 *
 * @returns {WebGLTexture | null} Created texture, or null when WebGL cannot allocate one.
 * @param {WebGLRenderingContext} gl - WebGL context that creates and configures the texture.
 */
function glTexture(gl: WebGLRenderingContext): WebGLTexture | null {
  const t: WebGLTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/**
 * Constant rgb01
 *
 * @description
 * Converts byte-valued colour channels to normalized WebGL channel values.
 */
const rgb01: (c: Rgb) => [number, number, number] = (c: Rgb): [number, number, number] => [
  c[0] / 255,
  c[1] / 255,
  c[2] / 255,
];

/**
 * Function startPlanetGL
 *
 * @description
 * Starts the two-pass WebGL renderer and delegates to `onLost` when the context is lost.
 *
 * @returns {Stop | null} Renderer cleanup, or null when WebGL is unavailable.
 * @param {HTMLElement} el - Planet host used to size the canvas and read theme tokens.
 * @param {HTMLCanvasElement} cv - Canvas used to create the WebGL context.
 * @param {PlanetOptions} opts - Settings for pixel ratio, glyphs, geometry and blending.
 * @param {() => void} onLost - Fallback callback invoked after stopping the loop when the WebGL context is lost.
 */
function startPlanetGL(
  el: HTMLElement,
  cv: HTMLCanvasElement,
  opts: PlanetOptions,
  onLost: () => void,
): Stop | null {
  const gl: WebGLRenderingContext | null = cv.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const scene: GlProgram = glProgram(gl, GL_SCENE);
  const ascii: GlProgram = glProgram(gl, GL_ASCII);
  const quad: WebGLBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const sceneTex: WebGLTexture | null = glTexture(gl);
  const glyphTex: WebGLTexture | null = glTexture(gl);
  const fbo: WebGLFramebuffer = gl.createFramebuffer();
  const size: { w: number; h: number; sw: number; sh: number; dpr: number } = {
    w: 1,
    h: 1,
    sw: 1,
    sh: 1,
    dpr: 1,
  };
  const cell: { w: number; h: number } = { w: opts.cell, h: opts.cell };
  let count: number = 9;
  const period: number = cssTime('--dur-drift', 90000) / 1000;
  let pal: Palette;
  let voidC: Rgb;
  let lensC: Rgb;
  let day: number = 0;

  const resize: () => void = (): void => {
    const r: DOMRect = el.getBoundingClientRect();
    size.w = Math.max(1, Math.round(r.width));
    size.h = Math.max(1, Math.round(r.height));
    size.dpr = Math.min(window.devicePixelRatio || 1, opts.quality === 'high' ? 2 : 1.5);
    cv.width = Math.round(size.w * size.dpr);
    cv.height = Math.round(size.h * size.dpr);

    // Keep the lighting pass at one-third resolution; the glyph pass is composited at full canvas size.
    size.sw = Math.max(1, Math.ceil(size.w / 3));
    size.sh = Math.max(1, Math.ceil(size.h / 3));
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.sw, size.sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  // Atlas of the ramp forms, drawn in white side by side, one square cell each.
  const glyphs: () => void = (): void => {
    const ramp: PlanetRamp = formsOf(opts.forms);
    const c: HTMLCanvasElement = document.createElement('canvas');
    const x: CanvasRenderingContext2D | null = c.getContext('2d');
    if (!x) return;
    const d: number = size.dpr;
    count = ramp.length;
    c.width = Math.ceil(cell.w * count * d);
    c.height = Math.ceil(cell.h * d);
    x.setTransform(d, 0, 0, d, 0, 0);
    x.fillStyle = '#ffffff';
    x.beginPath();
    for (let i: number = 1; i < count; i++) {
      const form: PlanetForm | null | undefined = ramp[i];
      if (form) addForm(x, form, cell.w * i, 0, cell.w, { k: d, x: 0, y: 0 });
    }
    x.fill();
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  };

  const theme: () => void = (): void => {
    pal = readPalette(el);
    voidC = parseColor(cssValue('--void', '#05050b', el)) ?? [5, 5, 11];
    lensC = parseColor(cssValue('--signal', '#4fe6ff', el)) ?? pal.stops[3];

    // Select the glyph contrast treatment from the background luminance for light and dark themes.
    day = (0.2126 * voidC[0] + 0.7152 * voidC[1] + 0.0722 * voidC[2]) / 255 > 0.5 ? 1 : 0;
  };

  const draw: (state: PlanetState) => void = (state: PlanetState): void => {
    const g: PlanetGeometry = planetGeometry(
      size.w,
      size.h,
      opts.side,
      state.scroll,
      opts.scale,
      opts.lift,
    );
    const s: (name: string) => WebGLUniformLocation | null = scene.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, size.sw, size.sh);
    gl.useProgram(scene.p);
    gl.uniform2f(s('uView'), size.w, size.h);
    gl.uniform1f(s('uTime'), state.time * (90 / period));
    gl.uniform1f(s('uScroll'), state.scroll);
    gl.uniform2f(s('uPlanet'), g.x, g.y);
    gl.uniform1f(s('uRadius'), g.R);
    gl.uniform3fv(s('uC0'), rgb01(pal.stops[0]));
    gl.uniform3fv(s('uC1'), rgb01(pal.stops[1]));
    gl.uniform3fv(s('uC2'), rgb01(pal.stops[2]));
    gl.uniform3fv(s('uC3'), rgb01(pal.stops[3]));
    gl.uniform3fv(s('uStar'), rgb01(pal.star));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const a: (name: string) => WebGLUniformLocation | null = ascii.u;
    const p: { x: number; y: number } | null = state.pointer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.useProgram(ascii.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.uniform1i(a('uScene'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.uniform1i(a('uGlyphs'), 1);
    gl.uniform2f(a('uView'), size.w, size.h);
    gl.uniform2f(a('uCell'), cell.w, cell.h);
    gl.uniform1f(a('uCount'), count);
    gl.uniform1f(a('uMix'), opts.blend);

    // Put an absent pointer outside the canvas so the shader lens has no visible contribution.
    gl.uniform2f(a('uPointer'), p ? p.x : -1e5, p ? p.y : -1e5);
    gl.uniform3fv(a('uVoid'), rgb01(voidC));
    gl.uniform3fv(a('uLens'), rgb01(lensC));
    gl.uniform1f(a('uDay'), day);
    gl.uniform1f(a('uFade'), opts.fixed ? 1 - 0.65 * state.scroll : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE0);
  };

  resize();
  theme();
  glyphs();
  const loop: { redraw: () => void; stop: Stop } = planetLoop(el, opts, draw);
  const unwatch: Stop = watchCanvas(el, (why: 'size' | 'theme'): void => {
    if (why === 'size') {
      resize();
      glyphs();
    }
    if (why === 'theme') theme();
    loop.redraw();
  });
  const lost: (e: Event) => void = (e: Event): void => {
    e.preventDefault();
    loop.stop();
    onLost();
  };
  cv.addEventListener('webglcontextlost', lost);
  return (): void => {
    loop.stop();
    unwatch();
    cv.removeEventListener('webglcontextlost', lost);
  };
}

/**
 * Function mountPlanet
 *
 * @description
 * Mounts the preferred renderer on a fresh canvas, falls back to 2D when WebGL is unavailable or lost, reports the active renderer and returns teardown.
 *
 * @returns {Stop} Cleanup that stops rendering and removes the canvas.
 * @param {HTMLElement} el - Host element that receives the renderer canvas.
 * @param {PlanetOptions} opts - Rendering settings shared by the selected backend.
 * @param {PlanetRenderer} preferred - Requested backend; WebGL requests fall back to 2D when unavailable or lost.
 * @param {(renderer: PlanetRenderer) => void} onRenderer - Callback notified after a renderer is selected.
 */
export function mountPlanet(
  el: HTMLElement,
  opts: PlanetOptions,
  preferred: PlanetRenderer,
  onRenderer: (renderer: PlanetRenderer) => void,
): Stop {
  let canvas: HTMLCanvasElement | null = null;
  let stop: Stop | null = null;
  const freshCanvas: () => HTMLCanvasElement = (): HTMLCanvasElement => {
    canvas?.remove();
    canvas = el.ownerDocument.createElement('canvas');
    canvas.className = 'block size-full';
    el.appendChild(canvas);
    return canvas;
  };
  const use2D: () => void = (): void => {
    stop?.();
    stop = startPlanet2D(el, freshCanvas(), opts);
    el.setAttribute('data-renderer', '2d');
    onRenderer('2d');
  };
  if (preferred === 'webgl') {
    try {
      stop = startPlanetGL(el, freshCanvas(), opts, use2D);
    } catch {
      stop = null;
    }
    if (stop) el.setAttribute('data-renderer', 'webgl');
    else use2D();
  } else {
    use2D();
  }
  return (): void => {
    stop?.();
    canvas?.remove();
  };
}
