import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

// Enriches request with user if auth header present; allows through if not
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T {
    return user
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }
}
