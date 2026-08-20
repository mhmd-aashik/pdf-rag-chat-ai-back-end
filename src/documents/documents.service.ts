import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PDFParse } from 'pdf-parse';

import { EmbeddingService } from '../ai/embedding.service';
import { DATABASE_CONNECTION } from '../database/database.constants';
import * as schema from '../database/schema';
import { chunks, documents } from '../database/schema';
import { chunkText } from './utils/chunk-text';
import { sql, cosineDistance, desc } from 'drizzle-orm';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,

    private readonly embeddingService: EmbeddingService,
  ) {}

  async uploadPdf(file: Express.Multer.File) {
    // 1. Read the uploaded PDF.
    const parser = new PDFParse({
      data: file.buffer,
    });

    // 2. Extract plain text.
    const result = await parser.getText();

    await parser.destroy();

    // 3. Split the PDF text into smaller chunks.
    const textChunks = chunkText(result.text);

    // 4. Generate an embedding for every chunk.
    const chunksWithEmbeddings = await Promise.all(
      textChunks.map(async (content) => {
        const embedding = await this.embeddingService.createEmbedding(content);

        return {
          content,
          embedding,
        };
      }),
    );

    // 5. Insert the original document.
    const [document] = await this.db
      .insert(documents)
      .values({
        fileName: file.originalname,
      })
      .returning();

    // 6. Insert all chunks belonging to that document.
    await this.db.insert(chunks).values(
      chunksWithEmbeddings.map((chunk) => ({
        documentId: document.id,
        content: chunk.content,
        embedding: chunk.embedding,
      })),
    );

    // 7. Return a small response.
    return {
      documentId: document.id,
      fileName: document.fileName,
      totalChunks: chunksWithEmbeddings.length,
      message: 'PDF processed successfully',
    };
  }

  async askQuestion(question: string) {
    // Convert the user's question into the same
    // 768-dimension vector format used by our PDF chunks.

    // 1. Convert the user's question into an embedding.
    const questionEmbedding =
      await this.embeddingService.createEmbedding(question);

    // 2. Calculate similarity.
    // cosineDistance:
    // 0 = extremely close
    // larger value = less similar
    // We convert distance into similarity:
    // similarity = 1 - distance

    const similarity = sql<number>`
    1 - (${cosineDistance(chunks.embedding, questionEmbedding)})
  `;

    // 3. Search the chunks table.
    const results = await this.db
      .select({
        id: chunks.id,
        content: chunks.content,
        documentId: chunks.documentId,
        similarity,
      })
      .from(chunks)
      // Highest similarity first.
      .orderBy(desc(similarity))
      // For now, retrieve only the best 3 chunks.
      .limit(3);
    return {
      question,
      results,
    };
  }
}
