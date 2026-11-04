import type { TimelineKind } from '@internal/content-web-data-access/lib/admin/models/timeline-kind/timeline-kind.type';
import type { YearMonth } from '@internal/content-web-data-access/lib/admin/models/year-month/year-month.interface';

/**
 * Interface AdminTimelineEntry
 * @interface AdminTimelineEntry
 *
 * @description
 * Education or experience entry as the administration shows it, independent of the transport DTO.
 */
export interface AdminTimelineEntry {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * List the entry belongs to.
   *
   * @type {TimelineKind}
   */
  readonly kind: TimelineKind;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Order within its list, from 0.
   *
   * @type {number}
   */
  readonly position: number;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Content version, sent in `If-Match` by a save or a deletion.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Role, degree or programme per language.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly title: { readonly fr: string; readonly en?: string };

  /**
   * Property place
   * @readonly
   *
   * @description
   * Employer, school or city per language.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly place: { readonly fr: string; readonly en?: string };

  /**
   * Property description
   * @readonly
   *
   * @description
   * Summary per language.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly description: { readonly fr: string; readonly en?: string };

  /**
   * Property start
   * @readonly
   *
   * @description
   * First month.
   *
   * @type {YearMonth}
   */
  readonly start: YearMonth;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last month, or `null` while ongoing.
   *
   * @type {YearMonth | null}
   */
  readonly end: YearMonth | null;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys.
   *
   * @type {readonly string[]}
   */
  readonly techs: readonly string[];
  // #endregion
}
