import {
  ArticleDocument,
  type ArticleBlock,
  LegalDocument,
  type LegalDocumentKind,
  type LegalDocumentProps,
  type Profile,
  TimelineEntry,
  type TimelineEntryProps,
  type SeoRange,
  type TimelineKind,
} from '@vfortin/content-domain';
import {
  UnsupportedMediaError,
  VersionMismatchError,
} from '@internal/content-application/lib/errors/application-error';
import type {
  Clock,
  IdGenerator,
  ImageProcessor,
  LegalDocumentRepository,
  MediaFiles,
  MediaRecord,
  MediaRepository,
  MediaStorage,
  ProcessedImage,
  ProfileRepository,
  SiteBuildRequestRepository,
  SiteTextsRepositories,
  SiteTextsUnitOfWork,
  TimelineEntryRepository,
  TimelineListRepository,
  TimelineRepositories,
  TimelineUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import type {
  AnalyticsData,
  CachedSeoReport,
  SearchConsoleData,
  SeoDashboardCache,
  SeoRefreshState,
  SeoReport,
  SeoReportStore,
  SeoSource,
  SeoSourceFailure,
  WebVitalsReport,
} from '@internal/content-application/lib/ports/seo-dashboard/seo-dashboard.ports';

/**
 * Function articleDoc
 *
 * @description
 * Builds a document holding one paragraph followed by figures of the supplied media.
 *
 * @param {string} paragraph - Paragraph text.
 * @param {readonly string[]} figures - Media shown by figures with an alternative text.
 * @returns {ArticleDocument} Document value.
 */
export function articleDoc(paragraph: string, figures: readonly string[] = []): ArticleDocument {
  return ArticleDocument.of('article', {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: paragraph }] },
      ...figures.map((media: string): ArticleBlock => ({
        type: 'figure',
        attrs: { media, alt: 'Capture', caption: '' },
      })),
    ],
  });
}

/**
 * Function mediaRecord
 *
 * @description
 * Builds a stored media row with test defaults.
 *
 * @param {string} id - Media identifier.
 * @param {Partial<MediaRecord>} overrides - Fields replacing the defaults.
 * @returns {MediaRecord} Media row.
 */
export function mediaRecord(id: string, overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id,
    width: 1200,
    height: 800,
    bytes: 1000,
    sha256: `sha-${id}`,
    hasSmall: true,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    unlinkedAt: null,
    ...overrides,
  };
}

/**
 * Class FixedClock
 * @class FixedClock
 *
 * @description
 * Clock returning a settable instant.
 */
export class FixedClock implements Clock {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts at the supplied instant.
   *
   * @param {Date} current - Instant returned by `now`.
   */
  public constructor(public current: Date = new Date('2026-11-02T10:00:00Z')) {}
  // #endregion

  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Returns the current test instant.
   *
   * @returns {Date} Test instant.
   */
  public now(): Date {
    return this.current;
  }
  // #endregion
}

/**
 * Class SequenceIds
 * @class SequenceIds
 *
 * @description
 * Identifier source returning predictable UUIDs.
 */
export class SequenceIds implements IdGenerator {
  // #region Properties
  /**
   * Property count
   *
   * @description
   * Number of identifiers generated so far.
   */
  private count: number = 0;
  // #endregion

  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Returns `00000000-0000-4000-8000-00000000000n`.
   *
   * @returns {string} Next identifier.
   */
  public next(): string {
    this.count++;
    return `00000000-0000-4000-8000-${String(this.count).padStart(12, '0')}`;
  }
  // #endregion
}

/**
 * Class InMemoryMediaRepository
 * @class InMemoryMediaRepository
 *
 * @description
 * Media rows in a map; references are answered by the supplied predicate, standing for the JSON
 * queries over the projects.
 */
export class InMemoryMediaRepository implements MediaRepository {
  // #region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Stored rows by identifier.
   */
  public readonly rows: Map<string, MediaRecord> = new Map();

  /**
   * Property failInsert
   *
   * @description
   * Error thrown by the next insert, to exercise the cleanup of an upload.
   */
  public failInsert: Error | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the initial rows and the reference predicate.
   *
   * @param {readonly MediaRecord[]} initial - Initial rows.
   * @param {(id: string) => boolean} referenced - Whether a project references a media.
   */
  public constructor(
    initial: readonly MediaRecord[] = [],
    public referenced: (id: string) => boolean = (): boolean => false,
  ) {
    for (const record of initial) this.rows.set(record.id, record);
  }
  // #endregion

