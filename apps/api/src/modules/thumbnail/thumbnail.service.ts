import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'

interface ScreenshotJobData {
  versionId: string
  contentKey: string
  thumbnailKey: string
}

@Injectable()
export class ThumbnailService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<ScreenshotJobData>

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const redisUrl = new URL(this.config.get('REDIS_URL', 'redis://redis:6379'))
    this.queue = new Queue('screenshots', {
      connection: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379'),
      },
    })
  }

  async onModuleDestroy() {
    await this.queue.close()
  }

  async enqueue(data: ScreenshotJobData): Promise<void> {
    await this.queue.add('screenshot', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    })
  }
}
