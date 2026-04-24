import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FileType, Visibility } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { RenderService } from '../render/render.service'
import { ThumbnailService } from '../thumbnail/thumbnail.service'
import { UploadAssetDto } from './dto/upload-asset.dto'
import { UpdateAssetDto } from './dto/update-asset.dto'
import { generateSlug, slugify } from '../../utils/slug'

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
    private thumbnail: ThumbnailService,
    private config: ConfigService,
  ) {}

  async upload(
    orgId: string,
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    dto: UploadAssetDto,
    options?: { maxBytes?: number },
  ) {
    const maxBytes = options?.maxBytes ?? DEFAULT_MAX_FILE_SIZE
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024))
      throw new PayloadTooLargeException(`File exceeds ${mb}MB limit`)
    }

    const fileType = MIME_TO_FILE_TYPE[file.mimetype]
    if (!fileType) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`)
    }

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } })
    const ext = FILE_TYPE_EXTENSION[fileType]
    const baseName = file.originalname.replace(/\.[^.]+$/, '')
    const slug = `${slugify(baseName)}-${ext}` || generateSlug()

    // Enforce org asset limit
    const existingAsset = await this.prisma.asset.findUnique({ where: { orgId_slug: { orgId, slug } } })
    if (!existingAsset) {
      const [assetCount, memberCount] = await Promise.all([
        this.prisma.asset.count({ where: { orgId } }),
        this.prisma.orgMember.count({ where: { orgId } }),
      ])
      const baseLimit = parseInt(this.config.get('ORG_ASSET_LIMIT', '10'), 10)
      const perMember = parseInt(this.config.get('ORG_ASSET_LIMIT_PER_MEMBER', '5'), 10)
      const limit = baseLimit + Math.max(0, memberCount - 1) * perMember
      if (assetCount >= limit) {
        throw new ForbiddenException(
          `Asset limit reached (${limit}). Invite more members to unlock additional assets (+${perMember} per member).`,
        )
      }
    }

    const asset = await this.prisma.asset.upsert({
      where: { orgId_slug: { orgId, slug } },
      create: { orgId, slug, title: dto.title ?? file.originalname.replace(/\.[^.]+$/, ''), visibility: dto.visibility },
      update: { updatedAt: new Date() },
    })

    const lastVersion = await this.prisma.version.findFirst({
      where: { assetId: asset.id },
      orderBy: { number: 'desc' },
    })
    const versionNumber = (lastVersion?.number ?? 0) + 1

    const originalKey = this.storage.assetKey(orgId, asset.id, versionNumber, `original.${ext}`)
    await this.storage.upload(originalKey, file.buffer, file.mimetype)

    let renderedPath: string | undefined
    if (fileType === FileType.MARKDOWN) {
      const html = await this.render.markdownToHtml(file.buffer.toString('utf8'))
      const renderedKey = this.storage.assetKey(orgId, asset.id, versionNumber, 'rendered.html')
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

    const thumbnailKey = this.storage.assetKey(orgId, asset.id, versionNumber, 'thumbnail.jpg')
    await this.thumbnail.enqueue({
      versionId: version.id,
      contentKey: renderedPath ?? originalKey,
      thumbnailKey,
    })

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

    return {
      assetId: asset.id,
      slug: asset.slug,
      uuid: asset.uuid,
      version: version.number,
      url: `${appUrl}/u/${org.slug}/${asset.uuid}`,
      versionUrl: `${appUrl}/u/${org.slug}/${asset.uuid}/v/${version.number}`,
      fileType: version.fileType,
      sizeBytes: version.sizeBytes,
    }
  }

  async listByOrg(orgId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: { orgId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          org: { select: { slug: true } },
          versions: { orderBy: { number: 'desc' }, take: 1 },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.asset.count({ where: { orgId } }),
    ])

    return {
      items: items.map((a) => this.formatAssetSummary(a)),
      total,
      page,
      limit,
    }
  }

  async getById(assetId: string, orgId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        org: { select: { slug: true } },
        versions: { orderBy: { number: 'asc' } },
        _count: { select: { comments: true } },
      },
    })

    if (!asset) throw new NotFoundException()
    if (asset.orgId !== orgId) throw new ForbiddenException()

    return {
      id: asset.id,
      uuid: asset.uuid,
      slug: asset.slug,
      title: asset.title,
      visibility: asset.visibility,
      owner: { org: asset.org.slug },
      versions: asset.versions.map((v) => ({
        number: v.number,
        createdAt: v.createdAt,
        sizeBytes: v.sizeBytes,
        thumbnailUrl: v.thumbnailPath ? this.storage.getPublicUrl(v.thumbnailPath) : null,
      })),
      commentCount: asset._count.comments,
    }
  }

  async update(orgId: string, assetId: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    if (asset.orgId !== orgId) throw new ForbiddenException()

    return this.prisma.asset.update({ where: { id: assetId }, data: dto })
  }

  async delete(orgId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    if (asset.orgId !== orgId) throw new ForbiddenException()

    await this.storage.deleteFolder(`assets/${orgId}/${assetId}/`)
    await this.prisma.asset.delete({ where: { id: assetId } })
  }

  async resolvePublic(orgSlug: string, uuid: string, versionNumber?: number, requestingUserId?: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { uuid },
      include: {
        org: { select: { id: true, slug: true } },
        versions: { orderBy: { number: 'desc' } },
        _count: { select: { comments: true } },
      },
    })

    if (!asset || asset.org.slug !== orgSlug) throw new NotFoundException()
    await this.assertVisible(asset, requestingUserId)

    const targetVersion = versionNumber
      ? asset.versions.find((v) => v.number === versionNumber)
      : asset.versions[0]

    if (!targetVersion) throw new NotFoundException()

    const contentUrl = versionNumber
      ? `/api/public/${orgSlug}/${uuid}/v/${versionNumber}/content`
      : `/api/public/${orgSlug}/${uuid}/content`

    const isOwnerMember = requestingUserId
      ? await this.prisma.orgMember.findFirst({ where: { orgId: asset.orgId, userId: requestingUserId } }).then(Boolean)
      : false

    const updated = isOwnerMember
      ? await this.prisma.asset.findUnique({ where: { id: asset.id }, select: { viewCount: true } }) ?? { viewCount: asset.viewCount }
      : await this.prisma.asset.update({
          where: { id: asset.id },
          data: { viewCount: { increment: 1 } },
          select: { viewCount: true },
        })

    return {
      assetId: asset.id,
      uuid: asset.uuid,
      slug: asset.slug,
      title: asset.title ?? asset.slug,
      owner: { org: asset.org.slug },
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
      viewCount: updated.viewCount,
      visibility: asset.visibility,
      isOwner: isOwnerMember,
    }
  }

  async streamContent(orgSlug: string, uuid: string, versionNumber?: number, requestingUserId?: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { uuid },
      include: {
        org: { select: { slug: true } },
        versions: { orderBy: { number: 'desc' } },
      },
    })

    if (!asset || asset.org.slug !== orgSlug) throw new NotFoundException()
    await this.assertVisible(asset, requestingUserId)

    const targetVersion = versionNumber
      ? asset.versions.find((v) => v.number === versionNumber)
      : asset.versions[0]

    if (!targetVersion) throw new NotFoundException()

    return this.storage.getObject(targetVersion.renderedPath ?? targetVersion.storagePath)
  }

  private async assertVisible(
    asset: { visibility: Visibility; orgId: string },
    userId?: string,
  ) {
    if (asset.visibility === Visibility.PRIVATE) {
      if (!userId) throw new NotFoundException()
      const member = await this.prisma.orgMember.findFirst({
        where: { orgId: asset.orgId, userId },
      })
      if (!member) throw new NotFoundException()
    }
  }

  private formatAssetSummary(asset: any) {
    const latest = asset.versions[0]
    return {
      id: asset.id,
      uuid: asset.uuid,
      slug: asset.slug,
      title: asset.title ?? asset.slug,
      visibility: asset.visibility,
      latestVersion: latest?.number ?? 0,
      commentCount: asset._count.comments,
      viewCount: asset.viewCount,
      thumbnailUrl: latest?.thumbnailPath ? this.storage.getPublicUrl(latest.thumbnailPath) : null,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      owner: { org: asset.org.slug },
    }
  }
}
