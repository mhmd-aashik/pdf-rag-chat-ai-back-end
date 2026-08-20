import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),

  fileName: text('file_name').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
