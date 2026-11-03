/**
 * Export provideContentSnapshotValidation
 *
 * @description
 * Server-only snapshot validator provider; importing this secondary entry point keeps Zod out of the browser bundle (D10).
 */
export { provideContentSnapshotValidation } from '@internal/content-web-data-access/lib/providers/content-snapshot-validation/content-snapshot-validation.provider';
