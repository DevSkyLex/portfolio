import type { Project } from '@vfortin/content-domain';
import type {
  Clock,
  ContentUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  type ProjectChangeResult,
  changeProject,
} from '@internal/content-application/lib/use-cases/change-project/change-project';
import { PUBLISHED_LOCALES } from '@internal/content-application/lib/use-cases/published-locales/published-locales';

/**
 * Class PublishProject
 * @class PublishProject
 *
 * @description
 * Publishes a project through the transactional change operation and required locale rules.
 */
export class PublishProject {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the unit of work and timestamp source for project and rebuild request writes.
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
   * Publishes the project if its translations are complete for every required locale.
   *
   * @param {string} id - Project identifier.
   * @param {number} expectedVersion - Version read before the command.
   * @returns {Promise<ProjectChangeResult>} Updated project and queued public revision.
   */
  public execute(id: string, expectedVersion: number): Promise<ProjectChangeResult> {
    return changeProject(
      this.unitOfWork,
      this.clock,
      id,
      expectedVersion,
      (project: Project): void => project.publish(PUBLISHED_LOCALES),
    );
  }
  // #endregion
}
