import type { Provider } from '@angular/core';
import { ContentSnapshotSchema } from '@vfortin/content-contracts';
import { CONTENT_SNAPSHOT_VALIDATOR } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-validator.token';

/**
 * Function provideContentSnapshotValidation
 *
 * @description
 * Registers the contract parser as the snapshot validator for server rendering and tests; the server-only entry point keeps Zod out of the browser bundle (D10).
 *
 * @returns {Provider} Provider that parses unknown snapshot data into a validated content snapshot.
 */
export function provideContentSnapshotValidation(): Provider {
  return {
    provide: CONTENT_SNAPSHOT_VALIDATOR,
    useValue: (value: unknown) => ContentSnapshotSchema.parse(value),
  };
}
