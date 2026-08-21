import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsUUID()
  documentId: string;
}
