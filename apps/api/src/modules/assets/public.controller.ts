import { Controller, Get, Param, ParseIntPipe, UseGuards, Request, StreamableFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AssetsService } from './assets.service'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private assets: AssetsService) {}

  @Get(':org/:uuid')
  @UseGuards(OptionalAuthGuard)
  resolve(
    @Param('org') org: string,
    @Param('uuid') uuid: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.assets.resolvePublic(org, uuid, undefined, req.user?.id)
  }

  @Get(':org/:uuid/v/:version')
  @UseGuards(OptionalAuthGuard)
  resolveVersion(
    @Param('org') org: string,
    @Param('uuid') uuid: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    return this.assets.resolvePublic(org, uuid, version, req.user?.id)
  }

  @Get(':org/:uuid/content')
  @UseGuards(OptionalAuthGuard)
  async content(
    @Param('org') org: string,
    @Param('uuid') uuid: string,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.assets.streamContent(org, uuid, undefined, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }

  @Get(':org/:uuid/v/:version/content')
  @UseGuards(OptionalAuthGuard)
  async contentVersion(
    @Param('org') org: string,
    @Param('uuid') uuid: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.assets.streamContent(org, uuid, version, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }
}
