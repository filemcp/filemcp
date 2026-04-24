import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OrgsService } from './orgs.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { PrismaService } from '../../prisma/prisma.service'

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [OrgsService],
  }).compile()
  return { service: module.get(OrgsService), prisma: module.get(PrismaService) }
}

async function seedUser(prisma: PrismaService, suffix = '') {
  return prisma.user.create({
    data: { email: `user${suffix}@test.com`, username: `user${suffix}`, passwordHash: 'h', updatedAt: new Date() },
  })
}

describe('OrgsService', () => {
  let service: OrgsService
  let prisma: PrismaService

  beforeEach(async () => {
    const built = await buildService()
    service = built.service
    prisma = built.prisma
  })

  describe('create', () => {
    it('creates org and OWNER membership', async () => {
      const user = await seedUser(prisma)
      const result = await service.create(user.id, { slug: 'myorg', name: 'My Org' })
      expect(result.slug).toBe('myorg')
      const member = await prisma.orgMember.findFirst({ where: { userId: user.id } })
      expect(member?.role).toBe('OWNER')
    })

    it('throws ConflictException on slug collision', async () => {
      const user = await seedUser(prisma)
      await service.create(user.id, { slug: 'dup', name: 'Dup' })
      const user2 = await seedUser(prisma, '2')
      await expect(service.create(user2.id, { slug: 'dup', name: 'Dup2' })).rejects.toThrow(ConflictException)
    })
  })

  describe('listForUser', () => {
    it('returns orgs the user belongs to', async () => {
      const user = await seedUser(prisma)
      await service.create(user.id, { slug: 'org1', name: 'Org 1' })
      const result = await service.listForUser(user.id)
      expect(result).toHaveLength(1)
      expect(result[0].org.slug).toBe('org1')
    })
  })

  describe('inviteMember', () => {
    it('adds a member with the given role', async () => {
      const owner = await seedUser(prisma, 'owner')
      await service.create(owner.id, { slug: 'myorg', name: 'My Org' })
      const invitee = await seedUser(prisma, 'invitee')
      const result = await service.inviteMember(owner.id, 'myorg', { usernameOrEmail: 'userinvitee', role: 'READ' as any })
      expect(result.role).toBe('READ')
    })

    it('throws NotFoundException for unknown invitee', async () => {
      const owner = await seedUser(prisma)
      await service.create(owner.id, { slug: 'myorg', name: 'My Org' })
      await expect(
        service.inviteMember(owner.id, 'myorg', { usernameOrEmail: 'nobody', role: 'READ' as any }),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when invitee is already a member', async () => {
      const owner = await seedUser(prisma, 'a')
      await service.create(owner.id, { slug: 'myorg', name: 'My Org' })
      const invitee = await seedUser(prisma, 'b')
      await service.inviteMember(owner.id, 'myorg', { usernameOrEmail: 'userb', role: 'READ' as any })
      await expect(
        service.inviteMember(owner.id, 'myorg', { usernameOrEmail: 'userb', role: 'WRITE' as any }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('removeMember', () => {
    it('removes a member', async () => {
      const owner = await seedUser(prisma, 'x')
      await service.create(owner.id, { slug: 'myorg', name: 'My Org' })
      const invitee = await seedUser(prisma, 'y')
      await service.inviteMember(owner.id, 'myorg', { usernameOrEmail: 'usery', role: 'READ' as any })
      await service.removeMember(owner.id, 'myorg', invitee.id)
      const member = await prisma.orgMember.findFirst({ where: { userId: invitee.id } })
      expect(member).toBeNull()
    })

    it('throws BadRequestException when trying to remove self', async () => {
      const owner = await seedUser(prisma)
      await service.create(owner.id, { slug: 'myorg', name: 'My Org' })
      await expect(service.removeMember(owner.id, 'myorg', owner.id)).rejects.toThrow(BadRequestException)
    })
  })

  describe('createKey', () => {
    it('returns a raw key starting with filemcp_', async () => {
      const user = await seedUser(prisma)
      await service.create(user.id, { slug: 'myorg', name: 'My Org' })
      const result = await service.createKey(user.id, 'myorg', 'my-key')
      expect(result.key).toMatch(/^filemcp_/)
    })
  })

  describe('revokeKey', () => {
    it('sets revokedAt on the key', async () => {
      const user = await seedUser(prisma)
      await service.create(user.id, { slug: 'myorg', name: 'My Org' })
      const { id } = await service.createKey(user.id, 'myorg', 'test-key')
      await service.revokeKey(user.id, 'myorg', id)
      const key = await prisma.apiKey.findUnique({ where: { id } })
      expect(key?.revokedAt).not.toBeNull()
    })
  })
})
