import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  LOCALES,
  type Locale,
  LocalizedText,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Period, type YearMonth } from '@internal/content-domain/lib/values/period/period';

/**
 * Type TimelineKind
 * @type TimelineKind
 *
 * @description
 * Classification used to distinguish education from professional experience; each kind is ordered on
 * its own.
 */
export type TimelineKind = 'education' | 'experience';

/**
 * Constant TIMELINE_KINDS
 *
 * @description
 * Timeline kinds in the order the published snapshot lists them: education first, then experience.
 */
export const TIMELINE_KINDS: readonly ['education', 'experience'] = [
  'education',
  'experience',
] as const;

/**
 * Constant TIMELINE_ENTRY_LIMITS
 *
 * @description
 * Longest trimmed text per locale and largest technology list of an entry; mirrored by
 * `TIMELINE_ENTRY_LIMITS` in the content contracts and by the admin form's browser copy (D10).
 */
export const TIMELINE_ENTRY_LIMITS: {
  readonly title: 120;
  readonly place: 120;
  readonly description: 600;
  readonly techs: 12;
} = { title: 120, place: 120, description: 600, techs: 12 } as const;

/**
 * Type TimelineTextField
 * @type TimelineTextField
 *
 * @description
 * Localized text fields of an entry, named as in the administration contract.
 */
type TimelineTextField = 'title' | 'place' | 'description';

/**
 * Constant TEXT_FIELDS
 *
 * @description
 * Localized text fields in form order.
 */
const TEXT_FIELDS: readonly TimelineTextField[] = ['title', 'place', 'description'];

/**
 * Constant TECH_KEY
 *
 * @description
 * Pattern of a normalized technology key, the same as the project technologies.
 */
const TECH_KEY: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Interface TimelineEntryProps
 * @interface TimelineEntryProps
 *
 * @description
 * Complete persisted state of an education or experience entry.
 */
export interface TimelineEntryProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier of this timeline entry.
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes education entries from experience entries; never changes after creation.
   */
  readonly kind: TimelineKind;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Localized role, degree or programme title.
   */
  readonly title: LocalizedText;

  /**
   * Property place
   * @readonly
   *
   * @description
   * Localized employer, school or location name.
   */
  readonly place: LocalizedText;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Localized summary of the experience or education entry.
   */
  readonly description: LocalizedText;

  /**
   * Property period
   * @readonly
   *
   * @description
   * Start and optional end month; a missing end marks an ongoing entry.
   */
  readonly period: Period;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys associated with this entry, in display order.
   */
  readonly techs: readonly string[];

  /**
   * Property position
   * @readonly
   *
   * @description
   * Nonnegative editorial order within the entry's kind, starting at 0.
   */
  readonly position: number;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Optimistic-lock version of the entry's content, starting at 1; a move does not change it.
   */
  readonly version: number;
  // #endregion
}

/**
 * Type TimelineEntryRevision
 * @type TimelineEntryRevision
 *
 * @description
 * Administration-editable content of an entry; identity, kind, position and version use separate
 * operations.
 */
export type TimelineEntryRevision = Pick<
  TimelineEntryProps,
  'title' | 'place' | 'description' | 'period' | 'techs'
>;

/**
 * Interface TimelineEntryDraft
 * @interface TimelineEntryDraft
 *
 * @description
 * Unvalidated revision as received from an administrator: localized texts and months are checked by
 * `TimelineEntry` under the contract's field names (`title.fr`, `start`, `end`).
 */
export interface TimelineEntryDraft {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Title per locale.
   */
  readonly title: { readonly fr: string; readonly en?: string | undefined };

  /**
   * Property place
   * @readonly
   *
   * @description
   * Place per locale.
   */
  readonly place: { readonly fr: string; readonly en?: string | undefined };

  /**
   * Property description
   * @readonly
   *
   * @description
   * Description per locale.
   */
  readonly description: { readonly fr: string; readonly en?: string | undefined };

