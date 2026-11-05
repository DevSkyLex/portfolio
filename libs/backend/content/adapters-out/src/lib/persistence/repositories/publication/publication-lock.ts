import { eq } from 'drizzle-orm';
import type { ContentDatabase } from '@internal/content-adapters-out/lib/persistence/database/content-database';
import { contentRevision } from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/** Serializes content changes, batch transitions and purge decisions before any writes. */
export async function lockContentRevision(db: ContentDatabase): Promise<void> {
  await db.insert(contentRevision).values({ id: 1, revision: 0 }).onConflictDoNothing();
  await db
    .select({ id: contentRevision.id })
    .from(contentRevision)
    .where(eq(contentRevision.id, 1))
    .for('update');
}
