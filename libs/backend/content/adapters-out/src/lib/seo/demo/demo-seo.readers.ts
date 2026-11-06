import type {
  AnalyticsReader,
  AnalyticsReport,
  AudienceDay,
  AudiencePage,
  AudienceShare,
  AudienceTotals,
  FieldVital,
  PageSpeedStrategy,
  SearchConsoleReader,
  SearchConsoleReport,
  SearchDay,
  SearchMetrics,
  SearchRow,
  VitalCategory,
  WebVitalsMeasure,
  WebVitalsReader,
} from '@vfortin/content-application';
import type { DateSpan, ReportWindow } from '@vfortin/content-domain';

/** Milliseconds in a day. */
const DAY_MS: number = 86_400_000;

/**
 * Function seeded
 *
 * @description
 * Deterministic pseudo-random generator (mulberry32) seeded by a text, so that a window always gets the
 * same demonstration figures.
 *
 * @param {string} text - Seed.
 * @returns {() => number} Generator of numbers in [0, 1).
 */
function seeded(text: string): () => number {
  let state: number = 2166136261;
  for (const char of text) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let value: number = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Function days
 *
 * @description
 * ISO days of a span, first to last.
 *
 * @param {DateSpan} span - Span.
 * @returns {string[]} Days.
 */
function days(span: DateSpan): string[] {
  const start: number = Date.parse(`${span.start}T00:00:00Z`);
  const end: number = Date.parse(`${span.end}T00:00:00Z`);
  const result: string[] = [];
  for (let time: number = start; time <= end; time += DAY_MS)
    result.push(new Date(time).toISOString().slice(0, 10));
  return result;
}

/**
 * Function weekdayFactor
 *
 * @description
 * Traffic of a portfolio by weekday: busier on working days, quiet at the weekend.
 *
 * @param {string} day - ISO day.
 * @returns {number} Factor around 1.
 */
function weekdayFactor(day: string): number {
  return [0.55, 1.15, 1.2, 1.15, 1.1, 1, 0.6][new Date(`${day}T00:00:00Z`).getUTCDay()] ?? 1;
}

/**
 * Function round
 *
 * @description
 * Rounds a ratio or an average to four decimals, like Google's answers.
 *
 * @param {number} value - Value.
 * @returns {number} Rounded value.
 */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Function metrics
 *
 * @description
 * Search metrics of a row from its clicks, impressions and average position.
 *
 * @param {number} clicks - Clicks.
 * @param {number} impressions - Impressions, at least the clicks.
 * @param {number} position - Average position.
 * @returns {SearchMetrics} Metrics.
 */
function metrics(clicks: number, impressions: number, position: number): SearchMetrics {
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? round(clicks / impressions) : 0,
    position: impressions > 0 ? round(position) : 0,
  };
}

/**
 * Function total
 *
 * @description
 * Sums search rows, the position weighted by impressions as Search Console does.
 *
 * @param {readonly SearchMetrics[]} rows - Rows.
 * @returns {SearchMetrics} Totals.
 */
function total(rows: readonly SearchMetrics[]): SearchMetrics {
  const clicks: number = rows.reduce(
    (sum: number, row: SearchMetrics): number => sum + row.clicks,
    0,
  );
  const impressions: number = rows.reduce(
    (sum: number, row: SearchMetrics): number => sum + row.impressions,
    0,
  );
  const weighted: number = rows.reduce(
    (sum: number, row: SearchMetrics): number => sum + row.position * row.impressions,
    0,
  );
  return metrics(clicks, impressions, impressions > 0 ? weighted / impressions : 0);
}

/**
 * Function split
 *
 * @description
 * Splits an amount by weights into whole parts that add up to it.
 *
 * @param {number} amount - Amount.
 * @param {readonly number[]} weights - Weights.
 * @returns {number[]} Parts.
 */
function split(amount: number, weights: readonly number[]): number[] {
  const sum: number = weights.reduce((total: number, weight: number): number => total + weight, 0);
  const parts: number[] = weights.map((weight: number): number =>
    Math.floor((amount * weight) / sum),
  );
  parts[0] =
    (parts[0] ?? 0) +
    amount -
    parts.reduce((total: number, part: number): number => total + part, 0);
  return parts;
}

