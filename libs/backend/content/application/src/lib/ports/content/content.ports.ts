import type {
  LegalDocument,
  LegalDocumentKind,
  Profile,
  Project,
  SkillGroup,
  TimelineEntry,
  TimelineKind,
} from '@vfortin/content-domain';

/**
 * Interface ContentRepository
 * @interface ContentRepository
 *
 * @description
 * Reads profile and collection data from persistence; adapters provide the implementation.
 */
export interface ContentRepository {
  // #region Methods
  /**
   * Method loadProfile
   * @method loadProfile
   *
   * @description
   * Loads the localized profile content.
   *
   * @returns {Promise<Profile>} Persisted profile.
   */
  loadProfile(): Promise<Profile>;

  /**
   * Method listProjects
   * @method listProjects
   *
   * @description
   * Loads all project aggregates, including drafts.
   *
   * @returns {Promise<Project[]>} Stored projects.
   */
  listProjects(): Promise<Project[]>;

  /**
   * Method listTimeline
   * @method listTimeline
   *
   * @description
   * Loads the complete education and experience timeline.
   *
   * @returns {Promise<TimelineEntry[]>} Stored timeline entries.
   */
  listTimeline(): Promise<TimelineEntry[]>;

  /**
   * Method listSkillGroups
   * @method listSkillGroups
   *
   * @description
   * Loads all skill groups.
   *
   * @returns {Promise<SkillGroup[]>} Stored skill groups.
   */
  listSkillGroups(): Promise<SkillGroup[]>;

  /**
   * Method loadLegalDocuments
   * @method loadLegalDocuments
   *
   * @description
   * Loads the legal notice and the privacy policy; both exist once migration 0009 or the seed ran,
   * and the adapter rejects when one is missing rather than publishing an empty legal page.
   *
   * @returns {Promise<Readonly<Record<LegalDocumentKind, LegalDocument>>>} Documents by kind.
   */
  loadLegalDocuments(): Promise<Readonly<Record<LegalDocumentKind, LegalDocument>>>;

  /**
   * Method loadMedia
   * @method loadMedia
   *
   * @description
   * Loads the stored media among the supplied identifiers; unknown identifiers are skipped. Runs in
   * the read-only snapshot, so it takes no lock.
   *
   * @param {readonly string[]} ids - Media referenced by the published projects.
   * @returns {Promise<MediaRecord[]>} Media found, in no particular order.
   */
  loadMedia(ids: readonly string[]): Promise<MediaRecord[]>;

  /**
   * Method currentRevision
   * @method currentRevision
   *
   * @description
   * Reads the revision number incremented whenever published content changes.
   *
   * @returns {Promise<number>} Current published-content revision.
   */
  currentRevision(): Promise<number>;
  // #endregion
}

/**
 * Interface ContentSnapshotReader
 * @interface ContentSnapshotReader
 *
 * @description
 * Provides a consistent read transaction for a published-content query.
 */
