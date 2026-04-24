import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../app.module'
import { StorageService } from '../modules/storage/storage.service'
import { RenderService } from '../modules/render/render.service'
import { ThumbnailService } from '../modules/thumbnail/thumbnail.service'

export const mockStorage = {
  upload: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn().mockResolvedValue({ data: Buffer.from('test content'), contentType: 'text/html' }),
  getPublicUrl: jest.fn().mockImplementation((key: string) => `http://localhost:9000/test-bucket/${key}`),
  deleteFolder: jest.fn().mockResolvedValue(undefined),
  assetKey: jest.fn().mockImplementation(
    (orgId: string, assetId: string, version: number, filename: string) =>
      `assets/${orgId}/${assetId}/v${version}/${filename}`,
  ),
}

export const mockRender = {
  markdownToHtml: jest.fn().mockResolvedValue('<p>test</p>'),
}

export const mockThumbnail = {
  enqueue: jest.fn().mockResolvedValue(undefined),
}

export async function createTestApp(): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(StorageService).useValue(mockStorage)
    .overrideProvider(RenderService).useValue(mockRender)
    .overrideProvider(ThumbnailService).useValue(mockThumbnail)
    .compile()

  const app = module.createNestApplication()
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  await app.init()

  return { app, module }
}
