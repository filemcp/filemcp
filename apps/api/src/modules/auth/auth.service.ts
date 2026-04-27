import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { slugify } from '../../utils/slug'
import { EmailService } from '../email/email.service'
import { InvitationsService } from '../invitations/invitations.service'

const PASSWORD_RESET_TOKEN_TTL_MIN = 60

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private invitations: InvitationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    })
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already in use' : 'Username already taken',
      )
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash },
    })

    const orgName = dto.orgName?.trim() || user.username
    const orgSlug = slugify(orgName) || user.username

    const slugTaken = await this.prisma.organization.findUnique({ where: { slug: orgSlug } })
    if (slugTaken) {
      await this.prisma.user.delete({ where: { id: user.id } })
      throw new ConflictException('Workspace name is already taken, please choose a different one')
    }

    const org = await this.prisma.organization.create({
      data: { slug: orgSlug, name: orgName },
    })
    await this.prisma.orgMember.create({
      data: { orgId: org.id, userId: user.id, role: 'OWNER' },
    })

    // Fire-and-forget — don't block registration on email delivery
    void this.email.sendWelcome(user.email, user.username)

    // If they came via an invite link, auto-accept the invitation so they're already
    // a member of the inviting org when they land on the dashboard.
    if (dto.inviteToken) {
      try {
        await this.invitations.accept(dto.inviteToken, user.id)
      } catch (err: any) {
        // Don't fail registration — they still got their personal org. Log and move on.
        console.warn(`Auto-accept invitation failed for ${user.email}: ${err?.message ?? err}`)
      }
    }

    return { accessToken: this.signAccessToken(user.id, user.username), user: this.serializeUser(user) }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return { accessToken: this.signAccessToken(user.id, user.username), user: this.serializeUser(user) }
  }

  async validateApiKey(rawKey: string) {
    if (!rawKey.startsWith('filemcp_')) return null

    const prefix = rawKey.slice(0, 16)
    const candidates = await this.prisma.apiKey.findMany({
      where: { revokedAt: null, keyPrefix: prefix },
      include: { member: { include: { org: true, user: true } } },
    })

    for (const key of candidates) {
      if (await bcrypt.compare(rawKey, key.keyHash)) {
        await this.prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        })
        return {
          id: key.member.userId,
          username: key.member.user.username,
          orgId: key.member.orgId,
          orgSlug: key.member.org.slug,
          role: key.member.role,
        }
      }
    }
    return null
  }

  // Always returns success (never reveals whether the email exists) to avoid account enumeration.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) return

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MIN * 60 * 1000)

    await this.prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    })

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000')
    void this.email.sendPasswordReset(user.email, `${appUrl}/reset-password?token=${rawToken}`)
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
    if (!record) throw new BadRequestException('Invalid or expired reset link')
    if (record.usedAt) throw new BadRequestException('Reset link has already been used')
    if (record.expiresAt < new Date()) throw new BadRequestException('Reset link has expired')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate any other outstanding reset tokens for this user
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ])
  }

  private serializeUser(user: { id: string; email: string; username: string; createdAt: Date }) {
    return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt }
  }

  private signAccessToken(userId: string, username: string) {
    return this.jwt.sign({ sub: userId, username })
  }
}
