import { Storage } from '@google-cloud/storage';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { catchError, firstValueFrom } from 'rxjs';
import { CacheManagerService } from '../../../maintenance/services/cache-manager.service';
import { EnvConfigService } from '../../config/env-config.service';
import { CopyFileDto } from './dtos/input/copy-file.dto';
import { CreateBucketAttachmentDto } from './dtos/input/create-bucket-attachment.dto';
import { DownloadImageFromURLDto } from './dtos/input/download-image-from-url.dto';
import { GenerateSignedUrlDto } from './dtos/input/generate-signed-url.dto';
import { ReadBucketAttachmentDto } from './dtos/input/read-bucket-attachment.dto';
import { ReadBucketPlatformConfigDto } from './dtos/input/read-bucket-platform-config.dto';
import { RenameFileDto } from './dtos/input/rename-file.dto';
import { BucketRestaurantCredentialsDto } from './dtos/response/bucket-restaurant-credentials.dto';

@Injectable()
export class GCPBucketService {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly timeInSeconds: number;
  private readonly timeInMiliSeconds: number;
  readonly logger: Logger;

  constructor(
    private readonly configService: EnvConfigService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly http: HttpService,
  ) {
    this.logger = new Logger(GCPBucketService.name);
    const days = this.configService.bucketConfig().bucketPresignedUrlExp;
    const hoursInDay = 24;
    const minutes = 60;
    const seconds = 60;
    const miliSeconds = 1000;
    const timeInMinutes = days * hoursInDay * minutes;

    this.timeInSeconds = timeInMinutes * seconds;
    this.timeInMiliSeconds = this.timeInSeconds * miliSeconds;

    this.bucketName = this.configService.bucketConfig().bucketName;
    this.storage = new Storage({
      credentials: {
        client_email: this.configService.gcpConfig().gcpClientEmail,
        private_key: this.configService.gcpConfig().gcpSecretAccessKey,
      },
      projectId: this.configService.gcpConfig().gcpProjectId,
    });
  }

  async createGetSignedUrl({
    ext,
    fileName,
    path,
  }: ReadBucketAttachmentDto): Promise<string> {
    const filePath = `${path}-${fileName}.${ext}`;

    const cachedSignedUrl: string =
      await this.cacheManagerService.get(filePath);

    if (cachedSignedUrl) {
      return cachedSignedUrl;
    }

    const signedUrl = await this.generateSignedUrl({ filePath });

    await this.cacheManagerService.set(filePath, signedUrl, this.timeInSeconds);

    return signedUrl;
  }

  async createPutSignedUrl({
    ext,
    fileName,
    path,
    contentType,
  }: CreateBucketAttachmentDto): Promise<string> {
    const fileKey = `${path}-${fileName}.${ext}`;

    const [mySignedUrl] = await this.storage
      .bucket(this.bucketName)
      .file(fileKey)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + this.timeInMiliSeconds,
        contentType,
      });

    return mySignedUrl;
  }

  async readFileFromStorage(
    bucketName: string,
    restaurantUUID: string,
  ): Promise<BucketRestaurantCredentialsDto> {
    const [buffer] = await this.storage
      .bucket(bucketName)
      .file(`${restaurantUUID}.json`)
      .download();
    const data = JSON.parse(buffer.toString('utf8'));

    return plainToInstance(BucketRestaurantCredentialsDto, {
      privateKey: data.private_key,
      projectId: data.project_id,
      clientEmail: data.client_email,
    });
  }

  async createPlatformConfigFileSignedUrl({
    bucketName,
    path,
    fileName,
    ext,
  }: ReadBucketPlatformConfigDto): Promise<string> {
    const filePath = `${path}/${fileName}.${ext}`;

    const signedUrl = await this.generateSignedUrl({ bucketName, filePath });

    return signedUrl;
  }

  private async generateSignedUrl({
    bucketName,
    filePath,
  }: GenerateSignedUrlDto): Promise<string> {
    const bucket = bucketName ?? this.bucketName;

    const [mySignedUrl] = await this.storage
      .bucket(bucket)
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + this.timeInMiliSeconds,
      });

    return mySignedUrl;
  }

  async downloadImageFromURL({
    url,
    contentType,
    fileKey,
  }: DownloadImageFromURLDto): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileKey);

      const response = await firstValueFrom(
        this.http
          .get(url, { responseType: 'arraybuffer', responseEncoding: 'base64' })
          .pipe(
            catchError((error: AxiosError) => {
              throw new HttpException(
                error.response.data['message'],
                error.response.status,
                { cause: error },
              );
            }),
          ),
      );

      file.save(response.data, { contentType });
    } catch (exception) {
      this.logger.error(exception);

      throw new UnprocessableEntityException(exception);
    }
  }

  async move(input: RenameFileDto): Promise<void> {
    await this.storage
      .bucket(this.bucketName)
      .file(input.oldName)
      .move(input.newName);
  }

  async copy(input: CopyFileDto): Promise<void> {
    try {
      await this.storage
        .bucket(this.bucketName)
        .file(input.oldName)
        .copy(input.newName);
    } catch (exception) {
      this.logger.error(exception);
    }
  }
}
