import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Location } from '../locations/location.entity';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Location, Category, User, Booking]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
