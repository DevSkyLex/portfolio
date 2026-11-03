/**
 * Public problem response exports
 *
 * @description
 * Exposes context problem mapping and the shared HTTP exception filter.
 */
export {
  PROBLEM_MAPPER,
  ProblemDetailsFilter,
  type MappedProblem,
  type ProblemMapper,
} from '@internal/backend-http/lib/filters/problem-details/problem-details.filter';

/**
 * Public validation exports
 *
 * @description
 * Exposes the schema adapter that translates request contract failures into HTTP 400 responses.
 */
export {
  ZodValidationPipe,
  type ContractSchema,
} from '@internal/backend-http/lib/pipes/zod-validation/zod-validation.pipe';

/**
 * Public optimistic-locking exports
 *
 * @description
 * Exposes the `If-Match` parameter decorator and version entity-tag parsing and formatting helpers.
 */
export {
  IfMatchVersion,
  parseIfMatch,
  versionEtag,
} from '@internal/backend-http/lib/if-match/if-match';