  // #region Methods
  /** Inserts a row, rejecting a duplicate SHA-256 or the configured failure. */
  public async insert(record: MediaRecord): Promise<void> {
    if (this.failInsert !== null) throw this.failInsert;
    if ([...this.rows.values()].some((r: MediaRecord): boolean => r.sha256 === record.sha256)) {
      throw new Error('duplicate sha256');
    }
    this.rows.set(record.id, record);
  }

  /** Finds a row by SHA-256. */
  public async findBySha256(sha256: string): Promise<MediaRecord | null> {
    return [...this.rows.values()].find((r: MediaRecord): boolean => r.sha256 === sha256) ?? null;
  }

  /** Returns the stored rows among the identifiers. */
  public async existing(ids: readonly string[]): Promise<MediaRecord[]> {
    return ids.flatMap((id: string): MediaRecord[] => {
      const row: MediaRecord | undefined = this.rows.get(id);
      return row === undefined ? [] : [row];
    });
  }

  /** Sets `unlinkedAt` on the rows. */
  public async markUnlinked(ids: readonly string[], at: Date): Promise<void> {
    this.update(ids, { unlinkedAt: at });
  }

  /** Clears `unlinkedAt` on the rows. */
  public async relink(ids: readonly string[]): Promise<void> {
    this.update(ids, { unlinkedAt: null });
  }

  /** Lists the rows unlinked before the instant and unreferenced. */
  public async stale(before: Date): Promise<MediaRecord[]> {
    return [...this.rows.values()].filter((r: MediaRecord): boolean => this.isStale(r, before));
  }

  /** Deletes a row that is still stale. */
  public async delete(id: string, before: Date): Promise<boolean> {
    const row: MediaRecord | undefined = this.rows.get(id);
    return row !== undefined && this.isStale(row, before) && this.rows.delete(id);
  }

  /** Applies a change to the existing rows among the identifiers. */
  private update(ids: readonly string[], change: Partial<MediaRecord>): void {
    for (const id of ids) {
      const row: MediaRecord | undefined = this.rows.get(id);
      if (row !== undefined) this.rows.set(id, { ...row, ...change });
    }
  }

  /** Whether a row is unlinked before the instant and unreferenced. */
  private isStale(row: MediaRecord, before: Date): boolean {
    return row.unlinkedAt !== null && row.unlinkedAt < before && !this.referenced(row.id);
  }
  // #endregion
}

/**
 * Class InMemoryMediaStorage
 * @class InMemoryMediaStorage
 *
 * @description
 * Media files in a map, recording the order of the operations.
 */
export class InMemoryMediaStorage implements MediaStorage {
  // #region Properties
  /**
   * Property files
   * @readonly
   *
   * @description
   * Stored files by media identifier.
   */
  public readonly files: Map<string, MediaFiles> = new Map();

  /**
   * Property log
   * @readonly
   *
   * @description
   * Operations performed, as `put:<id>` and `remove:<id>`.
   */
  public readonly log: string[] = [];
  // #endregion

  // #region Methods
  /** Stores the files of a media. */
  public async put(id: string, files: MediaFiles): Promise<void> {
    this.log.push(`put:${id}`);
    this.files.set(id, files);
  }

  /** Removes the files of a media. */
  public async remove(id: string): Promise<void> {
    this.log.push(`remove:${id}`);
    this.files.delete(id);
  }
  // #endregion
}

/**
 * Class FakeImageProcessor
 * @class FakeImageProcessor
 *
 * @description
 * Processor accepting bytes that start with `IMG`, wide when the fourth byte is `W`, and recording
 * how many calls overlapped.
 */
export class FakeImageProcessor implements ImageProcessor {
  // #region Properties
  /**
   * Property calls
   *
   * @description
   * Number of `process` calls.
   */
  public calls: number = 0;

  /**
   * Property active
   *
   * @description
   * Calls currently running.
   */
  private active: number = 0;

  /**
   * Property maxActive
   *
   * @description
   * Highest number of overlapping calls observed.
   */
  public maxActive: number = 0;
  // #endregion

