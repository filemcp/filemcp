import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { OrgRole } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import { ROLES_KEY } from '../decorators/require-org-role.decorator'

const ROLE_LEVEL: Record<OrgRole, number> = { OWNER: 3, WRITE: 2, READ: 1 }

@Injectable()
export class OrgRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const req = context.switchToHttp().getRequest<{ user: AuthUser; params: { slug?: string } }>()
    const user = req.user
    if (!user) throw new ForbiddenException()

    // API key auth already carries org + role
    if (user.orgId && user.role) {
      return this.check(user.role, required)
    }

    // JWT auth: resolve org from route :slug param
    const orgSlug = req.params.slug
    if (!orgSlug) throw new ForbiddenException()

    const member = await this.prisma.orgMember.findFirst({
      where: { userId: user.id, org: { slug: orgSlug } },
      include: { org: true },
    })
    if (!member) throw new ForbiddenException()

    // Attach org context to the request user for downstream use
    req.user = { ...user, orgId: member.orgId, orgSlug: member.org.slug, role: member.role }

    return this.check(member.role, required)
  }

  private check(actual: OrgRole, required: OrgRole[]): boolean {
    const actualLevel = ROLE_LEVEL[actual] ?? 0
    if (!required.some((r) => actualLevel >= (ROLE_LEVEL[r] ?? 0))) {
      throw new ForbiddenException('Insufficient role')
    }
    return true
  }
}

export interface AuthUser {
  id: string
  username: string
  orgId?: string
  orgSlug?: string
  role?: OrgRole
}
