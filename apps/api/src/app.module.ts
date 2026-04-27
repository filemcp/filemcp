import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { OrgsModule } from './modules/orgs/orgs.module'
import { AssetsModule } from './modules/assets/assets.module'
import { VersionsModule } from './modules/versions/versions.module'
import { CommentsModule } from './modules/comments/comments.module'
import { StorageModule } from './modules/storage/storage.module'
import { McpModule } from './modules/mcp/mcp.module'
import { EmailModule } from './modules/email/email.module'
import { InvitationsModule } from './modules/invitations/invitations.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrgsModule,
    AssetsModule,
    VersionsModule,
    CommentsModule,
    StorageModule,
    McpModule,
    EmailModule,
    InvitationsModule,
  ],
})
export class AppModule {}
