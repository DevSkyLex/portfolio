import { ProjectPeriod, type ProjectPeriodProps } from '@vfortin/content-domain';
import { projectPeriodLabel } from '@internal/content-adapters-in/lib/http/presenters/project-period/project-period.presenter';

/**
 * Function period
 *
 * @description
 * Builds a period from `[year, month]` pairs, `null` for an ongoing end.
 *
 * @param {readonly [number, number | null]} start - Start year and month.
 * @param {readonly [number, number | null] | null} end - End year and month.
 * @returns {ProjectPeriod} Period.
 */
const period = (
  start: readonly [number, number | null],
  end: readonly [number, number | null] | null,
): ProjectPeriod => {
  const props: ProjectPeriodProps = {
    start: { year: start[0], month: start[1] },
    end: end === null ? null : { year: end[0], month: end[1] },
  };
  return ProjectPeriod.of(props);
};

describe('projectPeriodLabel', (): void => {
  it.each<[string, ProjectPeriod, string, string]>([
    // The three labels of the seed, byte for byte.
    ['whole years', period([2023, null], [2026, null]), '2023 — 2026', '2023 — 2026'],
    ['an ongoing month', period([2026, 7], null), 'Depuis juillet 2026', 'Since July 2026'],
    ['months of one year', period([2023, 3], [2023, 4]), 'Mars — avril 2023', 'March — April 2023'],
    ['one whole year', period([2023, null], [2023, null]), '2023', '2023'],
    ['a single month', period([2023, 3], [2023, 3]), 'Mars 2023', 'March 2023'],
    [
      'months across years',
      period([2023, 9], [2026, 6]),
      'Septembre 2023 — juin 2026',
      'September 2023 — June 2026',
    ],
    ['an ongoing year', period([2023, null], null), 'Depuis 2023', 'Since 2023'],
    [
      'accented months',
      period([2024, 2], [2024, 8]),
      'Février — août 2024',
      'February — August 2024',
    ],
    [
      'a month then a later year',
      period([2023, 9], [2026, null]),
      'Septembre 2023 — 2026',
      'September 2023 — 2026',
    ],
    [
      'a year then a later month',
      period([2023, null], [2026, 6]),
      '2023 — juin 2026',
      '2023 — June 2026',
    ],
    [
      'a month then the rest of its year',
      period([2023, 9], [2023, null]),
      'Septembre — décembre 2023',
      'September — December 2023',
    ],
    [
      'a year up to a month',
      period([2023, null], [2023, 6]),
      'Janvier — juin 2023',
      'January — June 2023',
    ],
    ['a year up to January', period([2023, null], [2023, 1]), 'Janvier 2023', 'January 2023'],
  ])('writes %s', (_label, value, french, english): void => {
    expect(projectPeriodLabel(value, 'fr')).toBe(french);
    expect(projectPeriodLabel(value, 'en')).toBe(english);
  });
});