  // #region Methods
  /**
   * Method process
   * @method process
   *
   * @description
   * Yields once to let overlapping calls show, then returns fixed WebP bytes.
   *
   * @param {Uint8Array} bytes - Uploaded bytes.
   * @returns {Promise<ProcessedImage>} Processed image.
   */
  public async process(bytes: Uint8Array): Promise<ProcessedImage> {
    this.calls++;
    this.active++;
    this.maxActive = Math.max(this.maxActive, this.active);
    try {
      await new Promise((resolve: (value: unknown) => void): unknown => setTimeout(resolve, 1));
      if (new TextDecoder().decode(bytes.subarray(0, 3)) !== 'IMG') {
        throw new UnsupportedMediaError();
      }
      const wide: boolean = bytes[3] === 'W'.charCodeAt(0);
      return {
        full: new Uint8Array([1, 2, 3]),
        small: wide ? new Uint8Array([1]) : null,
        width: wide ? 2400 : 800,
        height: 600,
      };
    } finally {
      this.active--;
    }
  }
  // #endregion
}

/**
 * Class InMemoryTimeline
 * @class InMemoryTimeline
 *
 * @description
 * Timeline entries, list versions and rebuild requests kept in memory, with a unit of work that
 * restores them when its callback throws, as the database transaction would.
 */
export class InMemoryTimeline implements TimelineUnitOfWork {
  // #region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Stored entry state by identifier.
   */
  public readonly rows: Map<string, TimelineEntryProps> = new Map();

  /**
   * Property listVersions
   * @readonly
   *
   * @description
   * Stored list version per kind.
   */
  public readonly listVersions: Map<TimelineKind, number> = new Map<TimelineKind, number>([
    ['education', 1],
    ['experience', 1],
  ]);

  /**
   * Property requests
   * @readonly
   *
   * @description
   * Rebuild revisions requested, in order.
   */
  public readonly requests: number[] = [];

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Entry repository over `rows`.
   */
  public readonly entries: TimelineEntryRepository = {
    listByKind: async (kind: TimelineKind): Promise<TimelineEntry[]> =>
      [...this.rows.values()]
        .filter((row: TimelineEntryProps): boolean => row.kind === kind)
        .sort(
          (a: TimelineEntryProps, b: TimelineEntryProps): number =>
            a.position - b.position || a.id.localeCompare(b.id),
        )
        .map((row: TimelineEntryProps): TimelineEntry => TimelineEntry.rehydrate(row)),
    get: async (id: string): Promise<TimelineEntry | null> => {
      const row: TimelineEntryProps | undefined = this.rows.get(id);
      return row === undefined ? null : TimelineEntry.rehydrate(row);
    },
    insert: async (entry: TimelineEntry): Promise<void> => {
      if (this.rows.has(entry.id)) throw new Error('duplicate id');
      this.rows.set(entry.id, entry.snapshot());
    },
    save: async (entry: TimelineEntry, expectedVersion: number): Promise<number> => {
      const row: TimelineEntryProps | undefined = this.rows.get(entry.id);
      if (row === undefined || row.version !== expectedVersion) throw new VersionMismatchError();
      const { title, place, description, period, techs } = entry.snapshot();
      this.rows.set(entry.id, {
        ...row,
        title,
        place,
        description,
        period,
        techs,
        version: expectedVersion + 1,
      });
      return expectedVersion + 1;
    },
    delete: async (id: string, expectedVersion: number): Promise<void> => {
      if (this.rows.get(id)?.version !== expectedVersion) throw new VersionMismatchError();
      this.rows.delete(id);
    },
    move: async (moved: readonly TimelineEntry[]): Promise<void> => {
      for (const entry of moved) {
        const row: TimelineEntryProps | undefined = this.rows.get(entry.id);
        if (row !== undefined) this.rows.set(entry.id, { ...row, position: entry.position });
      }
    },
  };

  /**
   * Property lists
   * @readonly
   *
   * @description
   * List version repository over `listVersions`.
   */
  public readonly lists: TimelineListRepository = {
    version: async (kind: TimelineKind): Promise<number> => this.listVersions.get(kind) ?? 1,
    bump: async (kind: TimelineKind, expectedVersion: number | null): Promise<number> => {
      const current: number = this.listVersions.get(kind) ?? 1;
      if (expectedVersion !== null && current !== expectedVersion) {
        throw new VersionMismatchError();
      }
      this.listVersions.set(kind, current + 1);
      return current + 1;
    },
  };

