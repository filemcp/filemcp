import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string) {
    const raw = `cdnmcp_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = await bcrypt.hash(raw, 10)
    const record = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, lastFourChars: raw.slice(-4) },
    })
    return { id: record.id, name: record.name, key: raw }
  }

  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, lastFourChars: true, lastUsedAt: true, createdAt: true },
    })
    return keys
  }

  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } })
    if (!key || key.revokedAt) throw new NotFoundException()
    if (key.userId !== userId) throw new ForbiddenException()
    await this.prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } })
  }
}
