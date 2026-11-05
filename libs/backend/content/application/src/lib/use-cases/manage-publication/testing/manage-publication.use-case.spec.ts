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
  const now: Date = new Date('2026-11-05T12:00:00Z');
  const publication: ManagePublication = new ManagePublication(repository, {
    now: (): Date => now,
  });
  expect(await publication.status()).toBe(state);
  expect(await publication.start(1)).toBe(state);
  expect(await publication.publish(2)).toBe(state);
  expect(repository.start).toHaveBeenCalledWith(1);
  expect(repository.publish).toHaveBeenCalledWith(2, now);
});
