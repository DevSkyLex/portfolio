import type { Project } from '@vfortin/content-domain';
import { NotFoundError } from '@internal/content-application/lib/errors/application-error';
import type {
  Clock,
  ContentUnitOfWork,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface ProjectChangeResult
 * @interface ProjectChangeResult
 *
 * @description
 * Result of an optimistic project update and its optional public rebuild request.
 */
export interface ProjectChangeResult {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Updated aggregate after the transaction has saved it.
   */
  readonly project: Project;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Version assigned by the repository after matching the expected version.
   */
  readonly version: number;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Revision queued for a rebuild, or `null` when the project was and remains a draft.
   */
  readonly revision: number | null;
  // #endregion
}

/**
 * Function changeProject
 *
 * @description
 * Applies a project mutation with optimistic locking. If it was or becomes published, the
 * content revision and rebuild request are written in the same unit of work as the project.
 *
 * @param {ContentUnitOfWork} unitOfWork - Transaction boundary for the project and outbox writes.
 * @param {Clock} clock - Source of the request timestamp.
 * @param {string} id - Project identifier to load.
 * @param {number} expectedVersion - Version that must still be stored for the save to succeed.
 * @param {(project: Project) => void} change - Mutation applied to the loaded aggregate.
 * @returns {Promise<ProjectChangeResult>} Updated project, new version and optional rebuild revision.
 */
export function changeProject(
  unitOfWork: ContentUnitOfWork,
  clock: Clock,
  id: string,
  expectedVersion: number,
  change: (project: Project) => void,
): Promise<ProjectChangeResult> {
  return unitOfWork.run(async ({ projects, buildRequests }): Promise<ProjectChangeResult> => {
    const project: Project | null = await projects.get(id);
    if (project === null) {
      throw new NotFoundError('Project');
    }
    const wasPublished: boolean = project.isPublished();
    change(project);
    const version: number = await projects.save(project, expectedVersion);
    const revision: number | null =
      wasPublished || project.isPublished() ? await buildRequests.request(clock.now()) : null;
    return { project, version, revision };
  });
}
