import type {
  FieldVital,
  FieldVitals,
  LabVitals,
  PageSpeedStrategy,
  VitalCategory,
  WebVitalsMeasure,
  WebVitalsReader,
} from '@vfortin/content-application';
import {
  field,
  finite,
  googleJson,
  round,
} from '@internal/content-adapters-out/lib/seo/google-http/google-http';

/**
 * Constant SERVICE
 *
 * @description
 * Service name of the failure messages.
 */
const SERVICE: string = 'PageSpeed Insights';

/**
 * Constant THRESHOLDS
 *
 * @description
 * Upper bounds of « good » and « needs improvement » per Core Web Vital (LCP and INP in
 * milliseconds, CLS unitless), used when CrUX gives no category.
 */
const THRESHOLDS: Readonly<Record<'lcp' | 'inp' | 'cls', readonly [number, number]>> = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
};

/**
 * Constant CRUX_CATEGORIES
 *
 * @description
 * CrUX categories as PageSpeed Insights names them.
 */
const CRUX_CATEGORIES: Readonly<Record<string, VitalCategory>> = {
  FAST: 'good',
  AVERAGE: 'needs-improvement',
  SLOW: 'poor',
};

/**
 * Interface PageSpeedOptions
 * @interface PageSpeedOptions
 *
 * @description
 * Key and transport of the PageSpeed Insights reader.
 */
export interface PageSpeedOptions {
  // #region Properties
  /**
   * Property apiKey
   * @readonly
   *
   * @description
   * API key restricted to the PageSpeed Insights API; it travels in the query string, so it is
   * redacted from every failure message.
   */
  readonly apiKey: string;

  /**
   * Property fetcher
   * @readonly
   *
   * @description
   * HTTP implementation, the global `fetch` by default.
   */
  readonly fetcher?: typeof fetch;

  /**
   * Property baseUrl
   * @readonly
   *
   * @description
   * API origin, `https://www.googleapis.com` by default.
   */
  readonly baseUrl?: string;

  /**
   * Property timeoutMs
   * @readonly
   *
   * @description
   * Longest wait per run, 90 seconds by default (a Lighthouse run takes 10 to 30 seconds).
   */
  readonly timeoutMs?: number;
  // #endregion
}

/**
 * Function vitalOf
 *
 * @description
 * Reads one CrUX metric (`{ percentile, category }`); CLS percentiles come multiplied by 100.
 *
 * @param {unknown} metrics - `loadingExperience.metrics`.
 * @param {string} name - CrUX metric name.
 * @param {'lcp' | 'inp' | 'cls'} vital - Vital, for the unit and the thresholds.
 * @returns {FieldVital | null} Metric, or `null` when CrUX has none.
 */
function vitalOf(metrics: unknown, name: string, vital: 'lcp' | 'inp' | 'cls'): FieldVital | null {
  const metric: unknown = field(metrics, name);
  const percentile: unknown = field(metric, 'percentile');
  if (percentile === undefined) return null;
  const raw: number = finite(percentile, SERVICE, `${name} percentile`);
  const p75: number = vital === 'cls' ? round(raw / 100, 3) : Math.round(raw);
  const category: unknown = field(metric, 'category');
  const [good, poor] = THRESHOLDS[vital];
  return {
    p75,
    category:
      (typeof category === 'string' ? CRUX_CATEGORIES[category] : undefined) ??
      (p75 <= good ? 'good' : p75 <= poor ? 'needs-improvement' : 'poor'),
  };
}

/**
 * Function fieldOf
 *
 * @description
 * Reads the CrUX field data of a run: the URL's own (`origin` scope when PageSpeed Insights marks an
 * origin fallback), else the origin's, else `null`.
 *
 * @param {unknown} body - PageSpeed Insights response.
 * @returns {FieldVitals | null} Field data.
 */
function fieldOf(body: unknown): FieldVitals | null {
  for (const key of ['loadingExperience', 'originLoadingExperience']) {
    const experience: unknown = field(body, key);
    const metrics: unknown = field(experience, 'metrics');
    const vitals: Omit<FieldVitals, 'scope'> = {
      lcp: vitalOf(metrics, 'LARGEST_CONTENTFUL_PAINT_MS', 'lcp'),
      inp: vitalOf(metrics, 'INTERACTION_TO_NEXT_PAINT', 'inp'),
      cls: vitalOf(metrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE', 'cls'),
    };
    if (vitals.lcp !== null || vitals.inp !== null || vitals.cls !== null) {
      const fallback: boolean =
        key === 'originLoadingExperience' || field(experience, 'origin_fallback') === true;
      return { scope: fallback ? 'origin' : 'url', ...vitals };
    }
  }
  return null;
}

/**
 * Function labOf
 *
 * @description
 * Reads the Lighthouse score and lab metrics of a run.
 *
 * @param {unknown} body - PageSpeed Insights response.
 * @returns {LabVitals} Lab measures.
 */
function labOf(body: unknown): LabVitals {
  const lighthouse: unknown = field(body, 'lighthouseResult');
  const audits: unknown = field(lighthouse, 'audits');
  const numeric = (audit: string, decimals: number): number | null => {
    const value: unknown = field(field(audits, audit), 'numericValue');
    return typeof value === 'number' ? round(finite(value, SERVICE, audit), decimals) : null;
  };
  const score: unknown = field(field(field(lighthouse, 'categories'), 'performance'), 'score');
  return {
    performanceScore:
      typeof score === 'number'
        ? Math.round(Math.min(1, finite(score, SERVICE, 'score')) * 100)
        : null,
    lcpMs: numeric('largest-contentful-paint', 0),
    cls: numeric('cumulative-layout-shift', 3),
    tbtMs: numeric('total-blocking-time', 0),
  };
}

/**
 * Class PageSpeedWebVitalsReader
 * @class PageSpeedWebVitalsReader
 *
 * @description
 * Core Web Vitals through PageSpeed Insights v5 `runPagespeed` (performance category): the CrUX field
 * data it embeds and the Lighthouse run.
 */
export class PageSpeedWebVitalsReader implements WebVitalsReader {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the key and the transport.
   *
   * @param {PageSpeedOptions} options - Reader settings.
   */
  public constructor(private readonly options: PageSpeedOptions) {}
  // #endregion

  // #region Methods
  /**
   * Method measure
   * @method measure
   *
   * @description
   * Runs PageSpeed Insights on one URL.
   *
   * @param {string} url - Absolute page URL.
   * @param {PageSpeedStrategy} strategy - Emulated device.
   * @returns {Promise<WebVitalsMeasure>} Measures.
   */
  public async measure(url: string, strategy: PageSpeedStrategy): Promise<WebVitalsMeasure> {
    const query: URLSearchParams = new URLSearchParams({
      url,
      strategy,
      category: 'performance',
      key: this.options.apiKey,
    });
    const base: string = this.options.baseUrl ?? 'https://www.googleapis.com';
    const body: unknown = await googleJson(
      `${base}/pagespeedonline/v5/runPagespeed?${query.toString()}`,
      { method: 'GET', headers: { accept: 'application/json' } },
      {
        service: SERVICE,
        fetcher: this.options.fetcher ?? fetch,
        timeoutMs: this.options.timeoutMs ?? 90_000,
        secrets: [this.options.apiKey, encodeURIComponent(this.options.apiKey)],
      },
    );
    return { field: fieldOf(body), lab: labOf(body) };
  }
  // #endregion
}
