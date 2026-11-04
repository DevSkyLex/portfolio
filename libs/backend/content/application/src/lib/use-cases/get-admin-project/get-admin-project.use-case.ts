import type { Project } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type {
  MediaRecord,
  MediaRepository,
  ProjectRepository,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface AdminProjectView
 * @interface AdminProjectView
 *
 * @description
 * Project read by the administrator with the stored media its cover and figures reference.
 */
export interface AdminProjectView {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Project aggregate.
   */
  readonly project: Project;

  /**
   * Property media
   * @readonly
   *
   * @description
   * Stored media referenced by the project, in no particular order.
   */
  readonly media: readonly MediaRecord[];
  // #endregion
}

/**
 * Class GetAdminProject
 * @class GetAdminProject
 *
 * @description
 * Loads one project aggregate and its media for administration and reports absence as an
 * application error.
 */
export class GetAdminProject {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the repositories used to locate project aggregates and their media.
   *
   * @param {ProjectRepository} projects - Project read and write port.
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
   * Returns the requested project or rejects with `NotFoundError` when no project has that id.
   *
   * @param {string} id - Project identifier.
   * @returns {Promise<AdminProjectView>} Requested project and its media.
   */
  public async execute(id: string): Promise<AdminProjectView> {
    const project: Project | null = await this.projects.get(id);
    if (project === null) {
      throw new NotFoundError('Project');
    }
    return { project, media: await this.media.existing(project.mediaIds()) };
  }
  // #endregion
}
