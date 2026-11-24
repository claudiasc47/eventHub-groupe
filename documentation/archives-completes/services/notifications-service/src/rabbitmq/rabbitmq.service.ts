import { Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ChannelModel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService {
  private connection: ChannelModel;
  private channel: amqp.Channel;

  async connect() {
    const url = process.env.RABBITMQ_URL || 'amqp://event-broker';
  
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
  
    await this.channel.assertExchange('events', 'topic', { durable: true });
  }

  async consume(pattern: string, handler: (msg: ConsumeMessage | null) => void) {
    await this.channel.assertQueue(pattern);
    await this.channel.bindQueue(pattern, 'events', pattern);

    this.channel.consume(pattern, (msg) => {
        if (!msg) {
            return;
          }  
      const content = JSON.parse(msg.content.toString());
      handler(content);
      this.channel.ack(msg);
    });
  }
}