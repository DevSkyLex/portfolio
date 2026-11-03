import type { Project, ProjectRevision } from '@vfortin/content-domain';
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
 * Class ReviseProject
 * @class ReviseProject
 *
 * @description
 * Applies editable project fields using the aggregate's publication completeness rules.
 */
export class ReviseProject {
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
   * Applies an edit while preserving the aggregate's identity and persistence-managed fields.
   * A published project is rejected if the edit removes required locale content.
   *
   * @param {string} id - Project identifier.
   * @param {number} expectedVersion - Version read before the command.
   * @param {ProjectRevision} revision - Editable fields to apply.
   * @returns {Promise<ProjectChangeResult>} Updated project and optional queued revision.
   */
  public execute(
    id: string,
    expectedVersion: number,
    revision: ProjectRevision,
  ): Promise<ProjectChangeResult> {
    return changeProject(
      this.unitOfWork,
      this.clock,
      id,
      expectedVersion,
      (project: Project): void => project.revise(revision, PUBLISHED_LOCALES),
    );
  }
  // #endregion
}
