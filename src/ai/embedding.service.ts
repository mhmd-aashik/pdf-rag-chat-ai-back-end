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
      model: 'gemini-embedding-001',

      contents: text,

      config: {
        outputDimensionality: 768,
      },
    });

    return result.embeddings?.[0]?.values ?? [];
  }

  async generateAnswer(question: string, context: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-flash-latest',

      contents: `
      You are answering questions using only the provided context.
      
      Context:
      ${context}
      
      Question:
      ${question}
      
      If the answer is not available in the context, say:
      "I could not find that information in the document."
      `,
    });

    return response.text ?? '';
  }
}
