import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { NextFunction, Request, Response } from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[REQUEST] Method: ${req.method} | URL: ${req.url}`)
    next()
  })

  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
  })

  await app.listen(3000)
}
bootstrap()