/**
 * Constant QUERIES
 *
 * @description
 * Searches of a developer portfolio: its weight of the clicks, of the impressions and its usual
 * position.
 */
const QUERIES: readonly { key: string; clicks: number; impressions: number; position: number }[] = [
  { key: 'valentin fortin', clicks: 34, impressions: 9, position: 1.3 },
  { key: 'valentin fortin développeur', clicks: 14, impressions: 4, position: 1.6 },
  { key: 'développeur angular freelance', clicks: 9, impressions: 22, position: 9.4 },
  { key: 'portfolio développeur fullstack', clicks: 7, impressions: 18, position: 12.8 },
  { key: 'movah application', clicks: 8, impressions: 6, position: 3.1 },
  { key: 'architecture hexagonale nestjs', clicks: 6, impressions: 14, position: 7.7 },
  { key: 'crm kodoka', clicks: 5, impressions: 3, position: 2.4 },
  { key: 'développeur web tours', clicks: 4, impressions: 11, position: 14.6 },
  { key: 'angular signal forms exemple', clicks: 3, impressions: 9, position: 18.2 },
  { key: 'nx monorepo angular nestjs', clicks: 2, impressions: 4, position: 22.5 },
];

/**
 * Constant PAGES
 *
 * @description
 * Pages of the site and their weight of the search clicks and of the views.
 */
const PAGES: readonly { path: string; weight: number }[] = [
  { path: '/', weight: 46 },
  { path: '/projects/movah', weight: 17 },
  { path: '/projects/crm-kodoka', weight: 12 },
  { path: '/en/', weight: 9 },
  { path: '/projects/rdi-manager', weight: 7 },
  { path: '/projects/iotplatform', weight: 5 },
  { path: '/en/projects/movah', weight: 4 },
];

/**
 * Class DemoSearchConsoleReader
 * @class DemoSearchConsoleReader
 *
 * @description
 * Search Console stand-in for local development (D52): plausible figures of a developer portfolio,
 * the same for the same window, so that the dashboard shows its charts before any Google setup. The
 * dashboard says the figures are demonstration data.
 */
export class DemoSearchConsoleReader implements SearchConsoleReader {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps the site origin used for the page addresses.
   *
   * @param {string} siteOrigin - Public origin of the site.
   */
  public constructor(private readonly siteOrigin: string) {}
  // #endregion

  // #region Methods
  /**
   * Method report
   * @method report
   *
   * @description
   * Builds the report of a window: daily figures following the weekday, the previous period about 15 %
   * lower, the top queries and pages, and the devices.
   *
   * @param {ReportWindow} window - Report window.
   * @returns {Promise<SearchConsoleReport>} Report.
   */
  public async report(window: ReportWindow): Promise<SearchConsoleReport> {
    const daily: SearchDay[] = this.daily(window.current, 1);
    const totals: SearchMetrics = total(daily);
    const random: () => number = seeded(`queries:${window.current.start}`);
    const queries: SearchRow[] = QUERIES.map(
      (query: {
        key: string;
        clicks: number;
        impressions: number;
        position: number;
      }): SearchRow => {
        const clicks: number = Math.round(
          ((totals.clicks * query.clicks) / 92) * (0.8 + random() * 0.4),
        );
        const impressions: number = Math.max(
          clicks,
          Math.round(((totals.impressions * query.impressions) / 100) * (0.8 + random() * 0.4)),
        );
        return { key: query.key, ...metrics(clicks, impressions, query.position + random() - 0.5) };
      },
    ).sort((a: SearchRow, b: SearchRow): number => b.clicks - a.clicks);
    const pageClicks: number[] = split(
      totals.clicks,
      PAGES.map((page: { weight: number }): number => page.weight),
    );
    const pageImpressions: number[] = split(
      totals.impressions,
      PAGES.map((page: { weight: number }): number => page.weight),
    );
    const pages: SearchRow[] = PAGES.map((page: { path: string }, index: number): SearchRow => ({
      key: `${this.siteOrigin}${page.path}`,
      ...metrics(
        pageClicks[index] ?? 0,
        Math.max(pageClicks[index] ?? 0, pageImpressions[index] ?? 0),
        3 + index * 1.7 + random(),
      ),
    }));
    const deviceClicks: number[] = split(totals.clicks, [68, 29, 3]);
    const deviceImpressions: number[] = split(totals.impressions, [61, 35, 4]);
    const devices: SearchRow[] = ['DESKTOP', 'MOBILE', 'TABLET'].map(
      (key: string, index: number): SearchRow => ({
        key,
        ...metrics(
          deviceClicks[index] ?? 0,
          Math.max(deviceClicks[index] ?? 0, deviceImpressions[index] ?? 0),
          totals.position + (index === 0 ? -0.6 : 0.9 + index),
        ),
      }),
    );
    return {
      totals,
      previous: total(this.daily(window.previous, 0.85)),
      daily,
      queries,
      pages,
      devices,
    };
  }

