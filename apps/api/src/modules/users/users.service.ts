import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { _count: { select: { memberships: true } } },
    })
    if (!user) throw new NotFoundException('User not found')
    return {
      username: user.username,
      orgCount: user._count.memberships,
      joinedAt: user.createdAt,
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          include: { org: { select: { slug: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      orgs: user.memberships.map((m) => ({ slug: m.org.slug, name: m.org.name, role: m.role })),
      createdAt: user.createdAt,
    }
  }
}
