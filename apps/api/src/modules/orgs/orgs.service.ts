import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import { OrgRole } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateOrgDto } from './dto/create-org.dto'
import { InviteMemberDto } from './dto/invite-member.dto'

@Injectable()
export class OrgsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateOrgDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Org slug already taken')

    const org = await this.prisma.organization.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        members: { create: { userId, role: 'OWNER' } },
      },
    })
    return { id: org.id, slug: org.slug, name: org.name }
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { org: { include: { _count: { select: { assets: true, members: true } } } } },
      orderBy: { createdAt: 'asc' },
    })
    return memberships.map((m) => ({
      org: { id: m.org.id, slug: m.org.slug, name: m.org.name },
      role: m.role,
      assetCount: m.org._count.assets,
      memberCount: m.org._count.members,
    }))
  }

  async getDetail(userId: string, orgSlug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        members: { include: { user: { select: { id: true, username: true, email: true } } } },
        _count: { select: { assets: true } },
      },
    })
    if (!org) throw new NotFoundException()

    const requester = org.members.find((m) => m.userId === userId)
    if (!requester) throw new ForbiddenException()

    const baseLimit = parseInt(this.config.get('ORG_ASSET_LIMIT', '10'), 10)
    const perMember = parseInt(this.config.get('ORG_ASSET_LIMIT_PER_MEMBER', '5'), 10)
    const memberCount = org.members.length
    const assetLimit = baseLimit + Math.max(0, memberCount - 1) * perMember

    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      description: org.description,
      members: org.members.map((m) => ({
        id: m.id,
        user: m.user,
        role: m.role,
        joinedAt: m.createdAt,
      })),
      assetCount: org._count.assets,
      assetLimit,
      assetLimitBase: baseLimit,
      assetLimitPerMember: perMember,
    }
  }

  async inviteMember(requesterId: string, orgSlug: string, dto: InviteMemberDto) {
    await this.requireRole(requesterId, orgSlug, OrgRole.OWNER)

    const target = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }] },
    })
    if (!target) throw new NotFoundException('User not found')

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { slug: orgSlug } })

    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: target.id } },
    })
    if (existing) throw new ConflictException('User is already a member')

    const member = await this.prisma.orgMember.create({
      data: { orgId: org.id, userId: target.id, role: dto.role },
    })
    return { id: member.id, userId: target.id, username: target.username, role: member.role }
  }

  async updateMemberRole(requesterId: string, orgSlug: string, targetUserId: string, role: OrgRole) {
    await this.requireRole(requesterId, orgSlug, OrgRole.OWNER)

    if (requesterId === targetUserId) throw new BadRequestException('Cannot change your own role')

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { slug: orgSlug } })
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
    })
    if (!member) throw new NotFoundException('Member not found')

    await this.prisma.orgMember.update({ where: { id: member.id }, data: { role } })
  }

  async removeMember(requesterId: string, orgSlug: string, targetUserId: string) {
    await this.requireRole(requesterId, orgSlug, OrgRole.OWNER)

    if (requesterId === targetUserId) throw new BadRequestException('Cannot remove yourself')

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { slug: orgSlug } })
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
    })
    if (!member) throw new NotFoundException('Member not found')

    await this.prisma.orgMember.delete({ where: { id: member.id } })
  }

  // --- API Key management ---

  async createKey(userId: string, orgSlug: string, name: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug } })
    if (!org) throw new NotFoundException()

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    })
    if (!member) throw new ForbiddenException()

    const rawKey = `cdnmcp_${randomBytes(24).toString('hex')}`
    const keyHash = await bcrypt.hash(rawKey, 12)
    const record = await this.prisma.apiKey.create({
      data: { memberId: member.id, name, keyHash, keyPrefix: rawKey.slice(0, 16), lastFourChars: rawKey.slice(-4) },
    })
    return { id: record.id, name: record.name, lastFourChars: record.lastFourChars, key: rawKey }
  }

  async listKeys(userId: string, orgSlug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug } })
    if (!org) throw new NotFoundException()

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    })
    if (!member) throw new ForbiddenException()

    return this.prisma.apiKey.findMany({
      where: { memberId: member.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, lastFourChars: true, lastUsedAt: true, createdAt: true },
    })
  }

  async revokeKey(userId: string, orgSlug: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      include: { member: { include: { org: true } } },
    })
    if (!key || key.revokedAt) throw new NotFoundException()
    if (key.member.userId !== userId || key.member.org.slug !== orgSlug) throw new ForbiddenException()

    await this.prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } })
  }

  private async requireRole(userId: string, orgSlug: string, minRole: OrgRole) {
    const member = await this.prisma.orgMember.findFirst({
      where: { userId, org: { slug: orgSlug } },
    })
    if (!member) throw new ForbiddenException()

    const levels: Record<OrgRole, number> = { OWNER: 3, WRITE: 2, READ: 1 }
    if ((levels[member.role] ?? 0) < levels[minRole]) throw new ForbiddenException('Insufficient role')
  }
}
