import { NestFactory } from '@nestjs/core';
import { NotificationsModule } from './notifications.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsModule);
  await app.listen(3005);                     ////////////////////////////////////////////////////////////////////////////////////
  console.log('Notifications Service running on port 3005 🚀');
}
bootstrap();