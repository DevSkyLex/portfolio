import type { TimelineStep } from '@vfortin/content-web-model';
import { timelineTracks } from '@internal/content-web-ui/lib/timeline/utils/timeline-tracks/timeline-tracks.utils';

/**
 * Function step
 *
 * @description
 * Builds a minimal timeline step of the given kind and start year.
 */
const step: (id: string, kind: TimelineStep['kind'], start: number) => TimelineStep = (
  id: string,
  kind: TimelineStep['kind'],
  start: number,
): TimelineStep => ({
  id,
  kind,
  title: id,
  place: 'Lyon',
  description: '',
  dateLabel: String(start),
  start,
  end: start + 1,
  techs: [],
});

describe('timelineTracks', (): void => {
  it('puts education first and experience second, each sorted by start year', (): void => {
    const [edu, xp] = timelineTracks(
      [
        step('job-b', 'experience', 2024),
        step('school', 'education', 2021),
        step('job-a', 'experience', 2022),
      ],
      'Formation',
      'Expérience',
    );
    expect(edu.key).toBe('edu');
    expect(edu.label).toBe('Formation');
    expect(edu.steps.map((s: TimelineStep): string => s.id)).toEqual(['school']);
    expect(xp.key).toBe('xp');
    expect(xp.label).toBe('Expérience');
    expect(xp.steps.map((s: TimelineStep): string => s.id)).toEqual(['job-a', 'job-b']);
  });

  it('keeps both tracks when a kind has no step', (): void => {
    const tracks: ReturnType<typeof timelineTracks> = timelineTracks([], 'Formation', 'Expérience');
    expect(tracks.map((t): number => t.steps.length)).toEqual([0, 0]);
  });
});
