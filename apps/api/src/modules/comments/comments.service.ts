import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async list(assetId: string, resolved?: boolean) {
    const where: any = { assetId, parentId: null }
    if (resolved !== undefined) where.resolved = resolved

    const comments = await this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { username: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { username: true } } },
        },
      },
    })

    return comments.map(this.format)
  }

  async create(assetId: string, dto: CreateCommentDto, userId?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) throw new NotFoundException()

    if (!userId && !dto.anonName) {
      throw new BadRequestException('anonName is required for anonymous comments')
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, assetId },
      })
      if (!parent) throw new NotFoundException('Parent comment not found')
      if (parent.parentId) throw new BadRequestException('Replies cannot be nested more than one level')
    }

    const comment = await this.prisma.comment.create({
      data: {
        assetId,
        body: dto.body,
        anchorType: dto.parentId ? 'POSITION' : (dto.anchorType ?? 'POSITION'),
        xPct: dto.parentId ? null : dto.xPct,
        yPct: dto.parentId ? null : dto.yPct,
        selectorHint: dto.parentId ? null : dto.selectorHint,
        lineStart: dto.parentId ? null : dto.lineStart,
        lineEnd: dto.parentId ? null : dto.lineEnd,
        parentId: dto.parentId,
        authorId: userId ?? null,
        anonName: userId ? null : dto.anonName,
        anonEmail: userId ? null : dto.anonEmail,
      },
      include: {
        author: { select: { username: true } },
        replies: { include: { author: { select: { username: true } } } },
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
    const isOwner = comment.asset.ownerId === userId

    if (dto.body !== undefined && !isAuthor) throw new ForbiddenException()
    if (dto.resolved !== undefined && !isAuthor && !isOwner) throw new ForbiddenException()

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
    const isOwner = comment.asset.ownerId === userId
    if (!isAuthor && !isOwner) throw new ForbiddenException()

    await this.prisma.comment.delete({ where: { id: commentId } })
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
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: (comment.replies ?? []).map((r: any) => ({
        id: r.id,
        body: r.body,
        author: r.author ?? null,
        anonName: r.anonName ?? null,
        createdAt: r.createdAt,
      })),
    }
  }
}