  /**
   * Property buildRequests
   * @readonly
   *
   * @description
   * Outbox recording requested revisions; claims are not used by the timeline.
   */
  public readonly buildRequests: SiteBuildRequestRepository = {
    request: async (): Promise<number> => {
      const revision: number = (this.requests.at(-1) ?? 1) + 1;
      this.requests.push(revision);
      return revision;
    },
    claimLatest: async (): Promise<null> => null,
    markDispatched: async (): Promise<void> => undefined,
    markFailed: async (): Promise<void> => undefined,
  };
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the initial entries.
   *
   * @param {readonly TimelineEntry[]} initial - Entries present before the test.
   */
  public constructor(initial: readonly TimelineEntry[] = []) {
    for (const entry of initial) this.rows.set(entry.id, entry.snapshot());
  }
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Callback result.
   *
   * @description
   * Runs the callback and restores every map if it throws.
   *
   * @param {(repositories: TimelineRepositories) => Promise<T>} work - Transaction operation.
   * @returns {Promise<T>} Callback result.
   */
  public async run<T>(work: (repositories: TimelineRepositories) => Promise<T>): Promise<T> {
    const rows: Map<string, TimelineEntryProps> = new Map(this.rows);
    const versions: Map<TimelineKind, number> = new Map(this.listVersions);
    const requests: number = this.requests.length;
    try {
      return await work({
        entries: this.entries,
        lists: this.lists,
        buildRequests: this.buildRequests,
      });
    } catch (error) {
      this.rows.clear();
      for (const [id, row] of rows) this.rows.set(id, row);
      for (const [kind, version] of versions) this.listVersions.set(kind, version);
      this.requests.length = requests;
      throw error;
    }
  }
  // #endregion
}

/**
 * Class InMemorySiteTexts
 * @class InMemorySiteTexts
 *
 * @description
 * Profile, legal documents and rebuild requests kept in memory, with a unit of work that restores
 * them when its callback throws, as the database transaction would.
 */
export class InMemorySiteTexts implements SiteTextsUnitOfWork {
  // #region Properties
  /**
   * Property profile
   *
   * @description
   * Stored profile, `null` before the seed.
   */
  public profile: Profile | null;

  /**
   * Property documents
   * @readonly
   *
   * @description
   * Stored legal document state by kind.
   */
  public readonly documents: Map<LegalDocumentKind, LegalDocumentProps> = new Map();

  /**
   * Property requests
   * @readonly
   *
   * @description
   * Rebuild revisions requested, in order.
   */
  public readonly requests: number[] = [];

  /**
   * Property profiles
   * @readonly
   *
   * @description
   * Profile repository over `profile`.
   */
  public readonly profiles: ProfileRepository = {
    load: async (): Promise<Profile> => {
      if (this.profile === null) throw new Error('no profile');
      return this.profile;
    },
    save: async (profile: Profile, expectedVersion: number): Promise<number> => {
      if (this.profile?.version !== expectedVersion) throw new VersionMismatchError();
      this.profile = { ...profile, version: expectedVersion + 1 };
      return expectedVersion + 1;
    },
  };

  /**
   * Property legalDocuments
   * @readonly
   *
   * @description
   * Legal document repository over `documents`.
   */
  public readonly legalDocuments: LegalDocumentRepository = {
    get: async (kind: LegalDocumentKind): Promise<LegalDocument | null> => {
      const row: LegalDocumentProps | undefined = this.documents.get(kind);
      return row === undefined ? null : LegalDocument.rehydrate(row);
    },
    save: async (document: LegalDocument, expectedVersion: number): Promise<number> => {
      const row: LegalDocumentProps | undefined = this.documents.get(document.kind);
      if (row?.version !== expectedVersion) throw new VersionMismatchError();
      this.documents.set(document.kind, { ...document.snapshot(), version: expectedVersion + 1 });
      return expectedVersion + 1;
    },
  };

  /**
   * Property buildRequests
   * @readonly
   *
   * @description
   * Outbox recording requested revisions.
   */
  public readonly buildRequests: SiteBuildRequestRepository = {
    request: async (): Promise<number> => {
      const revision: number = (this.requests.at(-1) ?? 1) + 1;
      this.requests.push(revision);
      return revision;
    },
    claimLatest: async (): Promise<null> => null,
    markDispatched: async (): Promise<void> => undefined,
    markFailed: async (): Promise<void> => undefined,
  };
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the initial profile and documents.
   *
   * @param {Profile | null} profile - Profile present before the test.
   * @param {readonly LegalDocument[]} documents - Documents present before the test.
   */
  public constructor(profile: Profile | null = null, documents: readonly LegalDocument[] = []) {
    this.profile = profile;
    for (const document of documents) this.documents.set(document.kind, document.snapshot());
  }
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Callback result.
   *
   * @description
   * Runs the callback and restores the state if it throws.
   *
   * @param {(repositories: SiteTextsRepositories) => Promise<T>} work - Transaction operation.
   * @returns {Promise<T>} Callback result.
   */
  public async run<T>(work: (repositories: SiteTextsRepositories) => Promise<T>): Promise<T> {
    const profile: Profile | null = this.profile;
    const documents: Map<LegalDocumentKind, LegalDocumentProps> = new Map(this.documents);
    const requests: number = this.requests.length;
    try {
      return await work({
        profiles: this.profiles,
        legalDocuments: this.legalDocuments,
        buildRequests: this.buildRequests,
      });
    } catch (error) {
      this.profile = profile;
      this.documents.clear();
      for (const [kind, row] of documents) this.documents.set(kind, row);
      this.requests.length = requests;
      throw error;
    }
  }
  // #endregion
}