export interface ContentSnapshotReader {
  // #region Methods
  /**
   * Method read
   * @method read
   * @template T - Value produced by the read callback.
   *
   * @description
   * Executes the callback against one consistent repository snapshot.
   *
   * @param {(content: ContentRepository) => Promise<T>} work - Snapshot query to execute.
   * @returns {Promise<T>} Callback result after the read transaction completes.
   */
  read<T>(work: (content: ContentRepository) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface ProjectRepository
 * @interface ProjectRepository
 *
 * @description
 * Provides project reads and optimistic-locking writes for administration use cases.
 */
export interface ProjectRepository {
  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Loads projects including drafts for the administration list.
   *
   * @returns {Promise<Project[]>} All stored projects.
   */
  list(): Promise<Project[]>;

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one project by identifier.
   *
   * @param {string} id - Project identifier.
   * @returns {Promise<Project | null>} Aggregate, or `null` when the identifier is absent.
   */
  get(id: string): Promise<Project | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Persists the aggregate only if its stored version matches the expected value.
   *
   * @param {Project} project - Aggregate to save.
   * @param {number} expectedVersion - Version observed before editing.
   * @returns {Promise<number>} New stored version.
   */
  save(project: Project, expectedVersion: number): Promise<number>;
  // #endregion
}

/**
 * Interface SiteBuildRequestRepository
 * @interface SiteBuildRequestRepository
 *
 * @description
 * Persists site rebuild outbox requests and their lease, retry and delivery state.
 */
export interface SiteBuildRequestRepository {
  // #region Methods
  /**
   * Method request
   * @method request
   *
   * @description
   * Increments the published-content revision and records a rebuild request.
   *
   * @param {Date} now - Request creation time.
   * @returns {Promise<number>} New revision associated with the request.
   */
  request(now: Date): Promise<number>;

  /**
   * Method claimLatest
   * @method claimLatest
   *
   * @description
   * Claims the latest pending request, covering older requests; yields `null` when none is pending
   * or another dispatcher currently holds a lease.
   *
   * @param {Date} now - Current time used to test existing leases.
   * @param {Date} leaseUntil - Expiration for the new claim.
   * @returns {Promise<{ revision: number; attempts: number } | null>} Claimed revision and attempt
   * count, or `null` when no claim is available.
   */
  claimLatest(now: Date, leaseUntil: Date): Promise<{ revision: number; attempts: number } | null>;

  /**
   * Method markDispatched
   * @method markDispatched
   *
   * @description
   * Marks requests through the delivered revision as sent because newer content covers them.
   *
   * @param {number} revision - Highest revision included in the completed rebuild.
   * @param {Date} now - Dispatch completion time.
   * @returns {Promise<void>} Completion after all covered requests are marked sent.
   */
  markDispatched(revision: number, now: Date): Promise<void>;

  /**
   * Method markFailed
   * @method markFailed
   *
   * @description
   * Records delivery failure and the earliest time the request may be retried.
   *
   * @param {number} revision - Revision whose dispatch failed.
   * @param {string} reason - Failure detail retained for operations.
   * @param {Date} nextAttemptAt - Scheduled retry time.
   * @returns {Promise<void>} Completion after the failed request is recorded.
   */
  markFailed(revision: number, reason: string, nextAttemptAt: Date): Promise<void>;
  // #endregion
}

/**
 * Interface ContentRepositories
 * @interface ContentRepositories
 *
 * @description
 * Project and rebuild-outbox repositories exposed inside one content write transaction.
 */
export interface ContentRepositories {
  // #region Properties
  /**
   * Property projects
   * @readonly
   *
   * @description
   * Optimistic-locking repository for project aggregates.
   */
  readonly projects: ProjectRepository;

  /**
   * Property buildRequests
   * @readonly
   *
   * @description
   * Outbox repository for rebuild requests written with project changes.
   */
  readonly buildRequests: SiteBuildRequestRepository;

  /**
   * Property media
   * @readonly
   *
   * @description
   * Media rows checked and relinked or unlinked with the project they belong to.
   */
  readonly media: MediaRepository;
  // #endregion
}

/**
 * Interface ContentUnitOfWork
 * @interface ContentUnitOfWork
 *
 * @description
 * Coordinates atomic project and outbox writes for content commands.
 */
export interface ContentUnitOfWork {
  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Result produced by the transaction callback.
   *
   * @description
   * Executes the callback in a transaction so all writes made through its repositories commit
   * together or roll back together.
   *
   * @param {(repositories: ContentRepositories) => Promise<T>} work - Transaction operation.
   * @returns {Promise<T>} Callback result after commit.
   */
  run<T>(work: (repositories: ContentRepositories) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface TimelineEntryRepository
 * @interface TimelineEntryRepository
 *
 * @description
 * Timeline entry reads and writes for the administration. Content writes are guarded by the entry's
 * version; positions are written apart from the content, so a move never conflicts with an edit.
 */
export interface TimelineEntryRepository {
  // #region Methods
  /**
   * Method listByKind
   * @method listByKind
   *
   * @description
   * Loads the entries of one kind ordered by position, then identifier.
   *
   * @param {TimelineKind} kind - Kind to list.
   * @returns {Promise<TimelineEntry[]>} Entries of the kind.
   */
  listByKind(kind: TimelineKind): Promise<TimelineEntry[]>;

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one entry by identifier.
   *
   * @param {string} id - Entry identifier.
   * @returns {Promise<TimelineEntry | null>} Entry, or `null` when absent.
   */
  get(id: string): Promise<TimelineEntry | null>;

  /**
   * Method insert
   * @method insert
   *
   * @description
   * Inserts a new entry with its version and position.
   *
   * @param {TimelineEntry} entry - Entry to insert.
   * @returns {Promise<void>} Completion after the insert.
   */
  insert(entry: TimelineEntry): Promise<void>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Writes the content of an entry (never its kind or position) and increments its version, only if
   * the stored version is still the expected one.
   *
   * @param {TimelineEntry} entry - Entry to save.
   * @param {number} expectedVersion - Version read before editing.
   * @throws {VersionMismatchError} When the stored version differs.
   * @returns {Promise<number>} New stored version.
   */
  save(entry: TimelineEntry, expectedVersion: number): Promise<number>;

  /**
   * Method delete
   * @method delete
   *
   * @description
   * Deletes an entry only if its stored version is still the expected one.
   *
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Version read before deleting.
   * @throws {VersionMismatchError} When no row has that identifier and version.
   * @returns {Promise<void>} Completion after the delete.
   */
  delete(id: string, expectedVersion: number): Promise<void>;

  /**
   * Method move
   * @method move
   *
   * @description
   * Writes the positions of the supplied entries, leaving their content and version untouched.
   *
   * @param {readonly TimelineEntry[]} entries - Entries whose position changed.
   * @returns {Promise<void>} Completion after the updates.
   */
  move(entries: readonly TimelineEntry[]): Promise<void>;
  // #endregion
}

/**
 * Interface TimelineListRepository
 * @interface TimelineListRepository
 *
 * @description
 * Version of each kind's list, the `If-Match` precondition of a reorder: creating, deleting and
 * reordering entries increment it, editing an entry's content does not.
 */
export interface TimelineListRepository {
  // #region Methods
  /**
   * Method version
   * @method version
   *
   * @description
   * Reads the current version of a kind's list (1 for a list never changed).
   *
   * @param {TimelineKind} kind - Kind of the list.
   * @returns {Promise<number>} List version.
   */
  version(kind: TimelineKind): Promise<number>;

  /**
   * Method bump
   * @method bump
   *
   * @description
   * Increments a kind's list version, and with `expectedVersion` only if it still matches. Inside a
   * unit of work the list row stays locked until commit, which serializes the creations, deletions and
   * moves of that kind (positions are computed after this call).
   *
   * @param {TimelineKind} kind - Kind of the list.
   * @param {number | null} expectedVersion - Version read by the client, or `null` for no check.
   * @throws {VersionMismatchError} When the stored version differs from `expectedVersion`.
   * @returns {Promise<number>} New list version.
   */
  bump(kind: TimelineKind, expectedVersion: number | null): Promise<number>;
  // #endregion
}

/**
 * Interface TimelineRepositories
 * @interface TimelineRepositories
 *
 * @description
 * Timeline, list version and rebuild-outbox repositories exposed inside one write transaction.
 */
export interface TimelineRepositories {
  // #region Properties
  /**
   * Property entries
   * @readonly
   *
   * @description
   * Timeline entries.
   */
  readonly entries: TimelineEntryRepository;

  /**
   * Property lists
   * @readonly
   *
   * @description
   * List versions per kind.
   */
  readonly lists: TimelineListRepository;

  /**
   * Property buildRequests
   * @readonly
   *
   * @description
   * Rebuild outbox written with every timeline change, since entries are always public (D3).
   */
  readonly buildRequests: SiteBuildRequestRepository;
  // #endregion
}

/**
 * Interface TimelineUnitOfWork
 * @interface TimelineUnitOfWork
 *
 * @description
 * Runs a timeline change and its rebuild request atomically.
 */
export interface TimelineUnitOfWork {
  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Result produced by the transaction callback.
   *
   * @description
   * Executes the callback in a transaction: every write made through its repositories commits or
   * rolls back together.
   *
   * @param {(repositories: TimelineRepositories) => Promise<T>} work - Transaction operation.
   * @returns {Promise<T>} Callback result after commit.
   */
  run<T>(work: (repositories: TimelineRepositories) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface ProfileRepository
 * @interface ProfileRepository
 *
 * @description
 * Singleton profile (« Informations ») reads and optimistic-locking writes for the administration.
 */
export interface ProfileRepository {
  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Loads the profile; the adapter rejects when the seed never ran.
   *
   * @returns {Promise<Profile>} Stored profile with its version.
   */
  load(): Promise<Profile>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Writes the texts, facts and links and increments the version, only if the stored version is still
   * the expected one.
   *
   * @param {Profile} profile - Revised profile.
   * @param {number} expectedVersion - Version read before editing.
   * @throws {VersionMismatchError} When the stored version differs.
   * @returns {Promise<number>} New stored version.
   */
  save(profile: Profile, expectedVersion: number): Promise<number>;
  // #endregion
}

/**
 * Interface LegalDocumentRepository
 * @interface LegalDocumentRepository
 *
 * @description
 * Legal notice and privacy policy reads and optimistic-locking writes for the administration.
 */
export interface LegalDocumentRepository {
  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one legal document.
   *
   * @param {LegalDocumentKind} kind - Document to load.
   * @returns {Promise<LegalDocument | null>} Document, or `null` when absent.
   */
  get(kind: LegalDocumentKind): Promise<LegalDocument | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Writes the body and the last save time and increments the version, only if the stored version is
   * still the expected one.
   *
   * @param {LegalDocument} document - Revised document.
   * @param {number} expectedVersion - Version read before editing.
   * @throws {VersionMismatchError} When no row has that kind and version.
   * @returns {Promise<number>} New stored version.
   */
  save(document: LegalDocument, expectedVersion: number): Promise<number>;
  // #endregion
}

/**
 * Interface SiteTextsRepositories
 * @interface SiteTextsRepositories
 *
 * @description
 * Profile, legal document and rebuild-outbox repositories exposed inside one write transaction.
 */
export interface SiteTextsRepositories {
  // #region Properties
  /**
   * Property profiles
   * @readonly
   *
   * @description
   * Singleton profile.
   */
  readonly profiles: ProfileRepository;

  /**
   * Property legalDocuments
   * @readonly
   *
   * @description
   * Legal notice and privacy policy.
   */
  readonly legalDocuments: LegalDocumentRepository;

  /**
   * Property buildRequests
   * @readonly
   *
   * @description
   * Rebuild outbox written with every change, since these texts are always public (D3).
   */
  readonly buildRequests: SiteBuildRequestRepository;
  // #endregion
}

/**
 * Interface SiteTextsUnitOfWork
 * @interface SiteTextsUnitOfWork
 *
 * @description
 * Runs a profile or legal document change and its rebuild request atomically.
 */
export interface SiteTextsUnitOfWork {
  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Result produced by the transaction callback.
   *
   * @description
   * Executes the callback in a transaction: every write made through its repositories commits or
   * rolls back together.
   *
   * @param {(repositories: SiteTextsRepositories) => Promise<T>} work - Transaction operation.
   * @returns {Promise<T>} Callback result after commit.
   */
  run<T>(work: (repositories: SiteTextsRepositories) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface SiteBuildDispatcher
 * @interface SiteBuildDispatcher
 *
 * @description
 * Port for triggering the static-site rebuild workflow.
 */
export interface SiteBuildDispatcher {
  // #region Methods
  /**
   * Method dispatch
   * @method dispatch
   *
   * @description
   * Starts a rebuild containing the requested content revision; transport failures reject the
   * returned promise for the outbox worker to schedule a retry.
   *
   * @param {number} revision - Published-content revision to build.
   * @returns {Promise<void>} Completion when the workflow trigger is accepted.
   */
  dispatch(revision: number): Promise<void>;
  // #endregion
}

/**
 * Interface Clock
 * @interface Clock
 *
 * @description
 * Supplies current time to use cases so scheduling behavior can be controlled in tests.
 */
export interface Clock {
  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Returns the current time from the configured source.
   *
   * @returns {Date} Current timestamp.
   */
  now(): Date;
  // #endregion
}

/**
 * Interface IdGenerator
 * @interface IdGenerator
 *
 * @description
 * Supplies identifiers without binding application use cases to a generation library.
 */
export interface IdGenerator {
  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Generates a fresh random UUID; media file names derive from it, so it must not be guessable.
   *
   * @returns {string} Generated identifier.
   */
  next(): string;
  // #endregion
}

/**
 * Interface MediaRecord
 * @interface MediaRecord
 *
 * @description
 * Stored row of an uploaded image (D40); its files are `<id>.webp` and, with `hasSmall`,
 * `<id>-960.webp`.
 */
export interface MediaRecord {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Random UUID naming the files.
   */
  readonly id: string;

  /**
   * Property width
   * @readonly
   *
   * @description
   * Width in pixels of the full WebP, after orientation.
   */
  readonly width: number;

  /**
   * Property height
   * @readonly
   *
   * @description
   * Height in pixels of the full WebP, after orientation.
   */
  readonly height: number;

  /**
   * Property bytes
   * @readonly
   *
   * @description
   * Size in bytes of the full WebP.
   */
  readonly bytes: number;

  /**
   * Property sha256
   * @readonly
   *
   * @description
   * Hexadecimal SHA-256 of the uploaded bytes; unique, so the same upload twice yields one media.
   */
  readonly sha256: string;

  /**
   * Property hasSmall
   * @readonly
   *
   * @description
   * Whether the 960 px rendition exists (only for images wider than 960 px).
   */
  readonly hasSmall: boolean;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Upload time.
   */
  readonly createdAt: Date;

  /**
   * Property unlinkedAt
   * @readonly
   *
   * @description
   * Time the media stopped being referenced, or its upload time until a project saves a reference to
   * it; `null` while referenced. The purge counts its grace period from this time.
   */
  readonly unlinkedAt: Date | null;
  // #endregion
}

/**
 * Interface MediaRepository
 * @interface MediaRepository
 *
 * @description
 * Persists media rows. References live in the project documents rather than in a join table, so the
 * reference checks of `stale` and `delete` read the project JSON columns.
 */
export interface MediaRepository {
  // #region Methods
  /**
   * Method insert
   * @method insert
   *
   * @description
   * Inserts a media row; rejects when its id or SHA-256 already exists.
   *
   * @param {MediaRecord} record - Row to insert.
   * @returns {Promise<void>} Completion after the insert.
   */
  insert(record: MediaRecord): Promise<void>;

  /**
   * Method findBySha256
   * @method findBySha256
   *
   * @description
   * Finds the media uploaded with the same bytes.
   *
   * @param {string} sha256 - Hexadecimal SHA-256 of the uploaded bytes.
   * @returns {Promise<MediaRecord | null>} Existing media, or `null`.
   */
  findBySha256(sha256: string): Promise<MediaRecord | null>;

  /**
   * Method existing
   * @method existing
   *
   * @description
   * Loads the stored media among the supplied identifiers. Inside a unit of work the rows found stay
   * locked against deletion (`FOR SHARE`) until it commits, so a concurrent purge cannot remove a
   * media a revision is about to reference.
   *
   * @param {readonly string[]} ids - Media identifiers to look up.
   * @returns {Promise<MediaRecord[]>} Media found, in no particular order.
   */
  existing(ids: readonly string[]): Promise<MediaRecord[]>;

  /**
   * Method markUnlinked
   * @method markUnlinked
   *
   * @description
   * Starts the purge grace period of media a project no longer references.
   *
   * @param {readonly string[]} ids - Media removed from a project.
   * @param {Date} at - Time the reference was removed.
   * @returns {Promise<void>} Completion after the update.
   */
  markUnlinked(ids: readonly string[], at: Date): Promise<void>;

  /**
   * Method relink
   * @method relink
   *
   * @description
   * Clears the grace period of media a project references again.
   *
   * @param {readonly string[]} ids - Media added to a project.
   * @returns {Promise<void>} Completion after the update.
   */
  relink(ids: readonly string[]): Promise<void>;

  /**
   * Method stale
   * @method stale
   *
   * @description
   * Lists the media unlinked before the supplied time that no project references any more.
   *
   * @param {Date} before - End of the grace period.
   * @returns {Promise<MediaRecord[]>} Purge candidates.
   */
  stale(before: Date): Promise<MediaRecord[]>;

  /**
   * Method delete
   * @method delete
   *
   * @description
   * Deletes a media row only if it is still stale (unlinked before `before` and unreferenced), so a
   * revision committed since `stale` keeps it.
   *
   * @param {string} id - Media to delete.
   * @param {Date} before - End of the grace period.
   * @returns {Promise<boolean>} Whether the row was deleted.
   */
  delete(id: string, before: Date): Promise<boolean>;
  // #endregion
}

/**
 * Interface ProcessedImage
 * @interface ProcessedImage
 *
 * @description
 * Image re-encoded to WebP without metadata, at most 2400 px wide, with its 960 px rendition.
 */
export interface ProcessedImage {
  // #region Properties
  /**
   * Property full
   * @readonly
   *
   * @description
   * Full-size WebP bytes.
   */
  readonly full: Uint8Array;

  /**
   * Property small
   * @readonly
   *
   * @description
   * 960 px wide WebP bytes, or `null` when the full image is not wider than 960 px.
   */
  readonly small: Uint8Array | null;

  /**
   * Property width
   * @readonly
   *
   * @description
   * Width in pixels of the full WebP.
   */
  readonly width: number;

  /**
   * Property height
   * @readonly
   *
   * @description
   * Height in pixels of the full WebP.
   */
  readonly height: number;
  // #endregion
}

/**
 * Interface ImageProcessor
 * @interface ImageProcessor
 *
 * @description
 * Decodes an uploaded image and re-encodes it (D40): uploaded bytes never reach the disk as sent.
 */
export interface ImageProcessor {
  // #region Methods
  /**
   * Method process
   * @method process
   *
   * @description
   * Re-encodes JPEG, PNG, WebP, AVIF or GIF bytes (first frame only), applying the EXIF orientation.
   *
   * @param {Uint8Array} bytes - Uploaded bytes.
   * @throws {UnsupportedMediaError} When the bytes are not an accepted image or exceed the pixel limit.
   * @returns {Promise<ProcessedImage>} Re-encoded image.
   */
  process(bytes: Uint8Array): Promise<ProcessedImage>;
  // #endregion
}

/**
 * Interface MediaFiles
 * @interface MediaFiles
 *
 * @description
 * WebP files of one media.
 */
export interface MediaFiles {
  // #region Properties
  /**
   * Property full
   * @readonly
   *
   * @description
   * Full-size WebP, stored as `<id>.webp`.
   */
  readonly full: Uint8Array;

  /**
   * Property small
   * @readonly
   *
   * @description
   * 960 px rendition stored as `<id>-960.webp`, or `null`.
   */
  readonly small: Uint8Array | null;
  // #endregion
}

/**
 * Interface MediaStorage
 * @interface MediaStorage
 *
 * @description
 * Stores the files of a media under names derived from its id.
 */
export interface MediaStorage {
  // #region Methods
  /**
   * Method put
   * @method put
   *
   * @description
   * Writes the files of a media; each one appears complete or not at all (temporary file, then
   * rename), and a failure removes what was written before rejecting.
   *
   * @param {string} id - Media identifier.
   * @param {MediaFiles} files - WebP bytes to write.
   * @returns {Promise<void>} Completion once every file is in place.
   */
  put(id: string, files: MediaFiles): Promise<void>;

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes the files of a media; absent files are ignored.
   *
   * @param {string} id - Media identifier.
   * @returns {Promise<void>} Completion after removal.
   */
  remove(id: string): Promise<void>;
  // #endregion
}
