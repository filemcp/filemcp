import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { McpController } from './mcp.controller'
import { McpService } from './mcp.service'

@Module({
  imports: [AssetsModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
