import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthClient } from 'src/clients/auth.client'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
  providers: [AuthService, AuthClient],
  exports: [AuthClient],
})
export class AuthModule {}
