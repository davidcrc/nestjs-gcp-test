import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BucketRestaurantCredentialsDto {
  @Expose()
  readonly privateKey: string;

  @Expose()
  readonly projectId: string;

  @Expose()
  readonly clientEmail: string;
}
