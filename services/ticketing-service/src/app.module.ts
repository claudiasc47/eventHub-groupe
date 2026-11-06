import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { TicketTypesModule } from './ticket-types/ticket-types.module'
import { BookingsModule } from './bookings/bookings.module'
import { RabbitmqModule } from './rabbitmq/rabbitmq.module'
import { RabbitmqController } from './rabbitmq/rabbitmq.controller'
import { TicketType } from './entity/ticket-type.entity'
import { Booking } from './entity/booking.entity'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'ticketing-db',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'root',
      database: process.env.POSTGRES_DB || 'ticketing_db',
      entities: [TicketType, Booking],
      synchronize: true, // À désactiver en production
    }),
    TicketTypesModule,
    BookingsModule,
    RabbitmqModule,
  ],
  controllers: [RabbitmqController],
  providers: [],
})
export class AppModule {}
