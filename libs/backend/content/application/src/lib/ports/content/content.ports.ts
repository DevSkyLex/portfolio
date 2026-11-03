import type { Profile, Project, SkillGroup, TimelineEntry } from '@vfortin/content-domain';

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