  /**
   * Method daily
   * @method daily
   *
   * @description
   * Figures of each day of a span, scaled by a factor (lower for the period before).
   *
   * @param {DateSpan} span - Span.
   * @param {number} scale - Factor.
   * @returns {SearchDay[]} Days.
   */
  private daily(span: DateSpan, scale: number): SearchDay[] {
    return days(span).map((day: string): SearchDay => {
      const random: () => number = seeded(`search:${day}`);
      const impressions: number = Math.round((120 + random() * 60) * weekdayFactor(day) * scale);
      const clicks: number = Math.round(impressions * (0.028 + random() * 0.02));
      return { date: day, ...metrics(clicks, impressions, 6.5 + random() * 3) };
    });
  }
  // #endregion
}

/**
 * Class DemoAnalyticsReader
 * @class DemoAnalyticsReader
 *
 * @description
 * Google Analytics 4 stand-in for local development (D52), deterministic per window.
 */
export class DemoAnalyticsReader implements AnalyticsReader {
  // #region Methods
  /**
   * Method report
   * @method report
   *
   * @description
   * Builds the audience of a window: daily users, sessions and views following the weekday, the period
   * before about 12 % lower, the top pages, the channels and the countries.
   *
   * @param {ReportWindow} window - Report window.
   * @returns {Promise<AnalyticsReport>} Report.
   */
  public async report(window: ReportWindow): Promise<AnalyticsReport> {
    const daily: AudienceDay[] = this.daily(window.current, 1);
    const totals: AudienceTotals = this.totals(daily, 0.61, 74);
    const views: number[] = split(
      totals.views,
      PAGES.map((page: { weight: number }): number => page.weight),
    );
    const pages: AudiencePage[] = PAGES.map(
      (page: { path: string }, index: number): AudiencePage => ({
        path: page.path,
        views: views[index] ?? 0,
        activeUsers: Math.round((views[index] ?? 0) * 0.62),
      }),
    );
    return {
      totals,
      previous: this.totals(this.daily(window.previous, 0.88), 0.57, 66),
      daily,
      pages,
      channels: this.shares(totals, [
        ['Organic Search', 44],
        ['Direct', 31],
        ['Referral', 13],
        ['Organic Social', 9],
        ['Unassigned', 3],
      ]),
      countries: this.shares(totals, [
        ['France', 71],
        ['Belgium', 7],
        ['Switzerland', 6],
        ['Canada', 6],
        ['United States', 5],
        ['Germany', 3],
        ['United Kingdom', 2],
      ]),
    };
  }

  /**
   * Method daily
   * @method daily
   *
   * @description
   * Users, sessions and views of each day of a span, scaled by a factor.
   *
   * @param {DateSpan} span - Span.
   * @param {number} scale - Factor.
   * @returns {AudienceDay[]} Days.
   */
  private daily(span: DateSpan, scale: number): AudienceDay[] {
    return days(span).map((day: string): AudienceDay => {
      const random: () => number = seeded(`audience:${day}`);
      const activeUsers: number = Math.round((14 + random() * 10) * weekdayFactor(day) * scale);
      const sessions: number = Math.round(activeUsers * (1.15 + random() * 0.25));
      return { date: day, activeUsers, sessions, views: Math.round(sessions * (2.2 + random())) };
    });
  }

