import { Worker, type Job } from 'bullmq'
import { chromium } from 'playwright'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'

interface ScreenshotJob {
  versionId: string
  contentKey: string
  thumbnailKey: string
}

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://redis:6379')
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
}

const s3Endpoint = process.env.S3_ENDPOINT ?? 'http://minio:9000'
const s3Bucket = process.env.S3_BUCKET ?? 'cdnmcp-assets'

const s3 = new S3Client({
  endpoint: s3Endpoint,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'cdnmcp',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'cdnmcp_secret',
  },
  forcePathStyle: true,
})

const prisma = new PrismaClient()

const worker = new Worker<ScreenshotJob>(
  'screenshots',
  async (job: Job<ScreenshotJob>) => {
    const { versionId, contentKey, thumbnailKey } = job.data
    const contentUrl = `${s3Endpoint}/${s3Bucket}/${contentKey}`

    console.log(`[screenshot] versionId=${versionId} url=${contentUrl}`)

    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto(contentUrl, { waitUntil: 'networkidle', timeout: 30_000 })

      const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 })

      await s3.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: thumbnailKey,
          Body: screenshot,
          ContentType: 'image/jpeg',
        }),
      )

      await prisma.version.update({
        where: { id: versionId },
        data: { thumbnailPath: thumbnailKey },
      })

      console.log(`[screenshot] done → ${thumbnailKey}`)
    } finally {
      await browser.close()
    }
  },
  { connection, concurrency: 2 },
)

worker.on('failed', (job, err) => {
  console.error(`[screenshot] job ${job?.id} failed:`, err.message)
})

console.log('[screenshot-worker] listening on queue: screenshots')
