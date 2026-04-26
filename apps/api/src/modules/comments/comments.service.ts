import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { Visibility } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async list(
    assetId: string,
    resolved?: boolean,
    userId?: string,
    opts?: { versionId?: string; sinceVersion?: number },
  ) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    await this.assertVisible(asset, userId)

    const where: any = { assetId, parentId: null }
    if (resolved !== undefined) where.resolved = resolved
    if (opts?.versionId) where.versionId = opts.versionId
    if (opts?.sinceVersion !== undefined) {
      where.version = { number: { gte: opts.sinceVersion } }
    }

    const comments = await this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { username: true } },
        version: { select: { number: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { username: true } },
            version: { select: { number: true } },
          },
        },
      },
    })

    return comments.map(this.format)
  }

  async create(assetId: string, dto: CreateCommentDto, userId?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()
    await this.assertVisible(asset, userId)

    if (!userId && !dto.anonName) {
      throw new BadRequestException('anonName is required for anonymous comments')
    }

    let versionId: string
    let parentId: string | undefined

    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, assetId },
      })
      if (!parent) throw new NotFoundException('Parent comment not found')
      if (parent.parentId) throw new BadRequestException('Replies cannot be nested more than one level')
      // Replies inherit the parent's version so the conversation stays anchored to one revision
      versionId = (parent as any).versionId
      parentId = dto.parentId
    } else {
      if (!dto.versionId) {
        throw new BadRequestException('versionId is required for top-level comments')
      }
      const version = await this.prisma.version.findFirst({
        where: { id: dto.versionId, assetId },
      })
      if (!version) throw new NotFoundException('Version not found for this asset')
      versionId = version.id
    }

    const comment = await this.prisma.comment.create({
      data: {
        assetId,
        versionId,
        body: dto.body,
        anchorType: parentId ? 'POSITION' : (dto.anchorType ?? 'POSITION'),
        xPct: parentId ? null : dto.xPct,
        yPct: parentId ? null : dto.yPct,
        selectorHint: parentId ? null : dto.selectorHint,
        lineStart: parentId ? null : dto.lineStart,
        lineEnd: parentId ? null : dto.lineEnd,
        parentId,
        authorId: userId ?? null,
        anonName: userId ? null : dto.anonName,
        anonEmail: userId ? null : dto.anonEmail,
      } as any,
      include: {
        author: { select: { username: true } },
        version: { select: { number: true } },
        replies: {
          include: {
            author: { select: { username: true } },
            version: { select: { number: true } },
          },
        },
      },
    })

    const result: any = { comment: this.format(comment) }

    if (!userId) {
      const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
      const prefill = dto.anonEmail ? `?prefill_email=${encodeURIComponent(dto.anonEmail)}` : ''
      result.nudge = {
        message: 'Save your comments and get notified on replies.',
        signupUrl: `${appUrl}/register${prefill}`,
      }
    }

    return result
  }

  async update(commentId: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { asset: true },
    })
    if (!comment) throw new NotFoundException()

    const isAuthor = comment.authorId === userId
    const isOrgMember = !!(await this.prisma.orgMember.findFirst({
      where: { userId, orgId: comment.asset.orgId },
    }))

    if (dto.body !== undefined && !isAuthor) throw new ForbiddenException()
    if (dto.resolved !== undefined && !isAuthor && !isOrgMember) throw new ForbiddenException()

    return this.prisma.comment.update({
      where: { id: commentId },
      data: dto,
      include: {
        author: { select: { username: true } },
        replies: { include: { author: { select: { username: true } } } },
      },
    })
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { asset: true },
    })
    if (!comment) throw new NotFoundException()

    const isAuthor = comment.authorId === userId
    const isOrgMember = !!(await this.prisma.orgMember.findFirst({
      where: { userId, orgId: comment.asset.orgId },
    }))
    if (!isAuthor && !isOrgMember) throw new ForbiddenException()

    await this.prisma.comment.delete({ where: { id: commentId } })
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

  private format(comment: any) {
    return {
      id: comment.id,
      body: comment.body,
      anchorType: comment.anchorType,
      xPct: comment.xPct,
      yPct: comment.yPct,
      selectorHint: comment.selectorHint,
      lineStart: comment.lineStart,
      lineEnd: comment.lineEnd,
      resolved: comment.resolved,
      author: comment.author ?? null,
      anonName: comment.anonName ?? null,
      versionId: comment.versionId,
      versionNumber: comment.version?.number ?? null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: (comment.replies ?? []).map((r: any) => ({
        id: r.id,
        body: r.body,
        author: r.author ?? null,
        anonName: r.anonName ?? null,
        versionId: r.versionId,
        versionNumber: r.version?.number ?? null,
        createdAt: r.createdAt,
      })),
    }
  }
}
