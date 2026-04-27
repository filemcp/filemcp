import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AssetsService } from './assets.service'
import { AssetsController } from './assets.controller'
import { PublicController } from './public.controller'
import { StorageModule } from '../storage/storage.module'
import { RenderModule } from '../render/render.module'
import { ThumbnailModule } from '../thumbnail/thumbnail.module'
import { EmailModule } from '../email/email.module'
import { OrgRoleGuard } from '../auth/guards/org-role.guard'

@Module({
  imports: [ConfigModule, StorageModule, RenderModule, ThumbnailModule, EmailModule],
  providers: [AssetsService, OrgRoleGuard],
  controllers: [AssetsController, PublicController],
  exports: [AssetsService],
})
export class AssetsModule {}
