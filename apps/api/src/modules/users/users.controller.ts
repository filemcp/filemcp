import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@Request() req: { user: { id: string } }) {
    return this.users.getMe(req.user.id)
  }

  @Get('users/:username')
  getProfile(@Param('username') username: string) {
    return this.users.getProfile(username)
  }
}
