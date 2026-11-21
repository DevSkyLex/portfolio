import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  LOCALES,
  type Locale,
  LocalizedText,
} from '@internal/content-domain/lib/values/localized-text/localized-text';

/**
 * Constant FAQ_ENTRY_LIMITS
 *
 * @description
 * Longest trimmed text per locale of a question and of its answer; mirrored by `FAQ_ENTRY_LIMITS` in
 * the content contracts and by the admin form's browser copy (D10).
 */
export const FAQ_ENTRY_LIMITS: {
  readonly question: 200;
  readonly answer: 2000;
} = { question: 200, answer: 2000 } as const;

/**
 * Type FaqTextField
 * @type FaqTextField
 *
 * @description
 * Localized text fields of an entry, named as in the administration contract.
 */
type FaqTextField = 'question' | 'answer';

/**
 * Constant TEXT_FIELDS
 *
 * @description
 * Localized text fields in form order.
 */
const TEXT_FIELDS: readonly FaqTextField[] = ['question', 'answer'];

/**
 * Interface FaqEntryProps
 * @interface FaqEntryProps
 *
 * @description
 * Complete persisted state of a frequently asked question and its answer.
 */
export interface FaqEntryProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier of this entry.
   */
  readonly id: string;

  /**
   * Property question
   * @readonly
   *
   * @description
   * Localized question, plain text.
   */
  readonly question: LocalizedText;

  /**
   * Property answer
   * @readonly
   *
   * @description
   * Localized answer, plain text; line breaks are kept as typed.
   */
  readonly answer: LocalizedText;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Nonnegative editorial order of the entry, starting at 0; the public list follows it.
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
 * Type FaqEntryRevision
 * @type FaqEntryRevision
 *
 * @description
 * Administration-editable content of an entry; identity, position and version use separate
 * operations.
 */
export type FaqEntryRevision = Pick<FaqEntryProps, 'question' | 'answer'>;

/**
 * Interface FaqEntryDraft
 * @interface FaqEntryDraft
 *
 * @description
 * Unvalidated revision as received from an administrator: localized texts are checked by `FaqEntry`
 * under the contract's field names (`question.fr`, `answer.en`).
 */
export interface FaqEntryDraft {
  // #region Properties
  /**
   * Property question
   * @readonly
   *
   * @description
   * Question per locale.
   */
  readonly question: { readonly fr: string; readonly en?: string | undefined };

  /**
   * Property answer
   * @readonly
   *
   * @description
   * Answer per locale.
   */
  readonly answer: { readonly fr: string; readonly en?: string | undefined };
  // #endregion
}

/**
 * Class FaqEntry
 * @class FaqEntry
 *
 * @description
 * Question and answer aggregate of the public FAQ. Entries are public as soon as they are written
 * (there is no draft), so creating or revising one requires both locales, as for a timeline entry.
 */
export class FaqEntry {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wraps validated state; callers use `create`, `rehydrate` or `revise`.
   *
   * @param {FaqEntryProps} props - Aggregate state.
   */
  private constructor(private props: FaqEntryProps) {}
  // #endregion

