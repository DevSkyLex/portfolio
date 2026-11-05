import { ManualPublicationDisabledError } from '@internal/content-application/lib/errors/application-error';
import type {
  PublicationRepository,
  PublicationStatus,
} from '@internal/content-application/lib/ports/publication/publication.ports';

/** Maintains compatibility with existing publication state and closes legacy batches. */
export class ManagePublication {
  public constructor(private readonly repository: PublicationRepository) {}
  public status(): Promise<PublicationStatus> {
    return this.repository.status();
  }
  public async start(_expectedVersion: number): Promise<PublicationStatus> {
    void _expectedVersion;
    throw new ManualPublicationDisabledError();
  }
  public async publish(_expectedVersion: number): Promise<PublicationStatus> {
    void _expectedVersion;
    throw new ManualPublicationDisabledError();
  }
}
