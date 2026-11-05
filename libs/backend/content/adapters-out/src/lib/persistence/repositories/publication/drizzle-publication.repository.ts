import {
  type PublicationRepository,
  type PublicationStatus,
  VersionMismatchError,
} from '@vfortin/content-application';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  contentRevision,
  publicationState,
  projects,
  profile,
  timelineEntries,
  skillGroups,
  legalDocuments,
  media,
  siteBuildRequests,
  type FrozenContentRows,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import { lockContentRevision } from '@internal/content-adapters-out/lib/persistence/repositories/publication/publication-lock';

/** Captures public rows before a batch and releases all changes with a single outbox request. */
export class DrizzlePublicationRepository implements PublicationRepository {
  public constructor(private readonly db: ContentDatabase) {}

  public status(): Promise<PublicationStatus> {
    return this.db.transaction(
      (tx: ContentTransaction): Promise<PublicationStatus> => this.readStatus(tx),
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  private async readStatus(db: ContentDatabase): Promise<PublicationStatus> {
    const [state] = await db.select().from(publicationState).where(eq(publicationState.id, 1));
    const [content] = await db.select().from(contentRevision).where(eq(contentRevision.id, 1));
    const revision: number = content?.revision ?? 0;
    const batching: boolean = state?.frozen !== null && state?.frozen !== undefined;
    return {
      version: (state?.version ?? 1) + revision,
      batching,
      pendingChanges: batching && revision !== state?.baseRevision,
      revision,
      publishedRevision: batching ? (state?.baseRevision ?? revision) : revision,
    };
  }

  public start(expectedVersion: number): Promise<PublicationStatus> {
    return this.db.transaction(async (tx: ContentTransaction): Promise<PublicationStatus> => {
      await lockContentRevision(tx);
      const status: PublicationStatus = await this.readStatus(tx);
      if (status.version !== expectedVersion || status.batching)
        throw new VersionMismatchError('Publication state changed; reload it.');
      const frozen: FrozenContentRows = {
        projects: await tx.select().from(projects),
        profile: await tx.select().from(profile),
        timeline: await tx.select().from(timelineEntries),
        skills: await tx.select().from(skillGroups),
        legal: (await tx.select().from(legalDocuments)).map((row) => ({
          ...row,
          updatedAt: row.updatedAt.toISOString(),
        })),
        media: (await tx.select().from(media)).map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          unlinkedAt: row.unlinkedAt?.toISOString() ?? null,
        })),
      };
      await tx
        .insert(publicationState)
        .values({
          id: 1,
          version: status.version - status.revision + 1,
          baseRevision: status.revision,
          frozen,
        })
        .onConflictDoUpdate({
          target: publicationState.id,
          set: {
            version: status.version - status.revision + 1,
            baseRevision: status.revision,
            frozen,
          },
        });
      return this.readStatus(tx);
    });
  }

  public publish(expectedVersion: number, now: Date): Promise<PublicationStatus> {
    return this.db.transaction(async (tx: ContentTransaction): Promise<PublicationStatus> => {
      await lockContentRevision(tx);
      const status: PublicationStatus = await this.readStatus(tx);
      if (status.version !== expectedVersion || !status.batching)
        throw new VersionMismatchError('Publication state changed; reload it.');
      const [state] = await tx.select().from(publicationState).where(eq(publicationState.id, 1));
      const retained: string[] = state?.frozen?.media.map((row) => row.id) ?? [];
      if (retained.length > 0) {
        await tx
          .update(media)
          .set({ unlinkedAt: now })
          .where(and(inArray(media.id, retained), isNotNull(media.unlinkedAt)));
      }
      await tx
        .update(publicationState)
        .set({
          frozen: null,
          version: status.version - status.revision + 1,
          baseRevision: status.revision,
        })
        .where(eq(publicationState.id, 1));
      if (status.pendingChanges) {
        await tx
          .insert(siteBuildRequests)
          .values({
            revision: status.revision,
            status: 'pending',
            requestedAt: now,
            nextAttemptAt: now,
          })
          .onConflictDoNothing();
      }
      return this.readStatus(tx);
    });
  }
}