  // #region Methods
  /**
   * Method revisionOf
   * @method revisionOf
   *
   * @description
   * Validates an administrator draft: each text within `FAQ_ENTRY_LIMITS` (French required by
   * `LocalizedText`). Missing English texts are reported by `create` and `revise`.
   *
   * @param {FaqEntryDraft} draft - Unvalidated revision.
   * @throws {InvalidValueError} With the contract path of the first invalid field.
   * @returns {FaqEntryRevision} Domain revision.
   */
  public static revisionOf(draft: FaqEntryDraft): FaqEntryRevision {
    return {
      question: FaqEntry.text('question', draft.question),
      answer: FaqEntry.text('answer', draft.answer),
    };
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new entry at version 1 and the supplied position, complete in every locale.
   *
   * @param {Pick<FaqEntryProps, 'id' | 'position'>} identity - Identifier and position (the end of
   * the list).
   * @param {FaqEntryRevision} revision - Validated content.
   * @throws {DomainError} `content.faq-entry-incomplete` when an English text is missing.
   * @returns {FaqEntry} New aggregate.
   */
  public static create(
    identity: Pick<FaqEntryProps, 'id' | 'position'>,
    revision: FaqEntryRevision,
  ): FaqEntry {
    const entry: FaqEntry = FaqEntry.rehydrate({ ...identity, ...revision, version: 1 });
    entry.assertComplete();
    return entry;
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Rebuilds persisted state, rejecting a negative position, a version below 1 and a text over its
   * limit; a stored row lacking English falls back on French in the snapshot.
   *
   * @param {FaqEntryProps} props - Persisted entry state.
   * @returns {FaqEntry} Rehydrated aggregate.
   */
  public static rehydrate(props: FaqEntryProps): FaqEntry {
    if (!Number.isInteger(props.position) || props.position < 0) {
      throw new InvalidValueError('position', 'nonnegative integer expected');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InvalidValueError('version', 'integer greater than or equal to 1 expected');
    }
    for (const field of TEXT_FIELDS) {
      for (const locale of LOCALES) {
        const value: string | undefined = props[field][locale];
        if (value !== undefined && value.length > FAQ_ENTRY_LIMITS[field]) {
          throw new InvalidValueError(
            `${field}.${locale}`,
            `at most ${FAQ_ENTRY_LIMITS[field]} characters`,
          );
        }
      }
    }
    return new FaqEntry({ ...props });
  }

  /**
   * Method reorder
   * @method reorder
   *
   * @description
   * Moves the entries to the order of `ids`, which must name each of them exactly once.
   *
   * @param {readonly FaqEntry[]} entries - Every entry of the FAQ.
   * @param {readonly string[]} ids - Wanted order.
   * @throws {DomainError} `content.faq-order-invalid` when `ids` is not a permutation of them.
   * @returns {FaqEntry[]} The entries whose position changed.
   */
  public static reorder(entries: readonly FaqEntry[], ids: readonly string[]): FaqEntry[] {
    const byId: Map<string, FaqEntry> = new Map(
      entries.map((entry: FaqEntry): [string, FaqEntry] => [entry.id, entry]),
    );
    if (
      ids.length !== entries.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id: string): boolean => !byId.has(id))
    ) {
      throw new DomainError(
        'content.faq-order-invalid',
        'The order must list every question exactly once.',
        ['ids'],
      );
    }
    return ids.flatMap((id: string, position: number): FaqEntry[] => {
      const entry: FaqEntry = byId.get(id) as FaqEntry;
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
   * Admin and snapshot order: position, then identifier for rows sharing a position.
   *
   * @param {FaqEntry} a - First entry.
   * @param {FaqEntry} b - Second entry.
   * @returns {number} Negative, zero or positive.
   */
  public static compare(a: FaqEntry, b: FaqEntry): number {
    return a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
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
   * Method question
   * @method question
   *
   * @description
   * Returns the localized question.
   *
   * @returns {LocalizedText} Question.
   */
  public get question(): LocalizedText {
    return this.props.question;
  }

  /**
   * Method answer
   * @method answer
   *
   * @description
   * Returns the localized answer.
   *
   * @returns {LocalizedText} Answer.
   */
  public get answer(): LocalizedText {
    return this.props.answer;
  }

  /**
   * Method position
   * @method position
   *
   * @description
   * Returns the position in the list.
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
   * Lists the text paths (`question.en`…) without content in the supplied locales.
   *
   * @param {readonly Locale[]} locales - Locales to check.
   * @returns {string[]} Missing field paths.
   */
  public missingFor(locales: readonly Locale[]): string[] {
    return locales.flatMap((locale: Locale): string[] =>
      TEXT_FIELDS.filter((field: FaqTextField): boolean => {
        return !this.props[field].isCompleteFor(locale);
      }).map((field: FaqTextField): string => `${field}.${locale}`),
    );
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the editable content, keeping identity, position and version; the result must stay
   * complete in every locale.
   *
   * @param {FaqEntryRevision} revision - New content.
   * @throws {DomainError} `content.faq-entry-incomplete` when an English text is missing.
   * @returns {void} Completes after replacing the content.
   */
  public revise(revision: FaqEntryRevision): void {
    const next: FaqEntry = FaqEntry.rehydrate({
      ...this.props,
      question: revision.question,
      answer: revision.answer,
    });
    next.assertComplete();
    this.props = next.props;
  }

  /**
   * Method moveTo
   * @method moveTo
   *
   * @description
   * Changes the position in the list.
   *
   * @param {number} position - New nonnegative position.
   * @returns {void} Completes after the move.
   */
  public moveTo(position: number): void {
    this.props = FaqEntry.rehydrate({ ...this.props, position }).props;
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns the persisted properties for adapters and presenters.
   *
   * @returns {FaqEntryProps} Current state.
   */
  public snapshot(): FaqEntryProps {
    return this.props;
  }

  /**
   * Method assertComplete
   * @method assertComplete
   *
   * @description
   * Rejects an entry missing text in a locale.
   *
   * @throws {DomainError} `content.faq-entry-incomplete` listing the missing paths.
   * @returns {void} Completes when every text exists in every locale.
   */
  private assertComplete(): void {
    const missing: string[] = this.missingFor(LOCALES);
    if (missing.length > 0) {
      throw new DomainError(
        'content.faq-entry-incomplete',
        'A question is public at once: write it and its answer in French and English.',
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
   * @param {FaqTextField} field - Field name.
   * @param {{ fr: string; en?: string }} value - Raw translations.
   * @returns {LocalizedText} Normalized value.
   */
  private static text(
    field: FaqTextField,
    value: { readonly fr: string; readonly en?: string | undefined },
  ): LocalizedText {
    const text: LocalizedText = LocalizedText.of(
      `${field}.fr`,
      value.en === undefined ? { fr: value.fr } : { fr: value.fr, en: value.en },
    );
    for (const locale of LOCALES) {
      if ((text[locale] ?? '').length > FAQ_ENTRY_LIMITS[field]) {
        throw new InvalidValueError(
          `${field}.${locale}`,
          `at most ${FAQ_ENTRY_LIMITS[field]} characters`,
        );
      }
    }
    return text;
  }
  // #endregion
}
