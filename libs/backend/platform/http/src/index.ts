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

/**
 * Constant address policy export
 *
 * @description
 * Outbound address policy shared by the services that fetch URLs given by a client (D45, D54).
 */
export { isPublicAddress } from '@internal/backend-http/lib/address-policy/address-policy';

/**
 * Constant HTTPS fetcher exports
 *
 * @description
 * Bounded GET of a client-supplied URL that cannot reach the server's own network (D45, D54).
 */
export {
  HttpsFetcher,
  type HttpsFetchedBody,
  type HttpsFetcherOptions,
  type HttpsFetchRequest,
} from '@internal/backend-http/lib/https-fetcher/https-fetcher';
