import { Test } from '@nestjs/testing'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CommentsService } from './comments.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { PrismaService } from '../../prisma/prisma.service'

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [CommentsService],
  }).compile()
  return { service: module.get(CommentsService), prisma: module.get(PrismaService) }
}

async function seed(prisma: PrismaService, visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC') {
  const user = await prisma.user.create({
    data: { email: 'u@test.com', username: 'u', passwordHash: 'h', updatedAt: new Date() },
  })
  const org = await prisma.organization.create({ data: { slug: 'org', name: 'org' } })
  const member = await prisma.orgMember.create({ data: { orgId: org.id, userId: user.id, role: 'OWNER' } })
  const asset = await prisma.asset.create({
    data: { slug: 'test-html', orgId: org.id, visibility },
  })
  const version = await prisma.version.create({
    data: {
      assetId: asset.id,
      number: 1,
      fileType: 'HTML',
      storagePath: 'test/v1.html',
      sizeBytes: 100,
    },
  })
  return { user, org, member, asset, version }
}

async function addVersion(prisma: PrismaService, assetId: string, number: number) {
  return prisma.version.create({
    data: { assetId, number, fileType: 'HTML', storagePath: `test/v${number}.html`, sizeBytes: 100 },
  })
}

const anchor = { anchorType: 'POSITION' as const, xPct: 0.5, yPct: 0.5, selectorHint: '' }

describe('CommentsService', () => {
  let service: CommentsService
  let prisma: PrismaService

  beforeEach(async () => {
    const built = await buildService()
    service = built.service
    prisma = built.prisma
  })

  describe('list', () => {
    it('returns comments on a PUBLIC asset (anonymous)', async () => {
      const { asset, version } = await seed(prisma)
      await prisma.comment.create({ data: { assetId: asset.id, versionId: version.id, body: 'hi', ...anchor } })
      const result = await service.list(asset.id, undefined, undefined)
      expect(result).toHaveLength(1)
    })

    it('throws NotFoundException for PRIVATE asset when anonymous', async () => {
      const { asset } = await seed(prisma, 'PRIVATE')
      await expect(service.list(asset.id, undefined, undefined)).rejects.toThrow(NotFoundException)
    })

    it('returns comments for PRIVATE asset when org member', async () => {
      const { asset, version, user } = await seed(prisma, 'PRIVATE')
      await prisma.comment.create({ data: { assetId: asset.id, versionId: version.id, body: 'member comment', ...anchor } })
      const result = await service.list(asset.id, undefined, user.id)
      expect(result).toHaveLength(1)
    })

    it('filters by sinceVersion when provided', async () => {
      const { asset, version } = await seed(prisma)
      const v2 = await addVersion(prisma, asset.id, 2)
      await prisma.comment.create({ data: { assetId: asset.id, versionId: version.id, body: 'on v1', ...anchor } })
      await prisma.comment.create({ data: { assetId: asset.id, versionId: v2.id, body: 'on v2', ...anchor } })

      const all = await service.list(asset.id, undefined, undefined)
      expect(all).toHaveLength(2)

      const sinceV2 = await service.list(asset.id, undefined, undefined, { sinceVersion: 2 })
      expect(sinceV2).toHaveLength(1)
      expect(sinceV2[0].body).toBe('on v2')
      expect(sinceV2[0].versionNumber).toBe(2)
    })
  })

  describe('create', () => {
    it('creates an anonymous comment on a PUBLIC asset', async () => {
      const { asset, version } = await seed(prisma)
      const result = await service.create(
        asset.id,
        { body: 'anon', anonName: 'Visitor', versionId: version.id, ...anchor },
        undefined,
      )
      expect(result.comment.body).toBe('anon')
      expect(result.comment.versionNumber).toBe(1)
      expect(result.nudge).toBeDefined()
    })

    it('throws NotFoundException for PRIVATE asset when anonymous', async () => {
      const { asset, version } = await seed(prisma, 'PRIVATE')
      await expect(
        service.create(asset.id, { body: 'anon', anonName: 'Visitor', versionId: version.id, ...anchor }, undefined),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when anonName is missing for anonymous user', async () => {
      const { asset, version } = await seed(prisma)
      await expect(
        service.create(asset.id, { body: 'hi', versionId: version.id, ...anchor } as any, undefined),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when versionId is missing for top-level comment', async () => {
      const { asset } = await seed(prisma)
      await expect(
        service.create(asset.id, { body: 'no version', anonName: 'Visitor', ...anchor } as any, undefined),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws NotFoundException when versionId does not belong to the asset', async () => {
      const { asset } = await seed(prisma)
      await expect(
        service.create(asset.id, { body: 'wrong version', anonName: 'Visitor', versionId: 'nonexistent', ...anchor } as any, undefined),
      ).rejects.toThrow(NotFoundException)
    })

    it('creates a threaded reply that inherits the parent version', async () => {
      const { asset, version } = await seed(prisma)
      const parent = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'parent', ...anchor },
      })
      const result = await service.create(
        asset.id,
        { body: 'reply', parentId: parent.id, anonName: 'Anon' } as any,
        undefined,
      )
      expect(result.comment).toBeDefined()
      expect(result.comment.versionNumber).toBe(1)
    })

    it('throws BadRequestException for nested reply beyond depth 1', async () => {
      const { asset, version } = await seed(prisma)
      const parent = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'parent', ...anchor },
      })
      const reply = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'reply', parentId: parent.id, ...anchor },
      })
      await expect(
        service.create(asset.id, { body: 'deep', parentId: reply.id } as any, undefined),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('update', () => {
    it('allows the author to update body', async () => {
      const { asset, version, user } = await seed(prisma)
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'original', authorId: user.id, ...anchor },
      })
      const result = await service.update(comment.id, { body: 'updated' }, user.id)
      expect((result as any).body).toBe('updated')
    })

    it('allows org member to resolve a comment', async () => {
      const { asset, version, user } = await seed(prisma)
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'fix me', ...anchor },
      })
      const result = await service.update(comment.id, { resolved: true }, user.id)
      expect((result as any).resolved).toBe(true)
    })

    it('throws ForbiddenException for non-author non-member trying to update body', async () => {
      const { asset, version } = await seed(prisma)
      const stranger = await prisma.user.create({
        data: { email: 's@test.com', username: 'stranger', passwordHash: 'h', updatedAt: new Date() },
      })
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'original', ...anchor },
      })
      await expect(service.update(comment.id, { body: 'hacked' }, stranger.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('allows the author to delete their comment', async () => {
      const { asset, version, user } = await seed(prisma)
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'mine', authorId: user.id, ...anchor },
      })
      await service.delete(comment.id, user.id)
      const found = await prisma.comment.findUnique({ where: { id: comment.id } })
      expect(found).toBeNull()
    })

    it('allows org member to delete any comment', async () => {
      const { asset, version, user } = await seed(prisma)
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'anon', anonName: 'Bob', ...anchor },
      })
      await service.delete(comment.id, user.id)
      expect(await prisma.comment.findUnique({ where: { id: comment.id } })).toBeNull()
    })

    it('throws ForbiddenException for a stranger', async () => {
      const { asset, version } = await seed(prisma)
      const stranger = await prisma.user.create({
        data: { email: 'x@test.com', username: 'xuser', passwordHash: 'h', updatedAt: new Date() },
      })
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, versionId: version.id, body: 'hi', ...anchor },
      })
      await expect(service.delete(comment.id, stranger.id)).rejects.toThrow(ForbiddenException)
    })
  })
})
