import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger'
import { AssetsService } from './assets.service'
import { UploadAssetDto } from './dto/upload-asset.dto'
import { UpdateAssetDto } from './dto/update-asset.dto'
import { AnyAuthGuard } from '../auth/guards/any-auth.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private assets: AssetsService) {}

  @Post()
  @UseGuards(AnyAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAssetDto,
  ) {
    return this.assets.upload(req.user.id, file, dto)
  }

  @Get()
  @UseGuards(AnyAuthGuard)
  @ApiBearerAuth()
  list(
    @Request() req: { user: { id: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.assets.listOwned(req.user.id, page, Math.min(limit, 100))
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.assets.getById(id, req.user.id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assets.update(req.user.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.assets.delete(req.user.id, id)
  }
}
