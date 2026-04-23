import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class VersionsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async list(assetId: string) {
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

  async getContent(assetId: string, versionNumber: number) {
    const version = await this.prisma.version.findUnique({
      where: { assetId_number: { assetId, number: versionNumber } },
    })
    if (!version) throw new NotFoundException()

    const path = version.renderedPath ?? version.storagePath
    return this.storage.getObject(path)
  }
}
