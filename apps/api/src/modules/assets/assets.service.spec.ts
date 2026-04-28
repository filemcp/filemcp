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
import { EmailService } from '../email/email.service'

const mockStorage = {
  upload: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn().mockResolvedValue({ data: Buffer.from('hello'), contentType: 'text/html' }),
  getPublicUrl: jest.fn().mockImplementation((k: string) => `http://s3/${k}`),
  deleteFolder: jest.fn().mockResolvedValue(undefined),
  assetKey: jest.fn().mockImplementation((o: string, a: string, v: number, f: string) => `assets/${o}/${a}/v${v}/${f}`),
}
const mockRender = { markdownToHtml: jest.fn().mockResolvedValue('<p>ok</p>') }
const mockThumbnail = { enqueue: jest.fn().mockResolvedValue(undefined) }
const mockEmail = { sendAssetShared: jest.fn().mockResolvedValue(undefined) }

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [
      AssetsService,
      { provide: StorageService, useValue: mockStorage },
      { provide: RenderService, useValue: mockRender },
      { provide: ThumbnailService, useValue: mockThumbnail },
      { provide: EmailService, useValue: mockEmail },
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

function randomUUID() {
  return require('crypto').randomUUID() as string
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

  describe('uploadVersion', () => {
    it('creates a new asset and version when uuid is not in the db, returns url and versionUrl', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const uuid = randomUUID()
      const result = await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      expect(result.url).toContain('/u/owner/')
      expect(result.versionUrl).toContain('/v/1')
      expect(result.version).toBe(1)
      expect(result.uuid).toBe(uuid)
    })

    it('uses the supplied uuid as the asset uuid', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const uuid = randomUUID()
      await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      const asset = await prisma.asset.findUnique({ where: { uuid } })
      expect(asset).not.toBeNull()
    })

    it('derives title from originalname when not provided in dto', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile('my-presentation.html'), {})
      const assets = await prisma.asset.findMany({ where: { orgId: org.id } })
      expect(assets[0].title).toBe('my-presentation')
    })

    it('derives slug from filename and extension', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile('my-deck.html'), {})
      const assets = await prisma.asset.findMany({ where: { orgId: org.id } })
      expect(assets[0].slug).toBe('my-deck-html')
    })

    it('creates version 2 when the same uuid is uploaded again', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const uuid = randomUUID()
      const r1 = await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      const r2 = await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      expect(r1.assetId).toBe(r2.assetId)
      expect(r2.version).toBe(2)
    })

    it('does not create a second asset record on re-upload of same uuid', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const uuid = randomUUID()
      await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      const count = await prisma.asset.count({ where: { orgId: org.id } })
      expect(count).toBe(1)
    })

    it('throws ForbiddenException when uuid belongs to a different org', async () => {
      const user1 = await prisma.user.create({
        data: { email: 'a@test.com', username: 'a', passwordHash: 'h', updatedAt: new Date() },
      })
      const user2 = await prisma.user.create({
        data: { email: 'b@test.com', username: 'b', passwordHash: 'h', updatedAt: new Date() },
      })
      const org1 = await prisma.organization.create({ data: { slug: 'org1', name: 'org1' } })
      const org2 = await prisma.organization.create({ data: { slug: 'org2', name: 'org2' } })
      await prisma.orgMember.create({ data: { orgId: org1.id, userId: user1.id, role: 'OWNER' } })
      await prisma.orgMember.create({ data: { orgId: org2.id, userId: user2.id, role: 'OWNER' } })

      const uuid = randomUUID()
      await service.uploadVersion(org1.id, user1.id, uuid, htmlFile(), {})
      await expect(
        service.uploadVersion(org2.id, user2.id, uuid, htmlFile(), {}),
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws PayloadTooLargeException when file exceeds maxBytes', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const bigFile = { ...htmlFile(), size: 2 * 1024 * 1024 }
      await expect(
        service.uploadVersion(org.id, user.id, randomUUID(), bigFile, {}, { maxBytes: 1024 * 1024 }),
      ).rejects.toThrow(PayloadTooLargeException)
    })

    it('throws BadRequestException for unsupported MIME type', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const badFile = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'img.png', size: 100 }
      await expect(service.uploadVersion(org.id, user.id, randomUUID(), badFile, {})).rejects.toThrow(BadRequestException)
    })

    it('throws ForbiddenException when org asset limit is reached (new uuid)', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      process.env.ORG_ASSET_LIMIT = '0'
      await expect(
        service.uploadVersion(org.id, user.id, randomUUID(), htmlFile('new.html'), {}),
      ).rejects.toThrow(ForbiddenException)
      process.env.ORG_ASSET_LIMIT = '10'
    })

    it('does NOT enforce the asset limit when re-uploading an existing uuid', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const uuid = randomUUID()
      await service.uploadVersion(org.id, user.id, uuid, htmlFile(), {})
      process.env.ORG_ASSET_LIMIT = '0'
      // Should succeed because asset already exists
      await expect(
        service.uploadVersion(org.id, user.id, uuid, htmlFile(), {}),
      ).resolves.toBeDefined()
      process.env.ORG_ASSET_LIMIT = '10'
    })

    it('renders markdown to HTML and stores rendered path', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const mdFile = { buffer: Buffer.from('# Hello'), mimetype: 'text/markdown', originalname: 'doc.md', size: 7 }
      await service.uploadVersion(org.id, user.id, randomUUID(), mdFile, {})
      expect(mockRender.markdownToHtml).toHaveBeenCalledWith('# Hello')
      const version = await prisma.version.findFirst({ where: {} })
      expect(version?.renderedPath).toContain('rendered.html')
    })

    it('enqueues thumbnail generation after upload', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), {})
      expect(mockThumbnail.enqueue).toHaveBeenCalledTimes(1)
    })
  })

  describe('listByOrg', () => {
    it('returns paginated assets for the org', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile('a.html'), {})
      await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile('b.html'), {})
      const result = await service.listByOrg(org.id, 1, 10)
      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('returns asset detail for the correct org', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), {})
      const detail = await service.getById(upload.assetId, org.id)
      expect(detail.id).toBe(upload.assetId)
    })

    it('throws ForbiddenException for wrong org', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), {})
      await expect(service.getById(upload.assetId, 'other-org-id')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('deletes the asset and calls storage.deleteFolder', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), {})
      await service.delete(org.id, upload.assetId)
      expect(mockStorage.deleteFolder).toHaveBeenCalled()
      await expect(service.getById(upload.assetId, org.id)).rejects.toThrow(NotFoundException)
    })
  })

  describe('resolvePublic', () => {
    it('returns asset for PUBLIC visibility (anonymous)', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), {})
      const result = await service.resolvePublic('owner', upload.uuid)
      expect(result.uuid).toBe(upload.uuid)
    })

    it('throws NotFoundException for PRIVATE asset when anonymous', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), { visibility: 'PRIVATE' as any })
      await expect(service.resolvePublic('owner', upload.uuid)).rejects.toThrow(NotFoundException)
    })

    it('returns PRIVATE asset for org member', async () => {
      const { user, org } = await seedOrgAndUser(prisma)
      const upload = await service.uploadVersion(org.id, user.id, randomUUID(), htmlFile(), { visibility: 'PRIVATE' as any })
      const result = await service.resolvePublic('owner', upload.uuid, undefined, user.id)
      expect(result.uuid).toBe(upload.uuid)
    })
  })
})
