import { z } from 'zod/mini';

/** Publication batch status; this does not claim that the static build has completed. */
export const PublicationStatusSchema = z.strictObject({
  version: z.int().check(z.minimum(1)),
  batching: z.boolean(),
  pendingChanges: z.boolean(),
  revision: z.int().check(z.minimum(0)),
  publishedRevision: z.int().check(z.minimum(0)),
});
export type PublicationStatusDto = z.infer<typeof PublicationStatusSchema>;
