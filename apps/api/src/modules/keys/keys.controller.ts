import { Controller, Get, Post, Delete, Param, Body, Request, UseGuards, HttpCode } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { KeysService } from './keys.service'
import { CreateKeyDto } from './dto/create-key.dto'

@ApiTags('keys')
@Controller('keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KeysController {
  constructor(private keys: KeysService) {}

  @Post()
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateKeyDto) {
    return this.keys.create(req.user.id, dto.name)
  }

  @Get()
  list(@Request() req: { user: { id: string } }) {
    return this.keys.list(req.user.id)
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.keys.revoke(req.user.id, id)
  }
}
