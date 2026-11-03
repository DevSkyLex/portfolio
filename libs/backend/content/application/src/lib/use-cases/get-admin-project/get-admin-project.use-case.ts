import type { Project } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type { ProjectRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Class GetAdminProject
 * @class GetAdminProject
 *
 * @description
 * Loads one project aggregate for administration and reports absence as an application error.
 */
export class GetAdminProject {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Injects the repository used to locate project aggregates.
   *
   * @param {ProjectRepository} projects - Project read and write port.
   */
  public constructor(private readonly projects: ProjectRepository) {}
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
   * @returns {Promise<Project>} Requested project aggregate.
   */
  public async execute(id: string): Promise<Project> {
    const project: Project | null = await this.projects.get(id);
    if (project === null) {
      throw new NotFoundError('Project');
    }
    return project;
  }
  // #endregion
}
