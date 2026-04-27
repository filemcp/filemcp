import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'

@Injectable()
export class StorageService {
  private client: S3Client
  private bucket: string
  private publicUrl: string
  private internalEndpoint: string | undefined

  constructor(private config: ConfigService) {
    this.bucket = config.getOrThrow('S3_BUCKET')
    this.publicUrl = config.getOrThrow('S3_PUBLIC_URL')
    this.internalEndpoint = config.get('S3_ENDPOINT')

    this.client = new S3Client({
      endpoint: this.internalEndpoint,
      region: config.get('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow('S3_SECRET_KEY'),
      },
      forcePathStyle: !!this.internalEndpoint,
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

  async getObject(key: string): Promise<{ data: Buffer; contentType: string }> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    const chunks: Buffer[] = []
    for await (const chunk of response.Body as Readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return {
      data: Buffer.concat(chunks),
      contentType: response.ContentType ?? 'application/octet-stream',
    }
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

  assetKey(orgId: string, assetId: string, version: number, filename: string): string {
    return `assets/${orgId}/${assetId}/v${version}/${filename}`
  }
}
