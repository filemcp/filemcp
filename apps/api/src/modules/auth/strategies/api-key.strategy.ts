import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-custom'
import { AuthService } from '../auth.service'
import { Request } from 'express'

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private auth: AuthService) {
    super()
  }

  async validate(req: Request) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer cdnmcp_')) {
      throw new UnauthorizedException()
    }
    const key = header.slice('Bearer '.length)
    const user = await this.auth.validateApiKey(key)
    if (!user) throw new UnauthorizedException()
    return user
  }
}
