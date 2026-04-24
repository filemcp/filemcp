import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { VersionsService } from './versions.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'

const mockStorage = {
  getObject: jest.fn().mockResolvedValue({ data: Buffer.from('content'), contentType: 'text/html' }),
  getPublicUrl: jest.fn().mockImplementation((k: string) => `http://s3/${k}`),
}

async function buildService() {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [VersionsService, { provide: StorageService, useValue: mockStorage }],
  }).compile()
  return { service: module.get(VersionsService), prisma: module.get(PrismaService) }
}

async function seedAsset(prisma: PrismaService, visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC') {
  const user = await prisma.user.create({
    data: { email: 'u@test.com', username: 'u', passwordHash: 'h', updatedAt: new Date() },
  })
  const org = await prisma.organization.create({ data: { slug: 'org', name: 'org' } })
  await prisma.orgMember.create({ data: { orgId: org.id, userId: user.id, role: 'OWNER' } })
  const asset = await prisma.asset.create({ data: { slug: 'test-html', orgId: org.id, visibility } })
  const version = await prisma.version.create({
    data: { assetId: asset.id, number: 1, fileType: 'HTML', storagePath: 'assets/org/asset/v1/original.html', sizeBytes: 100 },
  })
  return { user, org, asset, version }
}

describe('VersionsService', () => {
  let service: VersionsService
  let prisma: PrismaService

  beforeEach(async () => {
    const built = await buildService()
    service = built.service
    prisma = built.prisma
  })

  describe('list', () => {
    it('returns versions for a PUBLIC asset (anonymous)', async () => {
      const { asset } = await seedAsset(prisma)
      const result = await service.list(asset.id, undefined)
      expect(result).toHaveLength(1)
      expect(result[0].number).toBe(1)
    })

    it('throws NotFoundException for a PRIVATE asset when anonymous', async () => {
      const { asset } = await seedAsset(prisma, 'PRIVATE')
      await expect(service.list(asset.id, undefined)).rejects.toThrow(NotFoundException)
    })

    it('returns versions for a PRIVATE asset when org member', async () => {
      const { asset, user } = await seedAsset(prisma, 'PRIVATE')
      const result = await service.list(asset.id, user.id)
      expect(result).toHaveLength(1)
    })
  })

  describe('getContent', () => {
    it('returns content for a PUBLIC asset (anonymous)', async () => {
      const { asset, version } = await seedAsset(prisma)
      const result = await service.getContent(asset.id, version.number, undefined)
      expect(result.data).toBeDefined()
    })

    it('throws NotFoundException for a PRIVATE asset when anonymous', async () => {
      const { asset, version } = await seedAsset(prisma, 'PRIVATE')
      await expect(service.getContent(asset.id, version.number, undefined)).rejects.toThrow(NotFoundException)
    })
  })
})
