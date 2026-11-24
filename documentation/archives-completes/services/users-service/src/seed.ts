import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { UsersService } from './users/users.service'
import { UserRole } from './users/user.entity'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const usersService = app.get(UsersService)

  const users = [
    {
      email: 'admin@event-platform.com',
      password: 'Admin123!',
      role: UserRole.ADMIN,
    },
    {
      email: 'organizer1@event-platform.com',
      password: 'Organizer123!',
      role: UserRole.ORGANIZER,
    },
    {
      email: 'organizer2@event-platform.com',
      password: 'Organizer123!',
      role: UserRole.ORGANIZER,
    },
    {
      email: 'participant1@event-platform.com',
      password: 'Participant123!',
      role: UserRole.PARTICIPANT,
    },
    {
      email: 'participant2@event-platform.com',
      password: 'Participant123!',
      role: UserRole.PARTICIPANT,
    },
  ]

  console.log('🌱 Seeding users database...\n')

  for (const userData of users) {
    try {
      const existingUser = await usersService.findByEmail(userData.email)
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`)
        continue
      }

      const result = await usersService.register(userData.email, userData.password, userData.role)
      console.log(`✅ Created user: ${result.user.email} (${result.user.role})`)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error creating user ${userData.email}:`, errorMessage)
    }
  }

  console.log('\n✨ Seeding completed!')
  await app.close()
}

void bootstrap()
