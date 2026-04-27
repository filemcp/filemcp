import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { InvitationsService } from './invitations.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'

@ApiTags('invitations')
@Controller()
export class InvitationsController {
  constructor(private invitations: InvitationsService) {}

  // --- Owner endpoints (mounted under /orgs/:slug/invitations) ---

  @Post('orgs/:slug/invitations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(req.user.id, slug, dto)
  }

  @Get('orgs/:slug/invitations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  list(@Request() req: { user: { id: string } }, @Param('slug') slug: string) {
    return this.invitations.listForOrg(req.user.id, slug)
  }

  @Delete('orgs/:slug/invitations/:invitationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  revoke(
    @Request() req: { user: { id: string } },
    @Param('slug') slug: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitations.revoke(req.user.id, slug, invitationId)
  }

  // --- Public + invitee endpoints (mounted under /invitations/:token) ---

  @Get('invitations/:token')
  preview(@Param('token') token: string) {
    return this.invitations.preview(token)
  }

  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  accept(@Param('token') token: string, @Request() req: { user: { id: string } }) {
    return this.invitations.accept(token, req.user.id)
  }

  @Post('invitations/:token/decline')
  @HttpCode(200)
  async decline(@Param('token') token: string) {
    await this.invitations.decline(token)
    return { ok: true }
  }
}
