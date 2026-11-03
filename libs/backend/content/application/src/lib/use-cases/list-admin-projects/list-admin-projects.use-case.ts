import type { Project } from '@vfortin/content-domain';
import type { ProjectRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Class ListAdminProjects
 * @class ListAdminProjects
 *
 * @description
 * Lists all administration projects, including drafts, in display order.
 */
export class ListAdminProjects {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the repository that reads project aggregates.
   *
   * @param {ProjectRepository} projects - Project repository.
   */
  public constructor(private readonly projects: ProjectRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns every stored project sorted by its position.
   *
   * @returns {Promise<Project[]>} Administration project list.
   */
  public async execute(): Promise<Project[]> {
    return (await this.projects.list()).sort(
      (a: Project, b: Project): number => a.position - b.position,
    );
  }
  // #endregion
}
