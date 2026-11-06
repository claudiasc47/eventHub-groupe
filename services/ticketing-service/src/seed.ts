import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DataSource } from 'typeorm'
import { TicketType, TicketTypeStatus } from './entity/ticket-type.entity'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const dataSource = app.get(DataSource)
  const ticketTypeRepo = dataSource.getRepository(TicketType)

  console.log('🌱 Seeding ticketing database...\n')

  const ticketTypes = [
    // Tech Summit 2025
    {
      id: '850e8400-e29b-41d4-a716-446655440001',
      eventId: '750e8400-e29b-41d4-a716-446655440001',
      name: 'Pass Standard',
      description: 'Accès à toutes les conférences standard',
      price: 50.0,
      totalCapacity: 500,
      status: TicketTypeStatus.ACTIVE,
    },
    {
      id: '850e8400-e29b-41d4-a716-446655440002',
      eventId: '750e8400-e29b-41d4-a716-446655440001',
      name: 'Pass VIP',
      description: 'Accès prioritaire, zone VIP, déjeuner inclus',
      price: 150.0,
      totalCapacity: 50,
      status: TicketTypeStatus.ACTIVE,
    },
    // Festival Electro Lyon
    {
      id: '850e8400-e29b-41d4-a716-446655440003',
      eventId: '750e8400-e29b-41d4-a716-446655440002',
      name: 'Pass 3 Jours',
      description: 'Accès complet au festival pour les 3 jours',
      price: 120.0,
      totalCapacity: 2000,
      status: TicketTypeStatus.ACTIVE,
    },
    {
      id: '850e8400-e29b-41d4-a716-446655440004',
      eventId: '750e8400-e29b-41d4-a716-446655440002',
      name: 'Pass Journée',
      description: 'Accès pour une seule journée au choix',
      price: 45.0,
      totalCapacity: 1000,
      status: TicketTypeStatus.ACTIVE,
    },
    // Marathon de Marseille
    {
      id: '850e8400-e29b-41d4-a716-446655440005',
      eventId: '750e8400-e29b-41d4-a716-446655440003',
      name: 'Dossard Standard',
      description: 'Inscription à la course + T-shirt finisher',
      price: 80.0,
      totalCapacity: 5000,
      status: TicketTypeStatus.ACTIVE,
    },
    // Formation NestJS
    {
      id: '850e8400-e29b-41d4-a716-446655440006',
      eventId: '750e8400-e29b-41d4-a716-446655440004',
      name: 'Inscription Workshop',
      description: 'Formation complète 3 jours + support de cours',
      price: 800.0,
      totalCapacity: 20,
      status: TicketTypeStatus.ACTIVE,
    },
  ]

  for (const data of ticketTypes) {
    const existing = await ticketTypeRepo.findOne({ where: { id: data.id } })
    if (!existing) {
      const ticketType = ticketTypeRepo.create(data)
      await ticketTypeRepo.save(ticketType)
      console.log(`✅ Created ticket type: ${ticketType.name} for event ${ticketType.eventId}`)
    } else {
      console.log(`⏭️  Ticket type ${data.name} already exists, skipping...`)
    }
  }

  console.log('\n✨ Seeding completed!')
  await app.close()
}

void bootstrap()
