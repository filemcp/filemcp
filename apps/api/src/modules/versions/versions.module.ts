import { Module } from '@nestjs/common'
import { VersionsService } from './versions.service'
import { VersionsController } from './versions.controller'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [StorageModule],
  providers: [VersionsService],
  controllers: [VersionsController],
})
export class VersionsModule {}
