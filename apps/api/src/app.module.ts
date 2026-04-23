import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { AssetsModule } from './modules/assets/assets.module'
import { VersionsModule } from './modules/versions/versions.module'
import { CommentsModule } from './modules/comments/comments.module'
import { StorageModule } from './modules/storage/storage.module'
import { KeysModule } from './modules/keys/keys.module'
import { McpModule } from './modules/mcp/mcp.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssetsModule,
    VersionsModule,
    CommentsModule,
    StorageModule,
    KeysModule,
    McpModule,
  ],
})
export class AppModule {}
