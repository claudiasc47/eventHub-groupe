import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [RabbitMQModule, MailModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}