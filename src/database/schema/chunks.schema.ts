import { pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';

import { documents } from './documents.schema';

export const chunks = pgTable('chunks', {
  id: uuid('id').defaultRandom().primaryKey(),

  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, {
      onDelete: 'cascade',
    }),

  content: text('content').notNull(),

  embedding: vector('embedding', {
    dimensions: 768,
  }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
