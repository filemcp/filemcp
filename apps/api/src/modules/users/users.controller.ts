import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  name: string
}

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('users/:username')
  getProfile(@Param('username') username: string) {
    return this.users.getProfile(username)
  }

  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@Request() req: { user: { id: string } }) {
    return this.users.getMe(req.user.id)
  }

  @Get('keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listKeys(@Request() req: { user: { id: string } }) {
    return this.users.listApiKeys(req.user.id)
  }

  @Post('keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createKey(@Request() req: { user: { id: string } }, @Body() dto: CreateApiKeyDto) {
    return this.users.createApiKey(req.user.id, dto.name)
  }

  @Delete('keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeKey(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.users.revokeApiKey(req.user.id, id)
  }
}
