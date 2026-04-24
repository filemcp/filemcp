import { Injectable, NotFoundException } from '@nestjs/common'
import { Visibility } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class VersionsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async list(assetId: string, userId?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    await this.assertVisible(asset, userId)

    const versions = await this.prisma.version.findMany({
      where: { assetId },
      orderBy: { number: 'asc' },
    })
    return versions.map((v) => ({
      id: v.id,
      number: v.number,
      fileType: v.fileType,
      sizeBytes: v.sizeBytes,
      description: v.description,
      thumbnailUrl: v.thumbnailPath ? this.storage.getPublicUrl(v.thumbnailPath) : null,
      createdAt: v.createdAt,
    }))
  }

  async getContent(assetId: string, versionNumber: number, userId?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    await this.assertVisible(asset, userId)

    const version = await this.prisma.version.findUnique({
      where: { assetId_number: { assetId, number: versionNumber } },
    })
    if (!version) throw new NotFoundException()

    const path = version.renderedPath ?? version.storagePath
    return this.storage.getObject(path)
  }

  private async assertVisible(asset: { visibility: Visibility; orgId: string }, userId?: string) {
    if (asset.visibility === Visibility.PRIVATE) {
      if (!userId) throw new NotFoundException()
      const member = await this.prisma.orgMember.findFirst({
        where: { orgId: asset.orgId, userId },
      })
      if (!member) throw new NotFoundException()
    }
  }
}