  /**
   * Property start
   * @readonly
   *
   * @description
   * First month of the entry.
   */
  readonly start: YearMonth;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last month, or `null` while ongoing.
   */
  readonly end: YearMonth | null;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys.
   */
  readonly techs: readonly string[];
  // #endregion
}

/**
 * Class TimelineEntry
 * @class TimelineEntry
 *
 * @description
 * Education or experience aggregate. Entries are public as soon as they are written (there is no
 * draft), so creating or revising one requires both locales, as a published project must stay complete.
 */
export class TimelineEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wraps validated state; callers use `create`, `rehydrate` or `revise`.
   *
   * @param {TimelineEntryProps} props - Aggregate state.
   */
  private constructor(private props: TimelineEntryProps) {}
  // #endregion

  // #region Methods
  /**
   * Method revisionOf
   * @method revisionOf
   *
   * @description
   * Validates an administrator draft: each text within `TIMELINE_ENTRY_LIMITS` (French required by
   * `LocalizedText`), months from 1990 to 2100 with the end not before the start, and normalized,
   * distinct technology keys. Missing English texts are reported by `create` and `revise`.
   *
   * @param {TimelineEntryDraft} draft - Unvalidated revision.
   * @throws {InvalidValueError} With the contract path of the first invalid field.
   * @returns {TimelineEntryRevision} Domain revision.
   */
  public static revisionOf(draft: TimelineEntryDraft): TimelineEntryRevision {
    const texts: Record<TimelineTextField, LocalizedText> = {
      title: TimelineEntry.text('title', draft.title),
      place: TimelineEntry.text('place', draft.place),
      description: TimelineEntry.text('description', draft.description),
    };
    return { ...texts, period: TimelineEntry.period(draft.start, draft.end), techs: draft.techs };
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new entry at version 1 and the supplied position, complete in every locale.
   *
   * @param {Pick<TimelineEntryProps, 'id' | 'kind' | 'position'>} identity - Identifier, kind and
   * position (the end of its kind's list).
   * @param {TimelineEntryRevision} revision - Validated content.
   * @throws {DomainError} `content.timeline-entry-incomplete` when an English text is missing.
   * @returns {TimelineEntry} New aggregate.
   */
  public static create(
    identity: Pick<TimelineEntryProps, 'id' | 'kind' | 'position'>,
    revision: TimelineEntryRevision,
  ): TimelineEntry {
    const entry: TimelineEntry = TimelineEntry.rehydrate({ ...identity, ...revision, version: 1 });
    entry.assertComplete();
    return entry;
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Rebuilds persisted state, rejecting a negative position, a version below 1 and malformed or
   * repeated technology keys; stored rows written before the admin may lack English, which falls back
   * on French in the snapshot.
   *
   * @param {TimelineEntryProps} props - Persisted entry state.
   * @returns {TimelineEntry} Rehydrated aggregate, holding a copy of the technology list.
   */
  public static rehydrate(props: TimelineEntryProps): TimelineEntry {
    if (!Number.isInteger(props.position) || props.position < 0) {
      throw new InvalidValueError('position', 'nonnegative integer expected');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InvalidValueError('version', 'integer greater than or equal to 1 expected');
    }
    for (const field of TEXT_FIELDS) {
      for (const locale of LOCALES) {
        const value: string | undefined = props[field][locale];
        if (value !== undefined && value.length > TIMELINE_ENTRY_LIMITS[field]) {
          throw new InvalidValueError(
            `${field}.${locale}`,
            `at most ${TIMELINE_ENTRY_LIMITS[field]} characters`,
          );
        }
      }
    }
    if (props.techs.length > TIMELINE_ENTRY_LIMITS.techs) {
      throw new InvalidValueError('techs', `at most ${TIMELINE_ENTRY_LIMITS.techs} techs`);
    }
    const badTech: string | undefined = props.techs.find(
      (tech: string): boolean => !TECH_KEY.test(tech),
    );
    if (badTech !== undefined) {
      throw new InvalidValueError('techs', `invalid tech key "${badTech}"`);
    }
    if (new Set(props.techs).size !== props.techs.length) {
      throw new InvalidValueError('techs', 'a tech appears twice');
    }
    return new TimelineEntry({ ...props, techs: [...props.techs] });
  }

  /**
   * Method reorder
   * @method reorder
   *
   * @description
   * Moves the entries of one kind to the order of `ids`, which must name each of them exactly once.
   *
   * @param {readonly TimelineEntry[]} entries - Every entry of the kind.
   * @param {readonly string[]} ids - Wanted order.
   * @throws {DomainError} `content.timeline-order-invalid` when `ids` is not a permutation of them.
   * @returns {TimelineEntry[]} The entries whose position changed.
   */
  public static reorder(
    entries: readonly TimelineEntry[],
    ids: readonly string[],
  ): TimelineEntry[] {
    const byId: Map<string, TimelineEntry> = new Map(
      entries.map((entry: TimelineEntry): [string, TimelineEntry] => [entry.id, entry]),
    );
    if (
      ids.length !== entries.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id: string): boolean => !byId.has(id))
    ) {
      throw new DomainError(
        'content.timeline-order-invalid',
        'The order must list every entry of the kind exactly once.',
        ['ids'],
      );
    }
    return ids.flatMap((id: string, position: number): TimelineEntry[] => {
      const entry: TimelineEntry = byId.get(id) as TimelineEntry;
      if (entry.position === position) return [];
      entry.moveTo(position);
      return [entry];
    });
  }

  /**
   * Method compare
   * @method compare
   *
   * @description
   * Snapshot order: education before experience (`TIMELINE_KINDS`), then chronology (`Period.compareTo`:
   * start, then end, an ongoing period last), then identifier. The position is left out: the public
   * timeline places the entries by date and the admin offers no manual order (D36 timeline selection
   * revision), so two entries of the same start year keep their chronological order.
   *
   * @param {TimelineEntry} a - First entry.
   * @param {TimelineEntry} b - Second entry.
   * @returns {number} Negative, zero or positive.
   */
  public static compare(a: TimelineEntry, b: TimelineEntry): number {
    return (
      TIMELINE_KINDS.indexOf(a.kind) - TIMELINE_KINDS.indexOf(b.kind) ||
      a.period.compareTo(b.period) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the stable identifier.
   *
   * @returns {string} Entry identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method kind
   * @method kind
   *
   * @description
   * Returns the kind.
   *
   * @returns {TimelineKind} Education or experience.
   */
  public get kind(): TimelineKind {
    return this.props.kind;
  }

  /**
   * Method title
   * @method title
   *
   * @description
   * Returns the localized title.
   *
   * @returns {LocalizedText} Title.
   */
  public get title(): LocalizedText {
    return this.props.title;
  }

  /**
   * Method place
   * @method place
   *
   * @description
   * Returns the localized place.
   *
   * @returns {LocalizedText} Place.
   */
  public get place(): LocalizedText {
    return this.props.place;
  }

  /**
   * Method description
   * @method description
   *
   * @description
   * Returns the localized description.
   *
   * @returns {LocalizedText} Description.
   */
  public get description(): LocalizedText {
    return this.props.description;
  }

  /**
   * Method period
   * @method period
   *
   * @description
   * Returns the month-precision period.
   *
   * @returns {Period} Period.
   */
  public get period(): Period {
    return this.props.period;
  }

  /**
   * Method techs
   * @method techs
   *
   * @description
   * Returns the technology keys.
   *
   * @returns {readonly string[]} Technology keys.
   */
  public get techs(): readonly string[] {
    return this.props.techs;
  }

  /**
   * Method position
   * @method position
   *
   * @description
   * Returns the position within the kind.
   *
   * @returns {number} Nonnegative position.
   */
  public get position(): number {
    return this.props.position;
  }

  /**
   * Method version
   * @method version
   *
   * @description
   * Returns the optimistic-lock version of the content.
   *
   * @returns {number} Version.
   */
  public get version(): number {
    return this.props.version;
  }

  /**
   * Method missingFor
   * @method missingFor
   *
   * @description
   * Lists the text paths (`title.en`…) without content in the supplied locales.
   *
   * @param {readonly Locale[]} locales - Locales to check.
   * @returns {string[]} Missing field paths.
   */
  public missingFor(locales: readonly Locale[]): string[] {
    return locales.flatMap((locale: Locale): string[] =>
      TEXT_FIELDS.filter((field: TimelineTextField): boolean => {
        return !this.props[field].isCompleteFor(locale);
      }).map((field: TimelineTextField): string => `${field}.${locale}`),
    );
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the editable content, keeping identity, kind, position and version; the result must stay
   * complete in every locale.
   *
   * @param {TimelineEntryRevision} revision - New content.
   * @throws {DomainError} `content.timeline-entry-incomplete` when an English text is missing.
   * @returns {void} Completes after replacing the content.
   */
  public revise(revision: TimelineEntryRevision): void {
    const next: TimelineEntry = TimelineEntry.rehydrate({
      ...this.props,
      title: revision.title,
      place: revision.place,
      description: revision.description,
      period: revision.period,
      techs: revision.techs,
    });
    next.assertComplete();
    this.props = next.props;
  }

  /**
   * Method moveTo
   * @method moveTo
   *
   * @description
   * Changes the position within the kind.
   *
   * @param {number} position - New nonnegative position.
   * @returns {void} Completes after the move.
   */
  public moveTo(position: number): void {
    this.props = TimelineEntry.rehydrate({ ...this.props, position }).props;
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns the persisted properties for adapters and presenters.
   *
   * @returns {TimelineEntryProps} Current state.
   */
  public snapshot(): TimelineEntryProps {
    return this.props;
  }

  /**
   * Method assertComplete
   * @method assertComplete
   *
   * @description
   * Rejects an entry missing text in a locale.
   *
   * @throws {DomainError} `content.timeline-entry-incomplete` listing the missing paths.
   * @returns {void} Completes when every text exists in every locale.
   */
  private assertComplete(): void {
    const missing: string[] = this.missingFor(LOCALES);
    if (missing.length > 0) {
      throw new DomainError(
        'content.timeline-entry-incomplete',
        'A timeline entry is public at once: write its texts in French and English.',
        missing,
      );
    }
  }

  /**
   * Method text
   * @method text
   *
   * @description
   * Normalizes one localized field and checks its length per locale.
   *
   * @param {TimelineTextField} field - Field name.
   * @param {{ fr: string; en?: string }} value - Raw translations.
   * @returns {LocalizedText} Normalized value.
   */
  private static text(
    field: TimelineTextField,
    value: { readonly fr: string; readonly en?: string | undefined },
  ): LocalizedText {
    const text: LocalizedText = LocalizedText.of(
      `${field}.fr`,
      value.en === undefined ? { fr: value.fr } : { fr: value.fr, en: value.en },
    );
    for (const locale of LOCALES) {
      if ((text[locale] ?? '').length > TIMELINE_ENTRY_LIMITS[field]) {
        throw new InvalidValueError(
          `${field}.${locale}`,
          `at most ${TIMELINE_ENTRY_LIMITS[field]} characters`,
        );
      }
    }
    return text;
  }

  /**
   * Method period
   * @method period
   *
   * @description
   * Builds the period, reporting a bad month under `start` or `end` and an end before the start under
   * `end`, as the contract names them.
   *
   * @param {YearMonth} start - First month.
   * @param {YearMonth | null} end - Last month, or `null`.
   * @returns {Period} Validated period.
   */
  private static period(start: YearMonth, end: YearMonth | null): Period {
    try {
      Period.of(start, null);
    } catch {
      throw new InvalidValueError('start', `${start.year}-${start.month} is not a valid month`);
    }
    try {
      return Period.of(start, end);
    } catch {
      throw new InvalidValueError('end', 'the end precedes the start or is not a valid month');
    }
  }
  // #endregion
}
