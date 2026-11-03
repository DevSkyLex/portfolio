/**
 * Public observability exports
 *
 * @description
 * Exposes service logging configuration, request correlation, redaction settings and health-check module options.
 */
export {
  LOG_REDACTIONS,
  ObservabilityModule,
  REQUEST_ID_HEADER,
  resolveRequestId,
  type ObservabilityOptions,
} from '@internal/backend-observability/lib/observability.module';

/**
 * Public readiness exports
 *
 * @description
 * Exposes the dependency-check contract and injection token used by service composition.
 */
export {
  READINESS_CHECKS,
  type ReadinessCheck,
} from '@internal/backend-observability/lib/readiness/readiness';
