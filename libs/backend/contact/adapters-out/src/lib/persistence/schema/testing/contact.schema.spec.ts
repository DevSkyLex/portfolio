import type { ForeignKey } from 'drizzle-orm/pg-core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  messages,
  notificationJobs,
} from '@internal/contact-adapters-out/lib/persistence/schema/contact.schema';

describe('contact schema', (): void => {
  it('deletes the notifications of a deleted message (cascade)', (): void => {
    const [foreignKey] = getTableConfig(notificationJobs).foreignKeys;
    const reference: ReturnType<ForeignKey['reference']> | undefined = foreignKey?.reference();
    expect(reference?.foreignTable).toBe(messages);
    expect(foreignKey?.onDelete).toBe('cascade');
  });
});
