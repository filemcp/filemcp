import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [ConfigModule, EmailModule],
  providers: [InvitationsService],
  controllers: [InvitationsController],
  exports: [InvitationsService],
})
export class InvitationsModule {}
