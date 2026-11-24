import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { Booking } from './booking.entity';

const PUBLISHED = 'PUBLISHED';
const CONFIRMED = 'CONFIRMED';
const CANCELLED = 'CANCELLED';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, eventId: string, quantity: number): Promise<Booking> {
    const bookingId = await this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(Event, {
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!event || String(event.status) !== PUBLISHED) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Événement introuvable.' });
      }
      if (event.remainingSeats < quantity) {
        throw new ConflictException({
          code: 'INSUFFICIENT_SEATS',
          message: 'Places insuffisantes.',
        });
      }

      await manager.decrement(Event, { id: eventId }, 'remainingSeats', quantity);

      const booking = await manager.save(
        manager.create(Booking, {
          event: { id: eventId },
          user: { id: userId },
          quantity,
          status: CONFIRMED,
        }),
      );
      return booking.id;
    });

    return this.findOneWithEvent(bookingId);
  }

  findMine(userId: string): Promise<Booking[]> {
    return this.bookings.find({
      where: { user: { id: userId } },
      relations: { event: { location: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(userId: string, bookingId: string): Promise<Booking> {
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(Booking, 'b')
        .select('b.id')
        .where('b.id = :id', { id: bookingId })
        .setLock('pessimistic_write')
        .getOne();

      if (!locked) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Réservation introuvable.' });
      }

      const booking = await manager.findOneOrFail(Booking, {
        where: { id: bookingId },
        relations: { user: true, event: true },
      });

      if (booking.user.id !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: "Cette réservation ne vous appartient pas.",
        });
      }
      if (booking.status === CANCELLED) return;

      await manager.update(Booking, booking.id, { status: CANCELLED });
      await manager.increment(Event, { id: booking.event.id }, 'remainingSeats', booking.quantity);
    });

    return this.findOneWithEvent(bookingId);
  }

  private findOneWithEvent(id: string): Promise<Booking> {
    return this.bookings.findOneOrFail({
      where: { id },
      relations: { event: { location: true } },
    });
  }
}