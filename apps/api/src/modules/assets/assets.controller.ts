import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger'
import { OrgRole } from '@prisma/client'
import { Throttle } from '@nestjs/throttler'
import { AssetsService } from './assets.service'
import { UploadAssetDto } from './dto/upload-asset.dto'
import { UpdateAssetDto } from './dto/update-asset.dto'
import { ShareAssetDto } from './dto/share-asset.dto'
import { AnyAuthGuard } from '../auth/guards/any-auth.guard'
import { OrgRoleGuard, AuthUser } from '../auth/guards/org-role.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequireOrgRole } from '../auth/decorators/require-org-role.decorator'

@ApiTags('assets')
@Controller('orgs/:slug/assets')
@UseGuards(AnyAuthGuard, OrgRoleGuard)
@ApiBearerAuth()
export class AssetsController {
  constructor(
    private assets: AssetsService,
    private config: ConfigService,
  ) {}

  @Post()
  @RequireOrgRole(OrgRole.WRITE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('slug') _slug: string,
    @Request() req: { user: AuthUser },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAssetDto,
    @Headers('x-upload-source') uploadSource?: string,
  ) {
    const options = uploadSource === 'mcp'
      ? { maxBytes: parseInt(this.config.get('MCP_MAX_FILE_SIZE_MB', '5'), 10) * 1024 * 1024 }
      : undefined
    return this.assets.upload(req.user.orgId!, req.user.id, file, dto, options)
  }

  @Get()
  @RequireOrgRole(OrgRole.READ)
  list(
    @Param('slug') _slug: string,
    @Request() req: { user: AuthUser },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.assets.listByOrg(req.user.orgId!, page, Math.min(limit, 100))
  }

  @Get(':id')
  @RequireOrgRole(OrgRole.READ)
  getOne(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.assets.getById(id, req.user.orgId!)
  }

  @Patch(':id')
  @RequireOrgRole(OrgRole.WRITE)
  update(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assets.update(req.user.orgId!, id, dto)
  }

  @Delete(':id')
  @RequireOrgRole(OrgRole.WRITE)
  @HttpCode(204)
  remove(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.assets.delete(req.user.orgId!, id)
  }

  // Send the asset's link to a recipient via email. JWT-only (no API keys) so we're not used as a spam relay.
  // Rate-limited to 20/hour per user.
  @Post(':id/share')
  @UseGuards(JwtAuthGuard, OrgRoleGuard)
  @RequireOrgRole(OrgRole.READ)
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @HttpCode(200)
  async share(
    @Param('slug') _slug: string,
    @Param('id') id: string,
    @Request() req: { user: AuthUser },
    @Body() dto: ShareAssetDto,
  ) {
    await this.assets.shareLink(req.user.orgId!, req.user.id, id, dto)
    return { ok: true }
  }
}
