import { Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { AnyAuthGuard } from '../auth/guards/any-auth.guard'
import { McpService } from './mcp.service'

@ApiTags('mcp')
@Controller('mcp')
@UseGuards(AnyAuthGuard)
@ApiBearerAuth()
export class McpController {
  constructor(private mcp: McpService) {}

  // GET: Claude Code opens this to establish SSE — we don't need server-push so just 200+close
  @Get()
  handleGet(@Res() res: Response) {
    res.status(200).end()
  }

  @Post()
  handlePost(
    @Req() req: Request & { user: { id: string; username: string } },
    @Res() res: Response,
  ) {
    return this.mcp.handle(req, res)
  }

  @Delete()
  handleDelete(@Res() res: Response) {
    res.status(200).end()
  }
}
