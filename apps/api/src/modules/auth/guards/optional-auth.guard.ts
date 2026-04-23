import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

// Enriches request with user if auth present; allows through unauthenticated if not
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T {
    return user
  }

  canActivate(context: ExecutionContext) {
    try {
      return super.canActivate(context)
    } catch {
      return true
    }
  }
}
