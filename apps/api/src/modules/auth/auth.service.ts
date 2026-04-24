import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { slugify } from '../../utils/slug'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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

  private serializeUser(user: { id: string; email: string; username: string; createdAt: Date }) {
    return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt }
  }

  private signAccessToken(userId: string, username: string) {
    return this.jwt.sign({ sub: userId, username })
  }
}
