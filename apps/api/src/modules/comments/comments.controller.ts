import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CommentsService } from './comments.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private comments: CommentsService) {}

  @Get('assets/:assetId/comments')
  @UseGuards(OptionalAuthGuard)
  list(
    @Param('assetId') assetId: string,
    @Query('resolved') resolved?: string,
    @Request() req: { user?: { id: string } } = {} as any,
  ) {
    const resolvedFilter =
      resolved === 'true' ? true : resolved === 'false' ? false : undefined
    return this.comments.list(assetId, resolvedFilter, req.user?.id)
  }

  @Post('assets/:assetId/comments')
  @UseGuards(OptionalAuthGuard)
  create(
    @Param('assetId') assetId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.comments.create(assetId, dto, req.user?.id)
  }

  @Patch('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.comments.update(id, dto, req.user.id)
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.comments.delete(id, req.user.id)
  }
}
