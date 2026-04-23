import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { FileType, Visibility } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { RenderService } from '../render/render.service'
import { UploadAssetDto } from './dto/upload-asset.dto'
import { UpdateAssetDto } from './dto/update-asset.dto'
import { generateSlug } from '../../utils/slug'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'text/html': FileType.HTML,
  'text/markdown': FileType.MARKDOWN,
  'text/x-markdown': FileType.MARKDOWN,
  'application/json': FileType.JSON,
  'text/plain': FileType.TEXT,
  'text/css': FileType.CSS,
  'text/javascript': FileType.JS,
  'application/javascript': FileType.JS,
  'image/svg+xml': FileType.SVG,
}

const FILE_TYPE_EXTENSION: Record<FileType, string> = {
  HTML: 'html',
  MARKDOWN: 'md',
  JSON: 'json',
  TEXT: 'txt',
  CSS: 'css',
  JS: 'js',
  TS: 'ts',
  SVG: 'svg',
}

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private render: RenderService,
  ) {}

  async upload(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    dto: UploadAssetDto,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('File exceeds 10MB limit')
    }

    const fileType = MIME_TO_FILE_TYPE[file.mimetype]
    if (!fileType) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`)
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const slug = dto.slug ?? generateSlug()

    const asset = await this.prisma.asset.upsert({
      where: { ownerId_slug: { ownerId: userId, slug } },
      create: { ownerId: userId, slug, title: dto.title ?? slug, visibility: dto.visibility },
      update: { updatedAt: new Date() },
    })

    const lastVersion = await this.prisma.version.findFirst({
      where: { assetId: asset.id },
      orderBy: { number: 'desc' },
    })
    const versionNumber = (lastVersion?.number ?? 0) + 1

    const ext = FILE_TYPE_EXTENSION[fileType]
    const originalKey = this.storage.assetKey(userId, asset.id, versionNumber, `original.${ext}`)
    await this.storage.upload(originalKey, file.buffer, file.mimetype)

    let renderedPath: string | undefined
    if (fileType === FileType.MARKDOWN) {
      const html = await this.render.markdownToHtml(file.buffer.toString('utf8'))
      const renderedKey = this.storage.assetKey(userId, asset.id, versionNumber, 'rendered.html')
      await this.storage.upload(renderedKey, Buffer.from(html), 'text/html')
      renderedPath = renderedKey
    }

    const version = await this.prisma.version.create({
      data: {
        assetId: asset.id,
        number: versionNumber,
        fileType,
        storagePath: originalKey,
        sizeBytes: file.size,
        description: dto.description,
        renderedPath,
      },
    })

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

    return {
      assetId: asset.id,
      slug: asset.slug,
      version: version.number,
      url: `${appUrl}/u/${user.username}/${asset.slug}`,
      versionUrl: `${appUrl}/u/${user.username}/${asset.slug}/v/${version.number}`,
      fileType: version.fileType,
      sizeBytes: version.sizeBytes,
    }
  }

  async listOwned(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: { select: { username: true } },
          versions: { orderBy: { number: 'desc' }, take: 1 },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.asset.count({ where: { ownerId: userId } }),
    ])

    return {
      items: items.map((a) => this.formatAssetSummary(a)),
      total,
      page,
      limit,
    }
  }

  async getById(assetId: string, requestingUserId?: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        owner: { select: { username: true } },
        versions: { orderBy: { number: 'asc' } },
        _count: { select: { comments: true } },
      },
    })

    if (!asset) throw new NotFoundException()
    this.assertVisible(asset, requestingUserId)

    return {
      id: asset.id,
      slug: asset.slug,
      title: asset.title,
      visibility: asset.visibility,
      owner: asset.owner,
      versions: asset.versions.map((v) => ({
        number: v.number,
        createdAt: v.createdAt,
        sizeBytes: v.sizeBytes,
        thumbnailUrl: v.thumbnailPath ? this.storage.getPublicUrl(v.thumbnailPath) : null,
      })),
      commentCount: asset._count.comments,
    }
  }

  async update(userId: string, assetId: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    if (asset.ownerId !== userId) throw new ForbiddenException()

    return this.prisma.asset.update({ where: { id: assetId }, data: dto })
  }

  async delete(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    if (asset.ownerId !== userId) throw new ForbiddenException()

    await this.storage.deleteFolder(`assets/${userId}/${assetId}/`)
    await this.prisma.asset.delete({ where: { id: assetId } })
  }

  async resolvePublic(username: string, slug: string, versionNumber?: number, requestingUserId?: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { owner: { username }, slug },
      include: {
        owner: { select: { id: true, username: true } },
        versions: { orderBy: { number: 'desc' } },
        _count: { select: { comments: true } },
      },
    })

    if (!asset) throw new NotFoundException()
    this.assertVisible(asset, requestingUserId)

    const targetVersion = versionNumber
      ? asset.versions.find((v) => v.number === versionNumber)
      : asset.versions[0]

    if (!targetVersion) throw new NotFoundException()

    const contentPath = targetVersion.renderedPath ?? targetVersion.storagePath
    const contentUrl = await this.storage.getPresignedUrl(contentPath, 3600)

    return {
      assetId: asset.id,
      slug: asset.slug,
      title: asset.title ?? asset.slug,
      owner: { username: asset.owner.username },
      latestVersion: asset.versions[0]?.number ?? 1,
      currentVersion: {
        number: targetVersion.number,
        fileType: targetVersion.fileType,
        contentUrl,
        thumbnailUrl: targetVersion.thumbnailPath
          ? this.storage.getPublicUrl(targetVersion.thumbnailPath)
          : null,
      },
      commentCount: asset._count.comments,
      visibility: asset.visibility,
      isOwner: requestingUserId === asset.owner.id,
    }
  }

  private assertVisible(asset: { visibility: Visibility; ownerId: string }, userId?: string) {
    if (asset.visibility === Visibility.PRIVATE && asset.ownerId !== userId) {
      throw new NotFoundException()
    }
  }

  private formatAssetSummary(asset: any) {
    const latest = asset.versions[0]
    return {
      id: asset.id,
      slug: asset.slug,
      title: asset.title ?? asset.slug,
      visibility: asset.visibility,
      latestVersion: latest?.number ?? 0,
      commentCount: asset._count.comments,
      thumbnailUrl: latest?.thumbnailPath ? this.storage.getPublicUrl(latest.thumbnailPath) : null,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      owner: asset.owner,
    }
  }
}
