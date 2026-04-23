import { SetMetadata } from '@nestjs/common'
import { OrgRole } from '@prisma/client'

export const ROLES_KEY = 'orgRoles'
export const RequireOrgRole = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles)
