import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { chunkText } from './utils/chunk-text';
import { EmbeddingService } from 'src/ai/embedding.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly embeddingService: EmbeddingService) {}

  async uploadPdf(file: Express.Multer.File) {
    // create the PDF parser using the uploaded file buffer
    const parser = new PDFParse({
      data: file.buffer,
    });

    // Extract plain text from the PDF.
    const result = await parser.getText();

    // Release parser resources
    await parser.destroy();

    const chunks = chunkText(result.text);

    const embedding = await this.embeddingService.createEmbedding(chunks[0]);

    return {
      fileName: file.originalname,
      totalChunks: chunks.length,
      firstChunk: chunks[0],
      embeddingDimensions: embedding.length,
      embedding,
    };
  }
}
