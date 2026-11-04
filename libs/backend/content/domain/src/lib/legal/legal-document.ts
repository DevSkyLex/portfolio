import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  ArticleDocument,
  type ArticleDocumentProps,
} from '@internal/content-domain/lib/values/article-document/article-document';
import {
  LOCALES,
  type Locale,
} from '@internal/content-domain/lib/values/localized-text/localized-text';

/**
 * Constant LEGAL_DOCUMENT_KINDS
 *
 * @description
 * The site's legal documents: the legal notice (`/legal-notice`) and the privacy policy (`/privacy`).
 */
export const LEGAL_DOCUMENT_KINDS: readonly ['notice', 'privacy'] = ['notice', 'privacy'] as const;

/**
 * Type LegalDocumentKind
 * @type LegalDocumentKind
 *
 * @description
 * Legal notice or privacy policy.
 */
export type LegalDocumentKind = (typeof LEGAL_DOCUMENT_KINDS)[number];

/**
 * Type LegalBody
 * @type LegalBody
 *
 * @description
 * Document of each language; both always exist, since the page is public at once.
 */
export type LegalBody = Readonly<Record<Locale, ArticleDocument>>;

/**
 * Interface LegalDocumentProps
 * @interface LegalDocumentProps
 *
 * @description
 * Persisted state of a legal document.
 */
export interface LegalDocumentProps {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Which document; also its identity.
   */
  readonly kind: LegalDocumentKind;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Document per language.
   */
  readonly body: LegalBody;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Time of the last save, shown publicly as « Dernière mise à jour ».
   */
  readonly updatedAt: Date;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Optimistic-lock version, starting at 1.
   */
  readonly version: number;
  // #endregion
}

/**
 * Class LegalDocument
 * @class LegalDocument
 *
 * @description
 * Legal notice or privacy policy (« Légal »): one article document per language (D40) without
 * figures, whose last save date the page shows. It is public as soon as it is saved, so both
 * languages must hold text.
 */
export class LegalDocument {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wraps validated state; callers use `rehydrate` or `revise`.
   *
   * @param {LegalDocumentProps} props - Aggregate state.
   */
  private constructor(private props: LegalDocumentProps) {}
  // #endregion

  // #region Methods
  /**
   * Method bodyOf
   * @method bodyOf
   *
   * @description
   * Builds the documents of a revision, reporting a malformed or illustrated one under `body.<locale>`.
   *
   * @param {Readonly<Record<Locale, ArticleDocumentProps>>} body - Raw documents.
   * @throws {InvalidValueError} Under `body.<locale>` for a document without blocks or with a figure.
   * @returns {LegalBody} Documents.
   */
  public static bodyOf(body: Readonly<Record<Locale, ArticleDocumentProps>>): LegalBody {
    const of: (locale: Locale) => ArticleDocument = (locale: Locale): ArticleDocument => {
      const document: ArticleDocument = ArticleDocument.of(`body.${locale}`, body[locale]);
      if (document.mediaIds().length > 0) {
        throw new InvalidValueError(`body.${locale}`, 'a legal document holds no image');
      }
      return document;
    };
    return { fr: of('fr'), en: of('en') };
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Rebuilds persisted state, rejecting a version below 1 and an unknown kind.
   *
   * @param {LegalDocumentProps} props - Persisted state.
   * @returns {LegalDocument} Aggregate.
   */
  public static rehydrate(props: LegalDocumentProps): LegalDocument {
    if (!LEGAL_DOCUMENT_KINDS.includes(props.kind)) {
      throw new InvalidValueError('kind', `unknown legal document "${String(props.kind)}"`);
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InvalidValueError('version', 'integer greater than or equal to 1 expected');
    }
    return new LegalDocument({ ...props });
  }

  /**
   * Method kind
   * @method kind
   *
   * @description
   * Returns the document kind.
   *
   * @returns {LegalDocumentKind} Kind.
   */
  public get kind(): LegalDocumentKind {
    return this.props.kind;
  }

  /**
   * Method body
   * @method body
   *
   * @description
   * Returns the document per language.
   *
   * @returns {LegalBody} Documents.
   */
  public get body(): LegalBody {
    return this.props.body;
  }

  /**
   * Method updatedAt
   * @method updatedAt
   *
   * @description
   * Returns the time of the last save.
   *
   * @returns {Date} Last save.
   */
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Method version
   * @method version
   *
   * @description
   * Returns the optimistic-lock version.
   *
   * @returns {number} Version.
   */
  public get version(): number {
    return this.props.version;
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces both documents and dates the change; each language must hold text.
   *
   * @param {LegalBody} body - New documents.
   * @param {Date} at - Time of the save.
   * @throws {DomainError} `content.legal-document-incomplete` listing the empty languages.
   * @returns {void} Completes after replacing the body.
   */
  public revise(body: LegalBody, at: Date): void {
    const empty: string[] = LOCALES.filter((locale: Locale): boolean => body[locale].isEmpty()).map(
      (locale: Locale): string => `body.${locale}`,
    );
    if (empty.length > 0) {
      throw new DomainError(
        'content.legal-document-incomplete',
        'A legal document is public at once: write it in French and English.',
        empty,
      );
    }
    this.props = { ...this.props, body, updatedAt: at };
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns the persisted properties for adapters and presenters.
   *
   * @returns {LegalDocumentProps} Current state.
   */
  public snapshot(): LegalDocumentProps {
    return this.props;
  }
  // #endregion
}
