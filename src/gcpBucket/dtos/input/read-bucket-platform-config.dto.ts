import {
  PlatformExtensionEnum,
  PlatformFolderPathEnum,
} from '../../../../../admin/services/app-history/enums/app-history.enum';

export class ReadBucketPlatformConfigDto {
  readonly bucketName: string;
  readonly ext: PlatformExtensionEnum;
  readonly path: PlatformFolderPathEnum;
  readonly fileName: string;
}
