import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class StorageService {
  private client: S3Client
  private bucket: string
  private publicUrl: string
  private internalEndpoint: string | undefined
  private publicEndpoint: string | undefined

  constructor(private config: ConfigService) {
    this.bucket = config.getOrThrow('S3_BUCKET')
    this.publicUrl = config.getOrThrow('S3_PUBLIC_URL')
    this.internalEndpoint = config.get('S3_ENDPOINT')
    // S3_PUBLIC_ENDPOINT is the browser-accessible MinIO URL (e.g. http://localhost:9000)
    // Falls back to S3_ENDPOINT if not set (works when API and browser share the same network)
    this.publicEndpoint = config.get('S3_PUBLIC_ENDPOINT') ?? this.internalEndpoint

    this.client = new S3Client({
      endpoint: this.internalEndpoint,
      region: config.get('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow('S3_SECRET_KEY'),
      },
      forcePathStyle: !!this.internalEndpoint,
      // Prevent SDK from appending x-amz-checksum-mode to presigned URLs, which MinIO rejects
      requestChecksumCalculation: 'when_required',
      responseChecksumValidation: 'when_required',
      requestHandler: {
        requestTimeout: 10_000,
        connectionTimeout: 5_000,
      } as any,
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    )
    // Rewrite the internal hostname to the public-facing one so browsers can load it
    if (this.internalEndpoint && this.publicEndpoint && this.internalEndpoint !== this.publicEndpoint) {
      return url.replace(this.internalEndpoint, this.publicEndpoint)
    }
    return url
  }

  async deleteFolder(prefix: string): Promise<void> {
    const list = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    )
    const objects = list.Contents?.map((o) => ({ Key: o.Key! })) ?? []
    if (objects.length === 0) return

    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: objects },
      }),
    )
  }

  assetKey(userId: string, assetId: string, version: number, filename: string): string {
    return `assets/${userId}/${assetId}/v${version}/${filename}`
  }
}
