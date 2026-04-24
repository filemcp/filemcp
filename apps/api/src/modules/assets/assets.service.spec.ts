// Mock before any import that transitively loads unified (ESM-only package)
jest.mock('../render/render.service', () => ({
  RenderService: class MockRenderService {
    markdownToHtml = jest.fn().mockResolvedValue('<p>ok</p>')
  },
}))

import { Test } from '@nestjs/testing'
import { ForbiddenException, NotFoundException, BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AssetsService } from './assets.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { RenderService } from '../render/render.service'
import { ThumbnailService } from '../thumbnail/thumbnail.service'

const mockStorage = {
  upload: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn().mockResolvedValue({ data: Buffer.from('hello'), contentType: 'text/html' }),
  getPublicUrl: jest.fn().mockImplementation((k: string) => `http://s3/${k}`),
  deleteFolder: jest.fn().mockResolvedValue(undefined),
  assetKey: jest.fn().mockImplementation((o: string, a: string, v: number, f: string) => `assets/${o}/${a}/v${v}/${f}`),
}
const mockRender = { markdownToHtml: jest.fn().mockResolvedValue('<p>ok</p>') }
const mockThumbnail = { enqueue: jest.fn().mockResolvedValue(undefined) }

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [
      AssetsService,
      { provide: StorageService, useValue: mockStorage },
      { provide: RenderService, useValue: mockRender },
      { provide: ThumbnailService, useValue: mockThumbnail },
    ],
  }).compile()

  return {
    service: module.get(AssetsService),
    prisma: module.get(PrismaService),
  }
}

function htmlFile(name = 'deck.html') {
  return { buffer: Buffer.from('<h1>Test</h1>'), mimetype: 'text/html', originalname: name, size: 100 }
}

async function seedOrgAndUser(prisma: PrismaService) {
  const user = await prisma.user.create({
    data: { email: 'owner@test.com', username: 'owner', passwordHash: 'hash', updatedAt: new Date() },
  })
  const org = await prisma.organization.create({ data: { slug: 'owner', name: 'owner' } })
  await prisma.orgMember.create({ data: { orgId: org.id, userId: user.id, role: 'OWNER' } })
  return { user, org }
}

describe('AssetsService', () => {
  let service: AssetsService
  let prisma: PrismaService

  beforeEach(async () => {
    const built = await buildService()
    service = built.service
    prisma = built.prisma
    jest.clearAllMocks()
  })

  describe('upload', () => {
    it('creates an asset and version, returns url and versionUrl', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const result = await service.upload(org.id, user.id, htmlFile(), {})
      expect(result.url).toContain('/u/owner/')
      expect(result.versionUrl).toContain('/v/1')
      expect(result.version).toBe(1)
    })

    it('derives title from originalname', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.upload(org.id, user.id, htmlFile('my-presentation.html'), {})
      const assets = await prisma.asset.findMany({ where: { orgId: org.id } })
      expect(assets[0].title).toBe('my-presentation')
    })

    it('derives slug from filename and extension', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.upload(org.id, user.id, htmlFile('my-deck.html'), {})
      const assets = await prisma.asset.findMany({ where: { orgId: org.id } })
      expect(assets[0].slug).toBe('my-deck-html')
    })

    it('creates version 2 on second upload of same filename', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const r1 = await service.upload(org.id, user.id, htmlFile('deck.html'), {})
      const r2 = await service.upload(org.id, user.id, htmlFile('deck.html'), {})
      expect(r1.assetId).toBe(r2.assetId)
      expect(r2.version).toBe(2)
    })

    it('throws PayloadTooLargeException when file exceeds maxBytes', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const bigFile = { ...htmlFile(), size: 2 * 1024 * 1024 }
      await expect(
        service.upload(org.id, user.id, bigFile, {}, { maxBytes: 1024 * 1024 }),
      ).rejects.toThrow(PayloadTooLargeException)
    })

    it('throws BadRequestException for unsupported MIME type', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const badFile = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'img.png', size: 100 }
      await expect(service.upload(org.id, user.id, badFile, {})).rejects.toThrow(BadRequestException)
    })

    it('throws ForbiddenException when org asset limit is reached', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      // Set limit to 0 via env
      process.env.ORG_ASSET_LIMIT = '0'
      await expect(service.upload(org.id, user.id, htmlFile('new.html'), {})).rejects.toThrow(ForbiddenException)
      process.env.ORG_ASSET_LIMIT = '10'
    })
  })

  describe('listByOrg', () => {
    it('returns paginated assets for the org', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.upload(org.id, user.id, htmlFile('a.html'), {})
      await service.upload(org.id, user.id, htmlFile('b.html'), {})
      const result = await service.listByOrg(org.id, 1, 10)
      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('returns asset detail for the correct org', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.upload(org.id, user.id, htmlFile(), {})
      const detail = await service.getById(upload.assetId, org.id)
      expect(detail.id).toBe(upload.assetId)
    })

    it('throws ForbiddenException for wrong org', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.upload(org.id, user.id, htmlFile(), {})
      await expect(service.getById(upload.assetId, 'other-org-id')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('deletes the asset and calls storage.deleteFolder', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.upload(org.id, user.id, htmlFile(), {})
      await service.delete(org.id, upload.assetId)
      expect(mockStorage.deleteFolder).toHaveBeenCalled()
      await expect(service.getById(upload.assetId, org.id)).rejects.toThrow(NotFoundException)
    })
  })

  describe('resolvePublic', () => {
    it('returns asset for PUBLIC visibility (anonymous)', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.upload(org.id, user.id, htmlFile(), {})
      const result = await service.resolvePublic('owner', upload.uuid)
      expect(result.uuid).toBe(upload.uuid)
    })

    it('throws NotFoundException for PRIVATE asset when anonymous', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.upload(org.id, user.id, htmlFile(), { visibility: 'PRIVATE' as any })
      await expect(service.resolvePublic('owner', upload.uuid)).rejects.toThrow(NotFoundException)
    })

    it('returns PRIVATE asset for org member', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.upload(org.id, user.id, htmlFile(), { visibility: 'PRIVATE' as any })
      const result = await service.resolvePublic('owner', upload.uuid, undefined, user.id)
      expect(result.uuid).toBe(upload.uuid)
    })
  })
})
