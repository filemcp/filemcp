import { Module } from '@nestjs/common'
import { AssetsService } from './assets.service'
import { AssetsController } from './assets.controller'
import { PublicController } from './public.controller'
import { StorageModule } from '../storage/storage.module'
import { RenderModule } from '../render/render.module'

@Module({
  imports: [StorageModule, RenderModule],
  providers: [AssetsService],
  controllers: [AssetsController, PublicController],
  exports: [AssetsService],
})
export class AssetsModule {}
