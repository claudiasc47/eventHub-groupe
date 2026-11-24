import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EventsService } from './events.service'
import { EventsController } from './events.controller'
import { Event } from '../entity/event.entity'
import { Category } from '../entity/category.entity'
import { Location } from '../entity/location.entity'
import { ClientsModule, Transport } from '@nestjs/microservices'

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Category, Location]),
    ClientsModule.register([
      {
        name: 'EVENT_BROKER',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@event-broker:5672'],
          queue: 'events_service_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
