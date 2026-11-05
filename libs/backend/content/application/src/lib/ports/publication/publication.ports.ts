/** Administration state; publishedRevision describes API content, not a confirmed deployed build. */
export interface PublicationStatus {
  readonly version: number;
  readonly batching: boolean;
  readonly pendingChanges: boolean;
  readonly revision: number;
  readonly publishedRevision: number;
}

/** Atomic persistent boundary for publication batch transitions. */
export interface PublicationRepository {
  status(): Promise<PublicationStatus>;
  start(expectedVersion: number): Promise<PublicationStatus>;
  publish(expectedVersion: number, now: Date): Promise<PublicationStatus>;
}
