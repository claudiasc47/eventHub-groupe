import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { Reflector } from '@nestjs/core/services/reflector.service'
import { APP_GUARD } from '@nestjs/core/constants'
import { EventsClient } from 'src/clients/events.client'
import { BookingModule } from 'src/modules/booking/booking.module'
import { AuthModule } from 'src/modules/auth/auth.module'
import { AuthClient } from './clients/auth.client'
import { AuthenticationGuard } from './common/guards/auth.guards'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule, BookingModule, AuthModule],
  controllers: [],
  providers: [
    EventsClient,
    AuthClient,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
})
export class AppModule {}
