import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string) {
    // Create key for the user's personal org (first OWNER membership)
    const member = await this.prisma.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
    if (!member) throw new NotFoundException('No organization found')

    const raw = `cdnmcp_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = await bcrypt.hash(raw, 10)
    const record = await this.prisma.apiKey.create({
      data: { memberId: member.id, name, keyHash, lastFourChars: raw.slice(-4) },
    })
    return { id: record.id, name: record.name, key: raw }
  }

  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { member: { userId }, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, lastFourChars: true, lastUsedAt: true, createdAt: true },
    })
  }

  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
      include: { member: true },
    })
    if (!key || key.revokedAt) throw new NotFoundException()
    if (key.member.userId !== userId) throw new ForbiddenException()
    await this.prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } })
  }
}
