import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentsService } from './documents.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadPdf(@UploadedFile() file: Express.Multer.File) {
    return this.documentsService.uploadPdf(file);
  }

  @Post('ask')
  askQuestion(@Body() dto: AskQuestionDto) {
    return this.documentsService.askQuestion(dto.question);
  }
}
