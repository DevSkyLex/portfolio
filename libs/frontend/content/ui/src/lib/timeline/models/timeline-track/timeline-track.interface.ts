import type { TimelineStep } from '@vfortin/content-web-model';

/**
 * Interface TimelineTrack
 * @interface TimelineTrack
 *
 * @description
 * One education or experience row of the timeline, read back by the canvas scene through `data-track`.
 */
export interface TimelineTrack {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Track identifier written to `data-track`: `edu` for education, `xp` for experience.
   *
   * @type {'edu' | 'xp'}
   */
  readonly key: 'edu' | 'xp';

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible label of the track list.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property steps
   * @readonly
   *
   * @description
   * Steps of this kind, sorted by start year.
   *
   * @type {readonly TimelineStep[]}
   */
  readonly steps: readonly TimelineStep[];
  // #endregion
}
