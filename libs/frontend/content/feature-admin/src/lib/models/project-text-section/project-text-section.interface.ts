import type { ProjectShortField } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field.interface';

/**
 * Interface ProjectTextSection
 * @interface ProjectTextSection
 *
 * @description
 * One section of short fields in a language tab of the project form.
 */
export interface ProjectTextSection {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable name, used in the heading ids (`edit-section-<key>-<locale>`).
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Section heading.
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * One-line explanation under the heading, `null` when the fields speak for themselves.
   *
   * @type {string | null}
   */
  readonly description: string | null;

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Fields of the section, in display order.
   *
   * @type {readonly ProjectShortField[]}
   */
  readonly fields: readonly ProjectShortField[];

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Whether the fields sit two by two once the form is wide enough.
   *
   * @type {boolean}
   */
  readonly columns: boolean;
  // #endregion
}
