import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { AnyAuthGuard } from '../auth/guards/any-auth.guard'

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('users/me')
  @UseGuards(AnyAuthGuard)
  @ApiBearerAuth()
  getMe(@Request() req: { user: { id: string } }) {
    return this.users.getMe(req.user.id)
  }

  @Get('users/:username')
  getProfile(@Param('username') username: string) {
    return this.users.getProfile(username)
  }
}
