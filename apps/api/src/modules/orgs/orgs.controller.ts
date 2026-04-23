import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { OrgRole } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OrgsService } from './orgs.service'
import { CreateOrgDto } from './dto/create-org.dto'
import { InviteMemberDto } from './dto/invite-member.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { CreateKeyDto } from './dto/create-key.dto'

@ApiTags('orgs')
@Controller('orgs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrgsController {
  constructor(private orgs: OrgsService) {}

  @Post()
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateOrgDto) {
    return this.orgs.create(req.user.id, dto)
  }

  @Get()
  list(@Request() req: { user: { id: string } }) {
    return this.orgs.listForUser(req.user.id)
  }

  @Get(':slug')
  getOne(@Request() req: { user: { id: string } }, @Param('slug') slug: string) {
    return this.orgs.getDetail(req.user.id, slug)
  }

  // --- Members ---

  @Post(':slug/members')
  inviteMember(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgs.inviteMember(req.user.id, slug, dto)
  }

  @Patch(':slug/members/:userId')
  updateMemberRole(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgs.updateMemberRole(req.user.id, slug, targetUserId, dto.role)
  }

  @Delete(':slug/members/:userId')
  @HttpCode(204)
  removeMember(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.orgs.removeMember(req.user.id, slug, targetUserId)
  }

  // --- API Keys ---

  @Post(':slug/keys')
  createKey(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Body() dto: CreateKeyDto,
  ) {
    return this.orgs.createKey(req.user.id, slug, dto.name)
  }

  @Get(':slug/keys')
  listKeys(@Request() req: { user: { id: string } }, @Param('slug') slug: string) {
    return this.orgs.listKeys(req.user.id, slug)
  }

  @Delete(':slug/keys/:keyId')
  @HttpCode(204)
  revokeKey(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Param('keyId') keyId: string,
  ) {
    return this.orgs.revokeKey(req.user.id, slug, keyId)
  }
}
