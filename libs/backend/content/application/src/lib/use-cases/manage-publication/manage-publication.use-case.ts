import type { Clock } from '@internal/content-application/lib/ports/content/content.ports';
import type {
  PublicationRepository,
  PublicationStatus,
} from '@internal/content-application/lib/ports/publication/publication.ports';

/** Coordinates explicit publication batches without transport or persistence dependencies. */
export class ManagePublication {
  public constructor(
    private readonly repository: PublicationRepository,
    private readonly clock: Clock,
  ) {}
  public status(): Promise<PublicationStatus> {
    return this.repository.status();
  }
  public start(expectedVersion: number): Promise<PublicationStatus> {
    return this.repository.start(expectedVersion);
  }
  public publish(expectedVersion: number): Promise<PublicationStatus> {
    return this.repository.publish(expectedVersion, this.clock.now());
  }
}
