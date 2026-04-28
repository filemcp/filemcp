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
import { EmailService } from '../email/email.service'
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
    private email: EmailService,
  ) {}

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

  async shareLink(
    orgId: string,
    userId: string,
    assetId: string,
    opts: { email: string; mode: 'comments' | 'view'; note?: string },
  ) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: { org: { select: { slug: true } } },
    })
    if (!asset) throw new NotFoundException()
    if (asset.orgId !== orgId) throw new ForbiddenException()

    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000')
    const base = `${appUrl}/u/${asset.org.slug}/${asset.uuid}`
    const assetUrl = opts.mode === 'view' ? `${base}?mode=view` : base

    void this.email.sendAssetShared({
      to: opts.email,
      senderName: sender.username,
      assetTitle: asset.title ?? asset.slug,
      assetUrl,
      note: opts.note,
      viewMode: opts.mode,
    })
  }

  async uploadVersion(
    orgId: string,
    userId: string,
    uuid: string,
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

    const include = { org: { select: { slug: true } } } as const
    type AssetWithOrg = NonNullable<Awaited<ReturnType<typeof this.prisma.asset.findUnique<{ where: { uuid: string }; include: typeof include }>>>>

    let asset: AssetWithOrg

    const existing = await this.prisma.asset.findUnique({ where: { uuid }, include })
    if (existing) {
      if (existing.orgId !== orgId) throw new ForbiddenException()
      asset = existing
    } else {
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

      const ext = FILE_TYPE_EXTENSION[fileType]
      const baseName = file.originalname.replace(/\.[^.]+$/, '')
      const slug = `${slugify(baseName)}-${ext}` || generateSlug()
      asset = await this.prisma.asset.create({
        data: { uuid, orgId, slug, title: dto.title ?? baseName, visibility: dto.visibility },
        include,
      })
    }

    const ext = FILE_TYPE_EXTENSION[fileType]

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

    await this.prisma.asset.update({ where: { id: asset.id }, data: { updatedAt: new Date() } })

    const thumbnailKey = this.storage.assetKey(orgId, asset.id, versionNumber, 'thumbnail.jpg')
    await this.thumbnail.enqueue({
      versionId: version.id,
      contentKey: renderedPath ?? originalKey,
      thumbnailKey,
    })

    const appUrl = this.config.get('APP_URL', 'http://localhost:3000')

    return {
      assetId: asset.id,
      slug: asset.slug,
      uuid: asset.uuid,
      version: version.number,
      url: `${appUrl}/u/${asset.org.slug}/${asset.uuid}`,
      versionUrl: `${appUrl}/u/${asset.org.slug}/${asset.uuid}/v/${version.number}`,
      fileType: version.fileType,
      sizeBytes: version.sizeBytes,
    }
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

    const membership = requestingUserId
      ? await this.prisma.orgMember.findFirst({ where: { orgId: asset.orgId, userId: requestingUserId }, select: { role: true } })
      : null

    const isMember = !!membership
    const isOwner = membership?.role === 'OWNER'

    const updated = isMember
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
        id: targetVersion.id,
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
      isOwner,
      isMember,
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
