import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BookingsService } from './bookings.service'
import { BookingsController } from './bookings.controller'
import { Booking } from '../entity/booking.entity'
import { TicketTypesModule } from '../ticket-types/ticket-types.module'
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module'

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), TicketTypesModule, RabbitmqModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
