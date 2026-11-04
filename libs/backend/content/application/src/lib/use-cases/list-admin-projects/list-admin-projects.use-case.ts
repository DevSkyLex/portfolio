import type { Project } from '@vfortin/content-domain';
import type {
  MediaRecord,
  MediaRepository,
  ProjectRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { AdminProjectView } from '@internal/content-application/lib/use-cases/get-admin-project/get-admin-project.use-case';

/**
 * Class ListAdminProjects
 * @class ListAdminProjects
 *
 * @description
 * Lists all administration projects, including drafts, in display order with their media.
 */
export class ListAdminProjects {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the repositories that read project aggregates and media rows.
   *
   * @param {ProjectRepository} projects - Project repository.
   * @param {MediaRepository} media - Media rows.
   */
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly media: MediaRepository,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns every stored project sorted by its position; the media of all projects are read at once.
   *
   * @returns {Promise<AdminProjectView[]>} Administration project list.
   */
  public async execute(): Promise<AdminProjectView[]> {
    const projects: Project[] = (await this.projects.list()).sort(
      (a: Project, b: Project): number => a.position - b.position,
    );
    const records: Map<string, MediaRecord> = new Map(
      (
        await this.media.existing([
          ...new Set(projects.flatMap((project: Project): string[] => project.mediaIds())),
        ])
      ).map((record: MediaRecord): [string, MediaRecord] => [record.id, record]),
    );
    return projects.map((project: Project): AdminProjectView => ({
      project,
      media: project.mediaIds().flatMap((id: string): MediaRecord[] => {
        const record: MediaRecord | undefined = records.get(id);
        return record === undefined ? [] : [record];
      }),
    }));
  }
  // #endregion
}
