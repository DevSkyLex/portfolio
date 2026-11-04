/**
 * Interface TimelineKindTexts
 * @interface TimelineKindTexts
 *
 * @description
 * Copy that differs between the « Expériences » and « Formations » screens, French source with English
 * targets (`$localize`). Each sentence naming the kind is a whole message of its own, so that a
 * translation never assembles a noun into a sentence; the remaining copy is shared.
 */
export interface TimelineKindTexts {
  // #region Properties
  /**
   * Property section
   * @readonly
   *
   * @description
   * Section name, page title and table caption: « Expériences ».
   *
   * @type {string}
   */
  readonly section: string;

  /**
   * Property one
   * @readonly
   *
   * @description
   * Singular noun in lower case, after a count of the singular category: « expérience ».
   *
   * @type {string}
   */
  readonly one: string;

  /**
   * Property many
   * @readonly
   *
   * @description
   * Plural noun in lower case, after any other count: « expériences ».
   *
   * @type {string}
   */
  readonly many: string;

  /**
   * Property create
   * @readonly
   *
   * @description
   * Creation action and editor title: « Nouvelle expérience ».
   *
   * @type {string}
   */
  readonly create: string;

  /**
   * Property back
   * @readonly
   *
   * @description
   * Link back to the list: « Toutes les expériences ».
   *
   * @type {string}
   */
  readonly back: string;

  /**
   * Property empty
   * @readonly
   *
   * @description
   * Empty list title: « Aucune expérience ».
   *
   * @type {string}
   */
  readonly empty: string;

  /**
   * Property emptyHint
   * @readonly
   *
   * @description
   * Description of the empty list: where its entries appear.
   *
   * @type {string}
   */
  readonly emptyHint: string;

  /**
   * Property searchLabel
   * @readonly
   *
   * @description
   * Accessible name of the table search: « Rechercher dans les expériences ».
   *
   * @type {string}
   */
  readonly searchLabel: string;

  /**
   * Property noResults
   * @readonly
   *
   * @description
   * Title of a search or filters matching nothing: « Aucune expérience trouvée ».
   *
   * @type {string}
   */
  readonly noResults: string;

  /**
   * Property noResultsHint
   * @readonly
   *
   * @description
   * Description of a search or filters matching nothing.
   *
   * @type {string}
   */
  readonly noResultsHint: string;

  /**
   * Property loadFailed
   * @readonly
   *
   * @description
   * Title of the failed list load: « Impossible de charger les expériences ».
   *
   * @type {string}
   */
  readonly loadFailed: string;

  /**
   * Property newEntryHint
   * @readonly
   *
   * @description
   * Header meta line of the creation editor.
   *
   * @type {string}
   */
  readonly newEntryHint: string;

  /**
   * Property listConflict
   * @readonly
   *
   * @description
   * Reason of a bulk deletion stopped by a version conflict, the list being reloaded.
   *
   * @type {string}
   */
  readonly listConflict: string;

  /**
   * Property noneDeleted
   * @readonly
   *
   * @description
   * Error toast of a bulk deletion that failed for every entry: « Aucune expérience supprimée sur 2. ».
   *
   * @type {(total: number) => string}
   */
  readonly noneDeleted: (total: number) => string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Lucide glyph of the section, the one of its sidebar entry, shown in the empty state's tile.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property titlePlaceholder
   * @readonly
   *
   * @description
   * Example of a French title, shown in the French field only: content of the French locale, so it
   * stays French in every build.
   *
   * @type {string}
   */
  readonly titlePlaceholder: string;

  /**
   * Property placePlaceholder
   * @readonly
   *
   * @description
   * Parts expected in the French place (« Entreprise, ville »), in the admin's language.
   *
   * @type {string}
   */
  readonly placePlaceholder: string;
  // #endregion
}