/**
 * Class InMemorySeoReportStore
 * @class InMemorySeoReportStore
 *
 * @description
 * SEO report cache in a map keyed by source and range, with the refresh claim of the Drizzle store.
 */
export class InMemorySeoReportStore implements SeoReportStore {
  // #region Properties
  /**
   * Property entries
   * @readonly
   *
   * @description
   * Entries keyed `<source>:<range>` (`web-vitals:all` for the Web Vitals).
   */
  public readonly entries: Map<string, CachedSeoReport<unknown>> = new Map<
    string,
    CachedSeoReport<unknown>
  >();

  /**
   * Property state
   *
   * @description
   * Refresh state.
   */
  public state: SeoRefreshState = { startedAt: null, finishedAt: null };
  // #endregion

  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Reads the entries of one range.
   *
   * @param {SeoRange} range - Range.
   * @returns {Promise<SeoDashboardCache>} Entries.
   */
  public async load(range: SeoRange): Promise<SeoDashboardCache> {
    return {
      searchConsole: (this.entries.get(`search-console:${range}`) ??
        null) as CachedSeoReport<SearchConsoleData> | null,
      analytics: (this.entries.get(`analytics:${range}`) ??
        null) as CachedSeoReport<AnalyticsData> | null,
      webVitals: (this.entries.get('web-vitals:all') ??
        null) as CachedSeoReport<WebVitalsReport> | null,
      refresh: this.state,
    };
  }

  /**
   * Method saveReport
   * @method saveReport
   *
   * @description
   * Replaces an entry with a fetched report.
   *
   * @param {SeoReport} report - Report.
   * @param {Date} at - Fetch time.
   * @returns {Promise<void>} Completion.
   */
  public async saveReport(report: SeoReport, at: Date): Promise<void> {
    this.entries.set(`${report.source}:${report.range ?? 'all'}`, {
      data: report.data,
      fetchedAt: at,
      failure: null,
      attemptedAt: at,
    });
  }

  /**
   * Method saveFailure
   * @method saveFailure
   *
   * @description
   * Records a failure, keeping the previous report.
   *
   * @param {SeoSource} source - Source.
   * @param {SeoRange | null} range - Range.
   * @param {SeoSourceFailure} failure - Failure.
   * @param {Date} at - Attempt time.
   * @returns {Promise<void>} Completion.
   */
  public async saveFailure(
    source: SeoSource,
    range: SeoRange | null,
    failure: SeoSourceFailure,
    at: Date,
  ): Promise<void> {
    const key: string = `${source}:${range ?? 'all'}`;
    const previous: CachedSeoReport<unknown> | undefined = this.entries.get(key);
    this.entries.set(key, {
      data: previous?.data ?? null,
      fetchedAt: previous?.fetchedAt ?? null,
      failure,
      attemptedAt: at,
    });
  }

  /**
   * Method claimRefresh
   * @method claimRefresh
   *
   * @description
   * Starts a refresh unless one started after `notBefore`.
   *
   * @param {Date} now - Start time.
   * @param {Date} notBefore - Latest allowed previous start.
   * @returns {Promise<boolean>} Whether the refresh was claimed.
   */
  public async claimRefresh(now: Date, notBefore: Date): Promise<boolean> {
    if (this.state.startedAt !== null && this.state.startedAt > notBefore) return false;
    this.state = { ...this.state, startedAt: now };
    return true;
  }

  /**
   * Method finishRefresh
   * @method finishRefresh
   *
   * @description
   * Records the end of the refresh.
   *
   * @param {Date} at - End time.
   * @returns {Promise<void>} Completion.
   */
  public async finishRefresh(at: Date): Promise<void> {
    this.state = { ...this.state, finishedAt: at };
  }

  /**
   * Method refreshState
   * @method refreshState
   *
   * @description
   * Reads the refresh state.
   *
   * @returns {Promise<SeoRefreshState>} State.
   */
  public async refreshState(): Promise<SeoRefreshState> {
    return this.state;
  }
  // #endregion
}
