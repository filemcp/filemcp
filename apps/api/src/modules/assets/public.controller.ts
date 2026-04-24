import { Controller, Get, Param, ParseIntPipe, UseGuards, Request, StreamableFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AssetsService } from './assets.service'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private assets: AssetsService) {}

  @Get(':username/:uuid')
  @UseGuards(OptionalAuthGuard)
  resolve(
    @Param('username') username: string,
    @Param('uuid') uuid: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.assets.resolvePublic(username, uuid, undefined, req.user?.id)
  }

  @Get(':username/:uuid/v/:version')
  @UseGuards(OptionalAuthGuard)
  resolveVersion(
    @Param('username') username: string,
    @Param('uuid') uuid: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    return this.assets.resolvePublic(username, uuid, version, req.user?.id)
  }

  @Get(':username/:uuid/content')
  @UseGuards(OptionalAuthGuard)
  async content(
    @Param('username') username: string,
    @Param('uuid') uuid: string,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.assets.streamContent(username, uuid, undefined, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }

  @Get(':username/:uuid/v/:version/content')
  @UseGuards(OptionalAuthGuard)
  async contentVersion(
    @Param('username') username: string,
    @Param('uuid') uuid: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.assets.streamContent(username, uuid, version, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }
}
