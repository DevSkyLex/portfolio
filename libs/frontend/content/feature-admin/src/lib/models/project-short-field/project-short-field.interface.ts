import type { ProjectShortFieldKey } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field-key.type';

/**
 * Interface ProjectShortField
 * @interface ProjectShortField
 *
 * @description
 * One bilingual field of the project form's presentation part.
 */
export interface ProjectShortField {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Draft key edited by the field; also builds the control ids (`edit-<key>-fr`, `edit-<key>-en`).
   *
   * @type {ProjectShortFieldKey}
   */
  readonly key: ProjectShortFieldKey;

  /**
   * Property label
   * @readonly
   *
   * @description
   * French label shared by both languages.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property multiline
   * @readonly
   *
   * @description
   * Whether the value is edited in a textarea rather than a single-line input.
   *
   * @type {boolean}
   */
  readonly multiline: boolean;
  // #endregion
}
