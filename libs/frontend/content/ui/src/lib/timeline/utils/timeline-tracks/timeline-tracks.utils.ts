import type { TimelineStep } from '@vfortin/content-web-model';
import type { TimelineTrack } from '@internal/content-web-ui/lib/timeline/models/timeline-track/timeline-track.interface';

/**
 * Function timelineTracks
 *
 * @description
 * Splits the steps into the education and experience tracks, in that fixed order, each sorted by start year.
 *
 * @param {readonly TimelineStep[]} steps - Timeline records of both kinds.
 * @param {string} educationLabel - Accessible label of the education track.
 * @param {string} experienceLabel - Accessible label of the experience track.
 *
 * @returns {readonly [TimelineTrack, TimelineTrack]} Education track, then experience track.
 */
export function timelineTracks(
  steps: readonly TimelineStep[],
  educationLabel: string,
  experienceLabel: string,
): readonly [TimelineTrack, TimelineTrack] {
  const byStart: TimelineStep[] = [...steps].sort(
    (a: TimelineStep, b: TimelineStep): number => a.start - b.start,
  );
  return [
    {
      key: 'edu',
      label: educationLabel,
      steps: byStart.filter((s: TimelineStep): boolean => s.kind === 'education'),
    },
    {
      key: 'xp',
      label: experienceLabel,
      steps: byStart.filter((s: TimelineStep): boolean => s.kind === 'experience'),
    },
  ];
}
