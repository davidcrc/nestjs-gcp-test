import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import {
  ContentTypeEnum,
  FileExtensionEnum,
  AttachmentDirectoryEnum,
  AttachmentContentTypeEnum,
  AttachmentExtensionEnum,
} from '../../../attachments/enums/attachment.enum';

export class CreateBucketAttachmentDto {
  @IsEnum(ContentTypeEnum)
  readonly contentType: ContentTypeEnum | AttachmentContentTypeEnum;

  @IsEnum(FileExtensionEnum)
  readonly ext: FileExtensionEnum | AttachmentExtensionEnum;

  @IsString()
  @IsNotEmpty()
  readonly fileName: string;

  @IsEnum(AttachmentDirectoryEnum)
  readonly path: string;
}
