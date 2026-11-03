import type { Project } from '@vfortin/content-domain';
import type {
  Clock,
  ContentUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  type ProjectChangeResult,
  changeProject,
} from '@internal/content-application/lib/use-cases/change-project/change-project';

/**
 * Class UnpublishProject
 * @class UnpublishProject
 *
 * @description
 * Moves a project to draft state through the transactional change operation.
 */
export class UnpublishProject {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the unit of work and timestamp source used by the change operation.
   *
   * @param {ContentUnitOfWork} unitOfWork - Atomic content write boundary.
   * @param {Clock} clock - Request timestamp source.
   */
  public constructor(
    private readonly unitOfWork: ContentUnitOfWork,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Sets the project to draft and requests a rebuild when it was previously public.
   *
   * @param {string} id - Project identifier.
   * @param {number} expectedVersion - Version read before the command.
   * @returns {Promise<ProjectChangeResult>} Updated project and optional rebuild revision.
   */
  public execute(id: string, expectedVersion: number): Promise<ProjectChangeResult> {
    return changeProject(
      this.unitOfWork,
      this.clock,
      id,
      expectedVersion,
      (project: Project): void => project.unpublish(),
    );
  }
  // #endregion
}
