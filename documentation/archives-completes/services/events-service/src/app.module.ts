import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EventsModule } from './events/events.module'

import { CategoriesModule } from './categories/categories.module'
import { LocationsModule } from './locations/locations.module'
import { Event } from './entity/event.entity'
import { Category } from './entity/category.entity'
import { Location } from './entity/location.entity'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres', // ou autre
      host: 'events-db',
      port: 5432,
      username: 'postgres',
      password: 'root',
      database: 'plateforme_reservation',
      entities: [Event, Category, Location],
      synchronize: true,
    }),
    EventsModule,
    CategoriesModule,
    LocationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
