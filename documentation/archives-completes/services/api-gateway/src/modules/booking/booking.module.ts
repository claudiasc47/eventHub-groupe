import { Module } from '@nestjs/common'
import { BookingController } from './booking.controller'
import { BookingService } from './booking.service'
import { EventsClient } from 'src/clients/events.client'
import { HttpModule } from '@nestjs/axios'
import { AuthModule } from '../auth/auth.module'
import { TicketsClient } from 'src/clients/tickets.client'

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [BookingController],
  providers: [BookingService, EventsClient, TicketsClient],
})
export class BookingModule {}
