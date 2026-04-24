import { Controller, Get, Param, ParseIntPipe, StreamableFile, UseGuards, Request } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { VersionsService } from './versions.service'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'

@ApiTags('versions')
@Controller('assets/:assetId/versions')
@UseGuards(OptionalAuthGuard)
export class VersionsController {
  constructor(private versions: VersionsService) {}

  @Get()
  list(
    @Param('assetId') assetId: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.versions.list(assetId, req.user?.id)
  }

  @Get(':version/content')
  async getContent(
    @Param('assetId') assetId: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: { user?: { id: string } },
  ) {
    const { data, contentType } = await this.versions.getContent(assetId, version, req.user?.id)
    return new StreamableFile(data, { type: contentType })
  }
}
