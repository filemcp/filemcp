import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AssetsModule } from '../assets/assets.module'
import { McpController } from './mcp.controller'
import { McpService } from './mcp.service'

@Module({
  imports: [ConfigModule, AssetsModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
