/**
 * Interface TagsInputAnnouncements
 * @interface TagsInputAnnouncements
 *
 * @description
 * Messages `ui-tags-input` reads in its polite live region when a tag is added, removed or refused.
 */
export interface TagsInputAnnouncements {
  // #region Properties
  /**
   * Property added
   * @readonly
   *
   * @description
   * Message after a tag was added.
   *
   * @type {(tag: string) => string}
   */
  readonly added: (tag: string) => string;

  /**
   * Property removed
   * @readonly
   *
   * @description
   * Message after a tag was removed.
   *
   * @type {(tag: string) => string}
   */
  readonly removed: (tag: string) => string;

  /**
   * Property duplicate
   * @readonly
   *
   * @description
   * Message when a tag is refused because it is already in the list.
   *
   * @type {(tag: string) => string}
   */
  readonly duplicate: (tag: string) => string;

  /**
   * Property limit
   * @readonly
   *
   * @description
   * Message when a tag is refused because the list holds `maxTags` tags.
   *
   * @type {(max: number) => string}
   */
  readonly limit: (max: number) => string;
  // #endregion
}
