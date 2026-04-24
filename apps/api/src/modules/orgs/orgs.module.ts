import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OrgsService } from './orgs.service'
import { OrgsController } from './orgs.controller'

@Module({
  imports: [ConfigModule],
  providers: [OrgsService],
  controllers: [OrgsController],
  exports: [OrgsService],
})
export class OrgsModule {}
