import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentsService {
  async uploadPdf(file: Express.Multer.File) {
    // create the PDF parser using the uploaded file buffer
    const parser = new PDFParse({
      data: file.buffer,
    });

    // Extract plain text from the PDF.
    const result = await parser.getText();

    // Release parser resources
    await parser.destroy();

    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      text: result.text,
    };
  }
}
