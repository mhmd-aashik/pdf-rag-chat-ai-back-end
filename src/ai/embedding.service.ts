import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class EmbeddingService {
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: 'gemini-flash-latest',

      contents: text,

      config: {
        outputDimensionality: 768,
      },
    });

    return result.embeddings?.[0]?.values ?? [];
  }
}
