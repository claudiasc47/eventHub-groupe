import { NextFunction, Request, Response } from 'express'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] Method: ${req.method} | URL: ${req.url}`)
    next()
  })

  app.setGlobalPrefix('api')

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
