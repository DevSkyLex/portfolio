import { Project, type ProjectRevision, Slug } from '@vfortin/content-domain';
import { MediaNotFoundError } from '@internal/content-application/lib/errors/application-error';
import type {
  ContentRepositories,
  ContentUnitOfWork,
  IdGenerator,
  MediaRecord,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { ProjectChangeResult } from '@internal/content-application/lib/use-cases/change-project/change-project';

/**
 * Class CreateProject
 * @class CreateProject
 *
 * @description
 * Adds a draft project after the last one. Its slug derives from the French title and stays fixed
 * afterwards (the public URL); a draft is not on the public site, so no rebuild is requested.
 */
export class CreateProject {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the transaction boundary and the identifier source.
   *
   * @param {ContentUnitOfWork} unitOfWork - Atomic project and media writes.
   * @param {IdGenerator} ids - Identifier of the new project.
   */
  public constructor(
    private readonly unitOfWork: ContentUnitOfWork,
    private readonly ids: IdGenerator,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Picks the first free slug from the French title and the position after the last project, fails
   * with `MediaNotFoundError` when the revision references an unknown media, inserts the draft and
   * takes its media out of the purge grace period (D40).
   *
   * @param {ProjectRevision} revision - Content of the new project.
   * @returns {Promise<ProjectChangeResult>} Created draft, version 1, no revision and its media.
   */
  public execute(revision: ProjectRevision): Promise<ProjectChangeResult> {
    return this.unitOfWork.run(
      async ({ projects, media }: ContentRepositories): Promise<ProjectChangeResult> => {
        const existing: Project[] = await projects.list();
        const slug: Slug = Slug.fromTitle(
          revision.title.toProps().fr,
          new Set(existing.map((project: Project): string => project.slug.value)),
        );
        const position: number =
          existing.reduce(
            (last: number, project: Project): number => Math.max(last, project.position),
            -1,
          ) + 1;
        const project: Project = Project.create({ id: this.ids.next(), slug, position }, revision);
        const mediaIds: string[] = project.mediaIds();
        const found: MediaRecord[] = await media.existing(mediaIds);
        const known: Set<string> = new Set(found.map((record: MediaRecord): string => record.id));
        const unknown: string[] = mediaIds.filter((id: string): boolean => !known.has(id));
        if (unknown.length > 0) {
          throw new MediaNotFoundError(unknown);
        }
        await projects.insert(project);
        if (mediaIds.length > 0) {
          await media.relink(mediaIds);
        }
        return {
          project,
          version: project.version,
          revision: null,
          media: await media.existing(mediaIds),
        };
      },
    );
  }
  // #endregion
}
