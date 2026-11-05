import { ManagePublication } from '@internal/content-application/lib/use-cases/manage-publication/manage-publication.use-case';
import type {
  PublicationRepository,
  PublicationStatus,
} from '@internal/content-application/lib/ports/publication/publication.ports';

it('uses the requested version and clock without inferring a newer state', async (): Promise<void> => {
  const state: PublicationStatus = {
    version: 3,
    batching: false,
    pendingChanges: false,
    revision: 1,
    publishedRevision: 1,
  };
  const repository: PublicationRepository = {
    status: vi.fn().mockResolvedValue(state),
    start: vi.fn().mockResolvedValue(state),
    publish: vi.fn().mockResolvedValue(state),
  };
  const publication: ManagePublication = new ManagePublication(repository);
  expect(await publication.status()).toBe(state);
  await expect(publication.start(1)).rejects.toThrow(
    'Publication is automatic; manual batches are no longer supported.',
  );
  await expect(publication.publish(2)).rejects.toThrow('Publication is automatic');
  expect(repository.start).not.toHaveBeenCalled();
  expect(repository.publish).not.toHaveBeenCalled();
});
