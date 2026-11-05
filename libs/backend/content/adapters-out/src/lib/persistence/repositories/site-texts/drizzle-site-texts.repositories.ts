import {
  type LegalDocumentRepository,
  type ProfileRepository,
  type SiteTextsRepositories,
  type SiteTextsUnitOfWork,
  VersionMismatchError,
} from '@vfortin/content-application';
import type { LegalDocument, LegalDocumentKind, Profile } from '@vfortin/content-domain';
import { and, eq, sql } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  toLegalDocument,
  toProfile,
  toProfileRow,
} from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import { DrizzleSiteBuildRequestRepository } from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import { ProfileMissingError } from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';
import {
  legalDocuments,
  profile,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Class DrizzleProfileRepository
 * @class DrizzleProfileRepository
 *
 * @description
 * Singleton profile row `id = 1` over `content.profile`; a write carries the version in its predicate.
 */
export class DrizzleProfileRepository implements ProfileRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database or transaction handle.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Loads the profile and rejects with `ProfileMissingError` if the singleton is absent.
   *
   * @returns {Promise<Profile>} Profile with its version.
   */
  public async load(): Promise<Profile> {
    const [row] = await this.db.select().from(profile).where(eq(profile.id, 1));
    if (row === undefined) {
      throw new ProfileMissingError();
    }
    return toProfile(row);
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the editable columns and increments the version where the expected version matches.
   *
   * @param {Profile} value - Revised profile.
   * @param {number} expectedVersion - Version read before editing.
   * @returns {Promise<number>} New version.
   */
  public async save(value: Profile, expectedVersion: number): Promise<number> {
    const [row] = await this.db
      .update(profile)
      .set({ ...toProfileRow(value), version: sql`${profile.version} + 1` })
      .where(and(eq(profile.id, 1), eq(profile.version, expectedVersion)))
      .returning({ version: profile.version });
    if (row === undefined) {
      throw new VersionMismatchError('The profile was modified in the meantime; reload it.');
    }
    return row.version;
  }
  // #endregion
}

/**
 * Class DrizzleLegalDocumentRepository
 * @class DrizzleLegalDocumentRepository
 *
 * @description
 * Legal documents over `content.legal_documents`; a write carries the version in its predicate.
 */
export class DrizzleLegalDocumentRepository implements LegalDocumentRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database or transaction handle.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one document by kind.
   *
   * @param {LegalDocumentKind} kind - Document to load.
   * @returns {Promise<LegalDocument | null>} Document, or `null` when absent.
   */
  public async get(kind: LegalDocumentKind): Promise<LegalDocument | null> {
    const [row] = await this.db.select().from(legalDocuments).where(eq(legalDocuments.kind, kind));
    return row ? toLegalDocument(row) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the body and the last save time and increments the version where the kind and expected
   * version match.
   *
   * @param {LegalDocument} document - Revised document.
   * @param {number} expectedVersion - Version read before editing.
   * @returns {Promise<number>} New version.
   */
  public async save(document: LegalDocument, expectedVersion: number): Promise<number> {
    const [row] = await this.db
      .update(legalDocuments)
      .set({
        body: { fr: document.body.fr.toProps(), en: document.body.en.toProps() },
        updatedAt: document.updatedAt,
        version: sql`${legalDocuments.version} + 1`,
      })
      .where(
        and(eq(legalDocuments.kind, document.kind), eq(legalDocuments.version, expectedVersion)),
      )
      .returning({ version: legalDocuments.version });
    if (row === undefined) {
      throw new VersionMismatchError('The document was modified in the meantime; reload it.');
    }
    return row.version;
  }
  // #endregion
}

/**
 * Class DrizzleSiteTextsUnitOfWork
 * @class DrizzleSiteTextsUnitOfWork
 *
 * @description
 * Runs profile, legal document and rebuild outbox writes in one transaction (D3).
 */
export class DrizzleSiteTextsUnitOfWork implements SiteTextsUnitOfWork {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle that opens the transaction.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Callback result.
   *
   * @description
   * Executes the callback with repositories bound to one transaction.
   *
   * @param {(repositories: SiteTextsRepositories) => Promise<T>} work - Atomic operation.
   * @returns {Promise<T>} Callback result after commit.
   */
  public run<T>(work: (repositories: SiteTextsRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx: ContentTransaction): Promise<T> =>
      work({
        profiles: new DrizzleProfileRepository(tx),
        legalDocuments: new DrizzleLegalDocumentRepository(tx),
        buildRequests: new DrizzleSiteBuildRequestRepository(tx),
      }),
    );
  }
  // #endregion
}
