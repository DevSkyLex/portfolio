import {
  type ContentRepositories,
  type ContentUnitOfWork,
  type ProjectRepository,
  type SiteBuildRequestRepository,
  VersionMismatchError,
} from '@vfortin/content-application';
import type {
  LocalizedText,
  LocalizedTextProps,
  Project,
  ProjectArticle,
  ProjectProps,
} from '@vfortin/content-domain';
import { and, desc, eq, gt, lte, sql } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import { toProject } from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import { DrizzleMediaRepository } from '@internal/content-adapters-out/lib/persistence/repositories/media/drizzle-media.repository';
import {
  contentRevision,
  projects,
  siteBuildRequests,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Constant props
 *
 * @description
 * Converts normalized localized text back to the JSON representation stored in PostgreSQL.
 */
const props = (text: LocalizedText): LocalizedTextProps => text.toProps();

/**
 * Class DrizzleProjectRepository
 * @class DrizzleProjectRepository
 *
 * @description
 * Implements project reads and optimistic-locking updates using the content Drizzle tables.
 */
export class DrizzleProjectRepository implements ProjectRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the transaction-capable content database used for project queries.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Loads all project rows and rehydrates them into validated aggregates.
   *
   * @returns {Promise<Project[]>} Stored projects, including drafts.
   */
  public async list(): Promise<Project[]> {
    return (await this.db.select().from(projects)).map(toProject);
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one project row and maps it to a domain aggregate when present.
   *
   * @param {string} id - Project identifier.
   * @returns {Promise<Project | null>} Aggregate, or `null` when absent.
   */
  public async get(id: string): Promise<Project | null> {
    const [row] = await this.db.select().from(projects).where(eq(projects.id, id));
    return row ? toProject(row) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates editable project values and increments the stored version only when the expected
   * version still matches; rejects with `VersionMismatchError` when no row was updated.
   *
   * @param {Project} project - Aggregate state to persist.
   * @param {number} expectedVersion - Version read before the edit.
   * @returns {Promise<number>} Incremented persisted version.
   */
  public async save(project: Project, expectedVersion: number): Promise<number> {
    const p: ProjectProps = project.snapshot();
    const article: ProjectArticle = p.article;
    const { keywords, ...seoTexts } = p.seo.toProps();
    const updated: { version: number }[] = await this.db
      .update(projects)
      .set({
        title: props(p.title),
        summary: props(p.summary),
        lead: props(p.lead),
        period: p.period.toProps(),
        client: props(p.client),
        role: props(p.role),
        place: props(p.place),
        siteUrl: p.siteUrl,
        techs: [...p.techs],
        featured: p.featured,
        status: p.status,
        article:
          article.en === undefined
            ? { fr: article.fr.toProps() }
            : { fr: article.fr.toProps(), en: article.en.toProps() },
        cover:
          p.cover === null
            ? null
            : {
                media: p.cover.media,
                alt:
                  p.cover.alt.en === undefined
                    ? { fr: p.cover.alt.fr }
                    : { fr: p.cover.alt.fr, en: p.cover.alt.en },
              },
        // Texts and keywords live in separate columns (migration 0005).
        seo: seoTexts,
        seoKeywords: keywords,
        version: sql`${projects.version} + 1`,
      })
      // Optimistic locking: no row updated if someone saved in the meantime.
      .where(and(eq(projects.id, p.id), eq(projects.version, expectedVersion)))
      .returning({ version: projects.version });
    const row: { version: number } | undefined = updated[0];
    if (row === undefined) {
      throw new VersionMismatchError();
    }
    return row.version;
  }
  // #endregion
}

/**
 * Class DrizzleSiteBuildRequestRepository
 * @class DrizzleSiteBuildRequestRepository
 *
 * @description
 * Persists content revision increments and coordinates rebuild outbox claims and delivery state.
 */
export class DrizzleSiteBuildRequestRepository implements SiteBuildRequestRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle used for revision and outbox operations.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method request
   * @method request
   *
   * @description
   * Atomically increments the singleton content revision and inserts its pending build request.
   *
   * @param {Date} now - Request creation time.
   * @returns {Promise<number>} New revision stored in the outbox.
   */
  public async request(now: Date): Promise<number> {
    const [row] = await this.db
      .insert(contentRevision)
      .values({ id: 1, revision: 1 })
      .onConflictDoUpdate({
        target: contentRevision.id,
        set: { revision: sql`${contentRevision.revision} + 1` },
      })
      .returning({ revision: contentRevision.revision });
    const revision: number = row?.revision ?? 1;
    await this.db
      .insert(siteBuildRequests)
      .values({ revision, status: 'pending', requestedAt: now, nextAttemptAt: now });
    return revision;
  }

  /**
   * Method claimLatest
   * @method claimLatest
   *
   * @description
   * Serializes workers on the revision row, refuses active leases and leases the newest due request.
   * The newest request covers all older revisions.
   *
   * @param {Date} now - Current time used for lease and retry checks.
   * @param {Date} leaseUntil - Expiration of the claim being created.
   * @returns {Promise<{ revision: number; attempts: number } | null>} Claim details or `null` when
   * no request is available.
   */
  public async claimLatest(
    now: Date,
    leaseUntil: Date,
  ): Promise<{ revision: number; attempts: number } | null> {
    return this.db.transaction(
      async (tx: ContentTransaction): Promise<{ revision: number; attempts: number } | null> => {
        // The revision row serializes claims across instances. Another request is blocked only while
        // its lease remains active; after expiry, a worker may reclaim it.
        await tx
          .select({ id: contentRevision.id })
          .from(contentRevision)
          .where(eq(contentRevision.id, 1))
          .for('update');
        const [active] = await tx
          .select({ revision: siteBuildRequests.revision })
          .from(siteBuildRequests)
          .where(
            and(eq(siteBuildRequests.status, 'pending'), gt(siteBuildRequests.claimedUntil, now)),
          )
          .limit(1);
        if (active !== undefined) {
          return null;
        }

        // Only the most recent pending revision matters: it covers the previous ones.
        const [latest] = await tx
          .select({
            revision: siteBuildRequests.revision,
            nextAttemptAt: siteBuildRequests.nextAttemptAt,
          })
          .from(siteBuildRequests)
          .where(eq(siteBuildRequests.status, 'pending'))
          .orderBy(desc(siteBuildRequests.revision))
          .limit(1);
        if (latest === undefined || latest.nextAttemptAt > now) {
          return null;
        }
        const [claimed] = await tx
          .update(siteBuildRequests)
          .set({ claimedUntil: leaseUntil })
          .where(eq(siteBuildRequests.revision, latest.revision))
          .returning({
            revision: siteBuildRequests.revision,
            attempts: siteBuildRequests.attempts,
          });
        return claimed ?? null;
      },
    );
  }

  /**
   * Method markDispatched
   * @method markDispatched
   *
   * @description
   * Marks pending requests through the successfully dispatched revision as complete.
   *
   * @param {number} revision - Highest delivered content revision.
   * @param {Date} now - Completion timestamp.
   * @returns {Promise<void>} Completion after pending requests are marked dispatched.
   */
  public async markDispatched(revision: number, now: Date): Promise<void> {
    await this.db
      .update(siteBuildRequests)
      .set({ status: 'dispatched', dispatchedAt: now, claimedUntil: null, lastError: null })
      .where(
        and(eq(siteBuildRequests.status, 'pending'), lte(siteBuildRequests.revision, revision)),
      );
  }

  /**
   * Method markFailed
   * @method markFailed
   *
   * @description
   * Increments the attempt count, clears the lease and stores a bounded error for later retry.
   *
   * @param {number} revision - Failed revision.
   * @param {string} reason - Failure detail, truncated to 500 characters.
   * @param {Date} nextAttemptAt - Earliest time the worker may retry.
   * @returns {Promise<void>} Completion after the failed request is scheduled for retry.
   */
  public async markFailed(revision: number, reason: string, nextAttemptAt: Date): Promise<void> {
    await this.db
      .update(siteBuildRequests)
      .set({
        attempts: sql`${siteBuildRequests.attempts} + 1`,
        nextAttemptAt,
        claimedUntil: null,
        lastError: reason.slice(0, 500),
      })
      .where(eq(siteBuildRequests.revision, revision));
  }
  // #endregion
}

/**
 * Class DrizzleContentUnitOfWork
 * @class DrizzleContentUnitOfWork
 *
 * @description
 * Runs project, media and rebuild outbox changes in one transaction.
 */
export class DrizzleContentUnitOfWork implements ContentUnitOfWork {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle that creates the shared write transaction.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Value returned by the transaction callback.
   *
   * @description
   * Executes the supplied callback with project, media and outbox repositories bound to one
   * transaction.
   *
   * @param {(repositories: ContentRepositories) => Promise<T>} work - Atomic operation.
   * @returns {Promise<T>} Callback result after transaction completion.
   */
  public run<T>(work: (repositories: ContentRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx: ContentTransaction): Promise<T> =>
      work({
        projects: new DrizzleProjectRepository(tx),
        buildRequests: new DrizzleSiteBuildRequestRepository(tx),
        media: new DrizzleMediaRepository(tx),
      }),
    );
  }
  // #endregion
}
