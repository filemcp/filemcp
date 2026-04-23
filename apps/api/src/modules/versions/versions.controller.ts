import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'
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
  getContent(
    @Param('assetId') assetId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.versions.getContent(assetId, version)
  }
}
