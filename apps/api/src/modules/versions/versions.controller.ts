import { Controller, Get, Param, ParseIntPipe, StreamableFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { VersionsService } from './versions.service'

@ApiTags('versions')
@Controller('assets/:assetId/versions')
export class VersionsController {
  constructor(private versions: VersionsService) {}

  @Get()
  list(@Param('assetId') assetId: string) {
    return this.versions.list(assetId)
  }

  @Get(':version/content')
  async getContent(
    @Param('assetId') assetId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    const { data, contentType } = await this.versions.getContent(assetId, version)
    return new StreamableFile(data, { type: contentType })
  }
}
