import type {
  AnalyticsReport,
  FieldVital,
  SearchConsoleReport,
  SearchMetrics,
  WebVitalsMeasure,
} from '@vfortin/content-application';
import type { ReportWindow } from '@vfortin/content-domain';
import {
  DemoAnalyticsReader,
  DemoSearchConsoleReader,
  DemoWebVitalsReader,
} from '@internal/content-adapters-out/lib/seo/demo/demo-seo.readers';

/**
 * Constant WINDOW
 *
 * @description
 * A 28-day window and the 28 days before.
 */
const WINDOW: ReportWindow = {
  range: '28d',
  current: { start: '2026-10-05', end: '2026-11-01' },
  previous: { start: '2026-09-07', end: '2026-10-04' },
};

/**
 * Function sum
 *
 * @description
 * Sum of a measure over rows.
 *
 * @param {readonly SearchMetrics[]} rows - Rows.
 * @param {'clicks' | 'impressions'} key - Measure.
 * @returns {number} Sum.
 */
const sum = (rows: readonly SearchMetrics[], key: 'clicks' | 'impressions'): number =>
  rows.reduce((total: number, row: SearchMetrics): number => total + row[key], 0);

describe('DemoSearchConsoleReader', (): void => {
  it('reports every day of the window with consistent totals, the same for the same window', async (): Promise<void> => {
    const reader: DemoSearchConsoleReader = new DemoSearchConsoleReader('http://localhost:8080');
    const report: SearchConsoleReport = await reader.report(WINDOW);
    expect(report.daily).toHaveLength(28);
    expect(report.daily[0]?.date).toBe('2026-10-05');
    expect(report.daily.at(-1)?.date).toBe('2026-11-01');
    expect(report.totals.clicks).toBe(sum(report.daily, 'clicks'));
    expect(report.totals.impressions).toBe(sum(report.daily, 'impressions'));
    expect(report.totals.ctr).toBeCloseTo(report.totals.clicks / report.totals.impressions, 3);
    // The period before is lower, as a growing site's would be.
    expect(report.previous.clicks).toBeLessThan(report.totals.clicks);
    for (const row of [...report.daily, ...report.queries, ...report.pages, ...report.devices]) {
      expect(row.clicks).toBeLessThanOrEqual(row.impressions);
      expect(row.ctr).toBeGreaterThanOrEqual(0);
      expect(row.ctr).toBeLessThanOrEqual(1);
    }
    expect(report.queries).toHaveLength(10);
    expect(report.queries.map((row) => row.clicks)).toEqual(
      [...report.queries.map((row) => row.clicks)].sort((a: number, b: number) => b - a),
    );
    expect(report.pages[0]?.key).toBe('http://localhost:8080/');
    expect(sum(report.devices, 'clicks')).toBe(report.totals.clicks);
    expect(report.devices.map((row) => row.key)).toEqual(['DESKTOP', 'MOBILE', 'TABLET']);
    await expect(reader.report(WINDOW)).resolves.toEqual(report);
  });
});

describe('DemoAnalyticsReader', (): void => {
  it('reports the audience of every day with shares adding up to the window', async (): Promise<void> => {
    const report: AnalyticsReport = await new DemoAnalyticsReader().report(WINDOW);
    expect(report.daily).toHaveLength(28);
    expect(report.totals.sessions).toBe(
      report.daily.reduce((total: number, day) => total + day.sessions, 0),
    );
    expect(report.totals.activeUsers).toBeLessThan(
      report.daily.reduce((total: number, day) => total + day.activeUsers, 0),
    );
    for (const day of report.daily) expect(day.views).toBeGreaterThanOrEqual(day.sessions);
    expect(report.channels.reduce((total: number, row) => total + row.sessions, 0)).toBe(
      report.totals.sessions,
    );
    expect(report.countries[0]?.key).toBe('France');
    expect(report.pages.reduce((total: number, page) => total + page.views, 0)).toBe(
      report.totals.views,
    );
    expect(report.totals.engagementRate).toBeGreaterThan(report.previous.engagementRate);
    expect(report.previous.sessions).toBeLessThan(report.totals.sessions);
  });

  it('keeps a quieter weekend', async (): Promise<void> => {
    const report: AnalyticsReport = await new DemoAnalyticsReader().report({
      range: '7d',
      current: { start: '2026-10-26', end: '2026-11-01' },
      previous: { start: '2026-10-19', end: '2026-10-25' },
    });
    const sessions: number[] = report.daily.map((day) => day.sessions);
    // Monday 26 October to Sunday 1 November: Saturday and Sunday last.
    expect(Math.max(sessions[5] ?? 0, sessions[6] ?? 0)).toBeLessThan(
      Math.max(...sessions.slice(0, 5)),
    );
  });
});

describe('DemoWebVitalsReader', (): void => {
  it('provides varied but valid field samples for different pages', async (): Promise<void> => {
    const reader: DemoWebVitalsReader = new DemoWebVitalsReader();
    const samples: WebVitalsMeasure[] = await Promise.all(
      Array.from({ length: 50 }, (_, index: number) =>
        reader.measure(`http://localhost:8080/projects/${index}`, 'mobile'),
      ),
    );
    expect(new Set(samples.map((sample) => sample.field?.scope))).toEqual(
      new Set(['url', 'origin']),
    );
    expect(new Set(samples.map((sample) => sample.field?.lcp?.category))).toEqual(
      new Set(['good', 'needs-improvement', 'poor']),
    );
    expect(samples.some((sample) => sample.field?.cls === null)).toBe(true);
  });

  it('measures each URL and strategy the same way, categories following the thresholds', async (): Promise<void> => {
    const reader: DemoWebVitalsReader = new DemoWebVitalsReader();
    const urls: string[] = [
      'http://localhost:8080/',
      'http://localhost:8080/projects/library-trails',
    ];
    const measures: WebVitalsMeasure[] = [];
    for (const url of urls)
      for (const strategy of ['mobile', 'desktop'] as const)
        measures.push(await reader.measure(url, strategy));
    for (const measure of measures) {
      const lcp: FieldVital | null | undefined = measure.field?.lcp;
      expect(lcp?.category).toBe(
        (lcp?.p75 ?? 0) <= 2500 ? 'good' : (lcp?.p75 ?? 0) <= 4000 ? 'needs-improvement' : 'poor',
      );
      const inp: FieldVital | null | undefined = measure.field?.inp;
      expect(inp?.category).toBe(
        (inp?.p75 ?? 0) <= 200 ? 'good' : (inp?.p75 ?? 0) <= 500 ? 'needs-improvement' : 'poor',
      );
      expect(measure.lab.performanceScore).toBeGreaterThanOrEqual(20);
      expect(measure.lab.performanceScore).toBeLessThanOrEqual(100);
    }
    await expect(reader.measure(urls[0] ?? '', 'mobile')).resolves.toEqual(measures[0]);
    // Desktop loads faster than mobile.
    expect(measures[1]?.field?.lcp?.p75 ?? 0).toBeLessThan(measures[0]?.field?.lcp?.p75 ?? 0);
  });
});
