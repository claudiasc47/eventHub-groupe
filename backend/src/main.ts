import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder } from 'node_modules/@nestjs/swagger/dist/document-builder';
import { SwaggerModule } from 'node_modules/@nestjs/swagger/dist/swagger-module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  // console.log('DATABASE_URL =', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));
  // console.log('CORS_ORIGIN  =', process.env.CORS_ORIGIN);
  // console.log('POSTGRES_PORT  =', process.env.POSTGRES_PORT);
  // console.log('POSTGRES_USER  =', process.env.POSTGRES_USER);
  // console.log('POSTGRES_PASSWORD  =', process.env.POSTGRES_PASSWORD);
  // console.log('POSTGRES_DB  =', process.env.POSTGRES_DB);

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });

  const config = new DocumentBuilder()
    .setTitle('EventHub API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.API_PORT ?? 3000);
}
void bootstrap();
