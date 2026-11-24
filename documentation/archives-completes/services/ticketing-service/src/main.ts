import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AppModule } from './app.module'
import { NextFunction, Request, Response } from 'express'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  // Créer l'application HTTP (API REST)
  const app = await NestFactory.create(AppModule)

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[REQUEST] Method: ${req.method} | URL: ${req.url}`)
    next()
  })

  // Activer la validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // CORS pour le développement
  app.enableCors()

  // Connecter le microservice RabbitMQ (mode hybride)
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@event-broker:5672'

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'ticket_service_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false, // On gère l'acknowledgement manuellement
    },
  })

  // Démarrer tous les microservices
  await app.startAllMicroservices()
  logger.log('🐰 RabbitMQ microservice connected')

  // Démarrer le serveur HTTP
  const port = process.env.PORT ?? 3000
  await app.listen(port)
  logger.log(`🚀 Ticketing service is running on port ${port}`)
  logger.log(`📡 Listening for events on ticket_service_queue`)
}

bootstrap()
