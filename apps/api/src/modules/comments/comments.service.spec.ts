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
  return { user, org, member, asset }
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
      const { asset } = await seed(prisma)
      await prisma.comment.create({ data: { assetId: asset.id, body: 'hi', ...anchor } })
      const result = await service.list(asset.id, undefined, undefined)
      expect(result).toHaveLength(1)
    })

    it('throws NotFoundException for PRIVATE asset when anonymous', async () => {
      const { asset } = await seed(prisma, 'PRIVATE')
      await expect(service.list(asset.id, undefined, undefined)).rejects.toThrow(NotFoundException)
    })

    it('returns comments for PRIVATE asset when org member', async () => {
      const { asset, user } = await seed(prisma, 'PRIVATE')
      await prisma.comment.create({ data: { assetId: asset.id, body: 'member comment', ...anchor } })
      const result = await service.list(asset.id, undefined, user.id)
      expect(result).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('creates an anonymous comment on a PUBLIC asset', async () => {
      const { asset } = await seed(prisma)
      const result = await service.create(asset.id, { body: 'anon', anonName: 'Visitor', ...anchor }, undefined)
      expect(result.comment.body).toBe('anon')
      expect(result.nudge).toBeDefined()
    })

    it('throws NotFoundException for PRIVATE asset when anonymous', async () => {
      const { asset } = await seed(prisma, 'PRIVATE')
      await expect(
        service.create(asset.id, { body: 'anon', anonName: 'Visitor', ...anchor }, undefined),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when anonName is missing for anonymous user', async () => {
      const { asset } = await seed(prisma)
      await expect(
        service.create(asset.id, { body: 'hi', ...anchor } as any, undefined),
      ).rejects.toThrow(BadRequestException)
    })

    it('creates a threaded reply', async () => {
      const { asset } = await seed(prisma)
      const parent = await prisma.comment.create({ data: { assetId: asset.id, body: 'parent', ...anchor } })
      const result = await service.create(asset.id, { body: 'reply', parentId: parent.id, anonName: 'Anon' } as any, undefined)
      expect(result.comment).toBeDefined()
    })

    it('throws BadRequestException for nested reply beyond depth 1', async () => {
      const { asset } = await seed(prisma)
      const parent = await prisma.comment.create({ data: { assetId: asset.id, body: 'parent', ...anchor } })
      const reply = await prisma.comment.create({
        data: { assetId: asset.id, body: 'reply', parentId: parent.id, ...anchor },
      })
      await expect(
        service.create(asset.id, { body: 'deep', parentId: reply.id } as any, undefined),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('update', () => {
    it('allows the author to update body', async () => {
      const { asset, user } = await seed(prisma)
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, body: 'original', authorId: user.id, ...anchor },
      })
      const result = await service.update(comment.id, { body: 'updated' }, user.id)
      expect((result as any).body).toBe('updated')
    })

    it('allows org member to resolve a comment', async () => {
      const { asset, user } = await seed(prisma)
      const comment = await prisma.comment.create({ data: { assetId: asset.id, body: 'fix me', ...anchor } })
      const result = await service.update(comment.id, { resolved: true }, user.id)
      expect((result as any).resolved).toBe(true)
    })

    it('throws ForbiddenException for non-author non-member trying to update body', async () => {
      const { asset } = await seed(prisma)
      const stranger = await prisma.user.create({
        data: { email: 's@test.com', username: 'stranger', passwordHash: 'h', updatedAt: new Date() },
      })
      const comment = await prisma.comment.create({ data: { assetId: asset.id, body: 'original', ...anchor } })
      await expect(service.update(comment.id, { body: 'hacked' }, stranger.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('allows the author to delete their comment', async () => {
      const { asset, user } = await seed(prisma)
      const comment = await prisma.comment.create({
        data: { assetId: asset.id, body: 'mine', authorId: user.id, ...anchor },
      })
      await service.delete(comment.id, user.id)
      const found = await prisma.comment.findUnique({ where: { id: comment.id } })
      expect(found).toBeNull()
    })

    it('allows org member to delete any comment', async () => {
      const { asset, user } = await seed(prisma)
      const comment = await prisma.comment.create({ data: { assetId: asset.id, body: 'anon', anonName: 'Bob', ...anchor } })
      await service.delete(comment.id, user.id)
      expect(await prisma.comment.findUnique({ where: { id: comment.id } })).toBeNull()
    })

    it('throws ForbiddenException for a stranger', async () => {
      const { asset } = await seed(prisma)
      const stranger = await prisma.user.create({
        data: { email: 'x@test.com', username: 'xuser', passwordHash: 'h', updatedAt: new Date() },
      })
      const comment = await prisma.comment.create({ data: { assetId: asset.id, body: 'hi', ...anchor } })
      await expect(service.delete(comment.id, stranger.id)).rejects.toThrow(ForbiddenException)
    })
  })
})
