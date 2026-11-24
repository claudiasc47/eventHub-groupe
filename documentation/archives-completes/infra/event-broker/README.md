# Guide pour la config dans une app NestJS

## Ajout des libs

```bash
npm install @nestjs/microservices amqplib
```

## Configurer l'app pour se connecter au broker

> **Note :** Remplace `notifications_service_queue` par la queue de ton service :
>
> - notifications-service → `notifications_service_queue`
> - ticketing-service → `ticket_service_queue`
> - payment-service → `payment_service_queue`

```typescript
//main.ts

// Ajouter la configuration RabbitMQ (consommer)
app.connectMicroservice({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: "notifications_service_queue",
    noAck: false,
    queueOptions: {
      durable: true,
    },
  },
});

await app.startAllMicroservices();
```

```typescript
// event-broker.module.ts

// Ajouter la configuration RabbitMQ (publier)
@Module({
  imports: [
    ClientsModule.register([
      {
        name: "EVENT_BROKER",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: "notifications_service_queue",
          noAck: false,
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
})
export class EventBrokerModule {}
```

## Créer un service pour publier des événements

```typescript
@Injectable()
export class EventsPublisherService {
  constructor(@Inject("EVENT_BROKER") private readonly client: ClientProxy) {}

  async onModuleInit() {
    await this.client.connect();
  }

  publishEventCreated(eventData) {
    this.client.emit("EventCreatedEvent", eventData);
  }
}
```

> **Note :**
>
> - `emit()` → envoie un événement fire-and-forget (pas de réponse attendue)
> - `send()` → envoie un événement et attend une réponse

## Exemple depuis un service metier

```typescript
@Injectable()
export class EventsService {
  constructor(
    private readonly eventsPublisher: EventsPublisherService,
    private readonly eventsRepository: EventsRepository
  ) {}

  async createEvent(dto: CreateEventDto) {
    const event = await this.eventsRepository.create(dto);

    // Publier l'événement après la création
    await this.eventsPublisher.publishEventCreated(event);

    return event;
  }
}
```

## Créer un controller pour consommer les evenements

```typescript
@Controller()
export class EventsListenerController {
  @EventPattern("EventCreatedEvent")
  async handleEventCreatedNotification(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      // Traiter l'événement
      await this.doSomething(data);

      // Acknowledge le message
      channel.ack(originalMsg);
    } catch (error) {
      console.error("Erreur:", error);
      // Rejeter et remettre en queue pour retry
      channel.nack(originalMsg, false, true);
    }
  }
}
```

## Détail de la config des queues

```
| Message publié        | Notifications | Tickets | payments |
| --------------------- | ------------- | ------- | --------- |
| EventCreatedEvent     | ✅            | ❌       | ❌        |
| EventUpdatedEvent     | ✅            | ✅       | ❌        |
| EventCancelledEvent   | ✅            | ✅       | ✅        |
| TicketBookedEvent     | ❌            | ❌       | ✅        |
| PaymentProcessedEvent | ✅            | ✅       | ❌        |
| PaymentFailedEvent    | ✅            | ✅       | ❌        |
| TicketCancelledEvent  | ❌            | ❌       | ✅        |
```
