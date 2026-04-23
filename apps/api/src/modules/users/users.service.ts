import { Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { _count: { select: { assets: true } } },
    })
    if (!user) throw new NotFoundException('User not found')
    return {
      username: user.username,
      assetCount: user._count.assets,
      joinedAt: user.createdAt,
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { _count: { select: { assets: true } } },
    })
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      assetCount: user._count.assets,
      createdAt: user.createdAt,
    }
  }

  async listApiKeys(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return keys.map(({ keyHash: _, ...key }) => key)
  }

  async createApiKey(userId: string, name: string) {
    const rawKey = `cdnmcp_${randomBytes(24).toString('hex')}`
    const keyHash = await bcrypt.hash(rawKey, 12)
    const lastFourChars = rawKey.slice(-4)

    const key = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, lastFourChars },
    })

    return { id: key.id, name: key.name, lastFourChars, key: rawKey }
  }

  async revokeApiKey(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } })
    if (!key) throw new NotFoundException('API key not found')
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    })
  }
}
