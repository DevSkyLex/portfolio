import type { Provider } from '@angular/core';
import { AdminPublicationApiService } from '@vfortin/content-web-data-access/admin';
import { of } from 'rxjs';

/** Editor tests isolate the publication HTTP boundary, covered by its own store tests. */
export const PUBLICATION_TEST_PROVIDER: Provider = {
  provide: AdminPublicationApiService,
  useValue: {
    status: () =>
      of({ version: 1, batching: false, pendingChanges: false, revision: 1, publishedRevision: 1 }),
  },
};
