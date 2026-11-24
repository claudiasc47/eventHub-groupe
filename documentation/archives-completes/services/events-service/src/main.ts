import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Transport } from '@nestjs/microservices'
import { NextFunction, Request, Response } from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[REQUEST] Method: ${req.method} | URL: ${req.url}`)
    next()
  })

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'events_service_queue',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  })

  await app.startAllMicroservices()
  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
