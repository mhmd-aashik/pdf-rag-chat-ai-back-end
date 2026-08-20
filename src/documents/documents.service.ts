import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentsService {
  uploadPdf(file: Express.Multer.File) {
    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
