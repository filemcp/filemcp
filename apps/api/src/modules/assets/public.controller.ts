import { Controller, Get, Param, ParseIntPipe, UseGuards, Request, StreamableFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AssetsService } from './assets.service'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private assets: AssetsService) {}

  @Get(':username/:slug')
  @UseGuards(OptionalAuthGuard)
  resolve(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.assets.resolvePublic(username, slug, undefined, req.user?.id)
  }

  @Get(':username/:slug/v/:version')
  @UseGuards(OptionalAuthGuard)
  resolveVersion(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    return this.assets.resolvePublic(username, slug, version, req.user?.id)
  }

  @Get(':username/:slug/content')
  @UseGuards(OptionalAuthGuard)
  async content(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.assets.streamContent(username, slug, undefined, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }

  @Get(':username/:slug/v/:version/content')
  @UseGuards(OptionalAuthGuard)
  async contentVersion(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.assets.streamContent(username, slug, version, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }
}
