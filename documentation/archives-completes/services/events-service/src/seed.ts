import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DataSource } from 'typeorm'
import { Category } from './entity/category.entity'
import { Location } from './entity/location.entity'
import { Event, EventStatus } from './entity/event.entity'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const dataSource = app.get(DataSource)

  const categoryRepo = dataSource.getRepository(Category)
  const locationRepo = dataSource.getRepository(Location)
  const eventRepo = dataSource.getRepository(Event)

  console.log('🌱 Seeding events database...\n')

  // Insert Categories
  const categories = [
    { id: '550e8400-e29b-41d4-a716-446655440001', libelle: 'Conférence' },
    { id: '550e8400-e29b-41d4-a716-446655440002', libelle: 'Concert' },
    { id: '550e8400-e29b-41d4-a716-446655440003', libelle: 'Festival' },
    { id: '550e8400-e29b-41d4-a716-446655440004', libelle: 'Formation' },
    { id: '550e8400-e29b-41d4-a716-446655440005', libelle: 'Sport' },
  ]

  for (const catData of categories) {
    const existing = await categoryRepo.findOne({ where: { id: catData.id } })
    if (!existing) {
      const category = categoryRepo.create(catData)
      await categoryRepo.save(category)
      console.log(`✅ Created category: ${category.libelle}`)
    }
  }

  // Insert Locations
  const locations = [
    {
      id: '650e8400-e29b-41d4-a716-446655440001',
      nom: 'Palais des Congrès',
      adresse: '2 Place de la Porte Maillot',
      ville: 'Paris',
      code_postal: '75017',
      capacite: 4000,
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440002',
      nom: 'Zénith de Lyon',
      adresse: '4 Rue du Sergent Michel Berthet',
      ville: 'Lyon',
      code_postal: '69009',
      capacite: 6500,
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440003',
      nom: 'Stade Vélodrome',
      adresse: '3 Boulevard Michelet',
      ville: 'Marseille',
      code_postal: '13008',
      capacite: 67000,
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440004',
      nom: 'Centre de Convention de Toulouse',
      adresse: '11 Esplanade Compans Caffarelli',
      ville: 'Toulouse',
      code_postal: '31000',
      capacite: 2500,
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440005',
      nom: 'Parc des Expositions Bordeaux',
      adresse: 'Cours Charles Bricaud',
      ville: 'Bordeaux',
      code_postal: '33000',
      capacite: 5000,
    },
  ]

  for (const locData of locations) {
    const existing = await locationRepo.findOne({ where: { id: locData.id } })
    if (!existing) {
      const location = locationRepo.create(locData)
      await locationRepo.save(location)
      console.log(`✅ Created location: ${location.nom}`)
    }
  }

  // Insert Events
  const events = [
    {
      id: '750e8400-e29b-41d4-a716-446655440001',
      nom: 'Tech Summit 2025',
      description:
        "Le plus grand événement technologique de l'année avec des conférences sur l'IA, le cloud et la cybersécurité",
      date_debut: new Date('2025-03-15'),
      date_fin: new Date('2025-03-17'),
      location: { id: '650e8400-e29b-41d4-a716-446655440001' },
      category: { id: '550e8400-e29b-41d4-a716-446655440001' },
      status: EventStatus.PUBLISHED,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440002',
      nom: 'Festival Electro Lyon',
      description: 'Trois jours de musique électronique avec les meilleurs DJs internationaux',
      date_debut: new Date('2025-06-20'),
      date_fin: new Date('2025-06-22'),
      location: { id: '650e8400-e29b-41d4-a716-446655440002' },
      category: { id: '550e8400-e29b-41d4-a716-446655440003' },
      status: EventStatus.PUBLISHED,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440003',
      nom: 'Marathon de Marseille',
      description: 'Course internationale de 42km à travers la ville de Marseille',
      date_debut: new Date('2025-04-10'),
      date_fin: new Date('2025-04-10'),
      location: { id: '650e8400-e29b-41d4-a716-446655440003' },
      category: { id: '550e8400-e29b-41d4-a716-446655440005' },
      status: EventStatus.PUBLISHED,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440004',
      nom: 'Formation NestJS Avancé',
      description: "Workshop pratique sur l'architecture microservices avec NestJS et RabbitMQ",
      date_debut: new Date('2025-05-05'),
      date_fin: new Date('2025-05-07'),
      location: { id: '650e8400-e29b-41d4-a716-446655440004' },
      category: { id: '550e8400-e29b-41d4-a716-446655440004' },
      status: EventStatus.DRAFT,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440005',
      nom: 'Salon du Vin de Bordeaux',
      description:
        'Dégustation et découverte des grands crus de Bordeaux avec des vignerons renommés',
      date_debut: new Date('2025-09-12'),
      date_fin: new Date('2025-09-14'),
      location: { id: '650e8400-e29b-41d4-a716-446655440005' },
      category: { id: '550e8400-e29b-41d4-a716-446655440003' },
      status: EventStatus.PUBLISHED,
    },
    {
      id: '750e8400-e29b-41d4-a716-446655440006',
      nom: 'Concert Jazz à Paris',
      description: 'Soirée jazz avec des artistes de renommée internationale',
      date_debut: new Date('2025-02-28'),
      date_fin: new Date('2025-02-28'),
      location: { id: '650e8400-e29b-41d4-a716-446655440001' },
      category: { id: '550e8400-e29b-41d4-a716-446655440002' },
      status: EventStatus.FINISHED,
    },
  ]

  for (const eventData of events) {
    const existing = await eventRepo.findOne({ where: { id: eventData.id } })
    if (!existing) {
      const event = eventRepo.create(eventData)
      await eventRepo.save(event)
      console.log(`✅ Created event: ${event.nom}`)
    }
  }

  console.log('\n✨ Seeding completed!')
  await app.close()
}

void bootstrap()