  /**
   * Method totals
   * @method totals
   *
   * @description
   * Totals of a span; active users are not additive across days, so they are counted as returning
   * visitors would make them (about 70 % of the daily sum).
   *
   * @param {readonly AudienceDay[]} rows - Days.
   * @param {number} engagementRate - Share of engaged sessions.
   * @param {number} seconds - Average engagement time.
   * @returns {AudienceTotals} Totals.
   */
  private totals(
    rows: readonly AudienceDay[],
    engagementRate: number,
    seconds: number,
  ): AudienceTotals {
    const sum = (pick: (day: AudienceDay) => number): number =>
      rows.reduce((total: number, day: AudienceDay): number => total + pick(day), 0);
    return {
      activeUsers: Math.round(sum((day: AudienceDay): number => day.activeUsers) * 0.7),
      sessions: sum((day: AudienceDay): number => day.sessions),
      views: sum((day: AudienceDay): number => day.views),
      engagementRate,
      averageEngagementSeconds: seconds,
    };
  }

  /**
   * Method shares
   * @method shares
   *
   * @description
   * Sessions and users of the window split by weights.
   *
   * @param {AudienceTotals} totals - Window totals.
   * @param {readonly [string, number][]} weights - Key and weight of each share.
   * @returns {AudienceShare[]} Shares, the largest first.
   */
  private shares(totals: AudienceTotals, weights: readonly [string, number][]): AudienceShare[] {
    const sessions: number[] = split(
      totals.sessions,
      weights.map((entry: [string, number]): number => entry[1]),
    );
    const users: number[] = split(
      totals.activeUsers,
      weights.map((entry: [string, number]): number => entry[1]),
    );
    return weights.map(([key]: [string, number], index: number): AudienceShare => ({
      key,
      sessions: sessions[index] ?? 0,
      activeUsers: users[index] ?? 0,
    }));
  }
  // #endregion
}

/**
 * Function vital
 *
 * @description
 * Field value at the 75th percentile and its category by Google's thresholds.
 *
 * @param {number} p75 - Value.
 * @param {number} good - Upper bound of « good ».
 * @param {number} poor - Lower bound of « poor ».
 * @returns {FieldVital} Field vital.
 */
function vital(p75: number, good: number, poor: number): FieldVital {
  const category: VitalCategory = p75 <= good ? 'good' : p75 <= poor ? 'needs-improvement' : 'poor';
  return { p75, category };
}

/**
 * Class DemoWebVitalsReader
 * @class DemoWebVitalsReader
 *
 * @description
 * PageSpeed Insights stand-in for local development (D52): per URL and strategy, field vitals on the
 * URL or, for the less visited pages, the origin, and a lab run; desktop measures better than mobile.
 */
export class DemoWebVitalsReader implements WebVitalsReader {
  // #region Methods
  /**
   * Method measure
   * @method measure
   *
   * @description
   * Measures one URL, always the same way for the same URL and strategy.
   *
   * @param {string} url - Page address.
   * @param {PageSpeedStrategy} strategy - Emulated device.
   * @returns {Promise<WebVitalsMeasure>} Measure.
   */
  public async measure(url: string, strategy: PageSpeedStrategy): Promise<WebVitalsMeasure> {
    const random: () => number = seeded(`vitals:${url}:${strategy}`);
    const mobile: boolean = strategy === 'mobile';
    const lcp: number = Math.round((mobile ? 2100 : 1200) + random() * (mobile ? 2400 : 900));
    const inp: number = Math.round((mobile ? 120 : 60) + random() * (mobile ? 300 : 120));
    const cls: number = round(random() * (mobile ? 0.22 : 0.08));
    const score: number = Math.round(
      Math.max(20, Math.min(100, (mobile ? 96 : 104) - lcp / (mobile ? 90 : 60) - random() * 10)),
    );
    return {
      field: {
        scope: random() < 0.35 ? 'origin' : 'url',
        lcp: vital(lcp, 2500, 4000),
        inp: vital(inp, 200, 500),
        cls: random() < 0.15 ? null : vital(cls, 0.1, 0.25),
      },
      lab: {
        performanceScore: score,
        lcpMs: Math.round(lcp * (0.9 + random() * 0.4)),
        cls,
        tbtMs: Math.round((mobile ? 150 : 20) + random() * (mobile ? 450 : 120)),
      },
    };
  }
  // #endregion
}
