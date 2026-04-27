import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OrgRole, InvitationStatus } from '@prisma/client'
import * as crypto from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'

const INVITATION_TTL_HOURS = 72

const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: 'owner',
  WRITE: 'collaborator',
  READ: 'reader',
}

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  // --- Owner endpoints ---

  async create(requesterId: string, orgSlug: string, dto: CreateInvitationDto) {
    const org = await this.requireOwnerAccess(requesterId, orgSlug)
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: requesterId } })

    const normalizedEmail = dto.email.toLowerCase().trim()

    // If a user with this email is already a member, no point inviting
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      const alreadyMember = await this.prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: existingUser.id } },
      })
      if (alreadyMember) throw new ConflictException('User is already a member of this org')
    }

    // Revoke any outstanding pending invitations for this email+org so we don't accumulate dupes
    await this.prisma.invitation.updateMany({
      where: { orgId: org.id, email: normalizedEmail, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000)

    const invitation = await this.prisma.invitation.create({
      data: {
        tokenHash,
        email: normalizedEmail,
        role: dto.role,
        orgId: org.id,
        invitedById: requesterId,
        expiresAt,
      },
    })

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000')
    void this.email.sendInvitation({
      to: normalizedEmail,
      orgName: org.name,
      inviterName: inviter.username,
      roleLabel: ROLE_LABELS[dto.role],
      inviteUrl: `${appUrl}/invite/${rawToken}`,
    })

    return this.formatForOwner(invitation)
  }

  async listForOrg(requesterId: string, orgSlug: string) {
    const org = await this.requireOwnerAccess(requesterId, orgSlug)
    const invitations = await this.prisma.invitation.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' },
    })
    return invitations.map((inv) => ({
      ...this.formatForOwner(inv),
      // Refresh expired-but-still-marked-pending in the response (lazy expiry)
      status:
        inv.status === InvitationStatus.PENDING && inv.expiresAt < new Date()
          ? InvitationStatus.EXPIRED
          : inv.status,
    }))
  }

  async revoke(requesterId: string, orgSlug: string, invitationId: string) {
    const org = await this.requireOwnerAccess(requesterId, orgSlug)
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } })
    if (!invitation || invitation.orgId !== org.id) throw new NotFoundException()
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer pending')
    }
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    })
  }

  // --- Public + invitee endpoints ---

  // Preview: anyone with the link can see who invited them. No auth required.
  async preview(rawToken: string) {
    const invitation = await this.findByToken(rawToken)
    if (!invitation) throw new NotFoundException('Invitation not found')

    const effectiveStatus = this.effectiveStatus(invitation)

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      roleLabel: ROLE_LABELS[invitation.role],
      status: effectiveStatus,
      expiresAt: invitation.expiresAt,
      org: { slug: invitation.org.slug, name: invitation.org.name },
      invitedBy: { username: invitation.invitedBy.username },
    }
  }

  async accept(rawToken: string, userId: string) {
    const invitation = await this.findByToken(rawToken)
    if (!invitation) throw new NotFoundException('Invitation not found')
    this.assertActionable(invitation)

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address. Sign in with that account to accept.',
      )
    }

    // Avoid double-add if somehow already a member
    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: invitation.orgId, userId: user.id } },
    })

    await this.prisma.$transaction([
      ...(existing
        ? []
        : [
            this.prisma.orgMember.create({
              data: { orgId: invitation.orgId, userId: user.id, role: invitation.role },
            }),
          ]),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ])

    return { orgSlug: invitation.org.slug, role: invitation.role }
  }

  async decline(rawToken: string) {
    const invitation = await this.findByToken(rawToken)
    if (!invitation) throw new NotFoundException('Invitation not found')
    this.assertActionable(invitation)
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.DECLINED, declinedAt: new Date() },
    })
  }

  // --- Helpers ---

  private async findByToken(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    return this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { org: true, invitedBy: true },
    })
  }

  private effectiveStatus(invitation: { status: InvitationStatus; expiresAt: Date }) {
    if (invitation.status === InvitationStatus.PENDING && invitation.expiresAt < new Date()) {
      return InvitationStatus.EXPIRED
    }
    return invitation.status
  }

  private assertActionable(invitation: { status: InvitationStatus; expiresAt: Date }) {
    const status = this.effectiveStatus(invitation)
    if (status !== InvitationStatus.PENDING) {
      const message =
        status === InvitationStatus.EXPIRED
          ? 'This invitation has expired'
          : status === InvitationStatus.REVOKED
            ? 'This invitation has been revoked'
            : status === InvitationStatus.ACCEPTED
              ? 'This invitation has already been accepted'
              : 'This invitation is no longer active'
      throw new BadRequestException(message)
    }
  }

  private async requireOwnerAccess(userId: string, orgSlug: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { userId, org: { slug: orgSlug } },
      include: { org: true },
    })
    if (!member) throw new ForbiddenException()
    if (member.role !== OrgRole.OWNER) throw new ForbiddenException('Only owners can manage invitations')
    return member.org
  }

  private formatForOwner(invitation: {
    id: string
    email: string
    role: OrgRole
    status: InvitationStatus
    expiresAt: Date
    createdAt: Date
    acceptedAt: Date | null
    declinedAt: Date | null
    revokedAt: Date | null
  }) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      acceptedAt: invitation.acceptedAt,
      declinedAt: invitation.declinedAt,
      revokedAt: invitation.revokedAt,
    }
  }
}
