import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PDFParse } from 'pdf-parse';

import { EmbeddingService } from '../ai/embedding.service';
import { DATABASE_CONNECTION } from '../database/database.constants';
import * as schema from '../database/schema';
import { chunks, documents } from '../database/schema';
import { chunkText } from './utils/chunk-text';
import { sql, cosineDistance, desc, eq } from 'drizzle-orm';

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

  async askQuestion(question: string, documentId: string) {
    const questionEmbedding =
      await this.embeddingService.createEmbedding(question);

    const similarity = sql<number>`
      1 - (${cosineDistance(chunks.embedding, questionEmbedding)})
    `;

    const results = await this.db
      .select({
        id: chunks.id,
        content: chunks.content,
        documentId: chunks.documentId,
        similarity,
      })
      .from(chunks)

      // Search ONLY inside the selected PDF.
      .where(eq(chunks.documentId, documentId))

      .orderBy(desc(similarity))
      .limit(3);

    if (results.length === 0) {
      return {
        question,
        answer: 'No document information was found.',
        sources: [],
      };
    }

    const relevantResults = results.filter(
      (result) => result.similarity >= 0.5,
    );

    if (relevantResults.length === 0) {
      return {
        question,
        answer: 'I could not find that information in the document.',
        sources: [],
      };
    }

    const context = relevantResults
      .map(
        (result, index) => `
  Source ${index + 1}:
  ${result.content}
  `,
      )
      .join('\n');

    const answer = await this.embeddingService.generateAnswer(
      question,
      context,
    );

    return {
      question,
      answer,

      sources: relevantResults.map((result) => ({
        chunkId: result.id,
        documentId: result.documentId,
        similarity: result.similarity,
        content: result.content,
      })),
    };
  }
}
