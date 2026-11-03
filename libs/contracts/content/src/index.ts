/**
 * Public snapshot exports
 *
 * @description
 * Exposes locale query validation and the localized published-content snapshot contract and DTO types.
 */
export {
  ContentLocaleSchema,
  ContentSnapshotQuerySchema,
  ContentSnapshotSchema,
  ProfileDtoSchema,
  ProjectDtoSchema,
  SkillGroupDtoSchema,
  TimelineEntryDtoSchema,
  type ContentLocale,
  type ContentSnapshot,
  type ContentSnapshotQuery,
  type ProfileDto,
  type ProjectDto,
  type SkillGroupDto,
  type TimelineEntryDto,
} from '@internal/content-contracts/lib/content-snapshot.contract';

/**
 * Public project administration exports
 *
 * @description
 * Exposes project revision, administrator DTO and list schemas with stable content error codes.
 */
export {
  AdminProjectDtoSchema,
  AdminProjectListSchema,
  CONTENT_ADMIN_ERROR_CODES,
  LocalizedTextDtoSchema,
  ProjectRevisionRequestSchema,
  type AdminProjectDto,
  type AdminProjectList,
  type LocalizedTextDto,
  type ProjectRevisionRequest,
} from '@internal/content-contracts/lib/admin-project.contract';
