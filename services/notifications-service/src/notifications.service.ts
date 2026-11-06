import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { MailService } from './mail/mail.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    await this.rabbit.connect();

    this.rabbit.consume('event.created', (data) => this.handleEventCreated(data));
    this.rabbit.consume('payment.processed', (data) => this.handlePaymentProcessed(data));
    this.rabbit.consume('payment.failed', (data) => this.handlePaymentFailed(data));
    this.rabbit.consume('ticket.booked', (data) => this.handleTicketBooked(data));
    this.rabbit.consume('event.cancelled', (data) => this.handleEventCancelled(data));
  }

  async handleEventCreated(data: any) {
    await this.mail.sendMail(
      data.organizerEmail,
      'Nouvel événement créé 🎉',
      `<h2>${data.title}</h2><p>Votre événement a été publié.</p>`
    );
  }

  async handlePaymentProcessed(data: any) {
    await this.mail.sendMail(
      data.userEmail,
      'Paiement confirmé ✔️',
      `<p>Merci ! Votre paiement pour ${data.eventTitle} est confirmé.</p>`
    );
  }

  async handlePaymentFailed(data: any) {
    await this.mail.sendMail(
      data.userEmail,
      'Échec du paiement ❌',
      `<p>Votre paiement pour ${data.eventTitle} a échoué.</p>`
    );
  }

  async handleTicketBooked(data: any) {
    await this.mail.sendMail(
      data.userEmail,
      'Billet réservé 🎫',
      `<p>Votre billet pour ${data.eventTitle} est réservé.</p>`
    );
  }

  async handleEventCancelled(data: any) {
    await this.mail.sendMail(
      data.userEmail,
      'Événement annulé ⚠️',
      `<p>L'événement ${data.title} a été annulé.</p>`
    );
  }
}