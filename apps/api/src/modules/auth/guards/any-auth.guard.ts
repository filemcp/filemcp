import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

// Accepts either a JWT or an API key — CLI and web both go through same routes
@Injectable()
export class AnyAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  handleRequest<T>(err: unknown, user: T): T {
    if (err || !user) {
      throw err as Error
    }
    return user
  }
}
