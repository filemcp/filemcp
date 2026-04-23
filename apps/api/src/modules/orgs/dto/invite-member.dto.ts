import { IsString, IsEnum } from 'class-validator'
import { OrgRole } from '@prisma/client'

export class InviteMemberDto {
  @IsString()
  usernameOrEmail: string

  @IsEnum(OrgRole)
  role: OrgRole
}
