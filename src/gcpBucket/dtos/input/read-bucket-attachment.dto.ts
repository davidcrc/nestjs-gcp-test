import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import {
  FileExtensionEnum,
  AttachmentDirectoryEnum,
} from '../../../attachments/enums/attachment.enum';

export class ReadBucketAttachmentDto {
  @IsEnum(FileExtensionEnum)
  readonly ext: FileExtensionEnum;

  @IsString()
  @IsNotEmpty()
  readonly fileName: string;

  @IsEnum(AttachmentDirectoryEnum)
  readonly path: string;
}
