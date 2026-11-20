import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Booking } from '../bookings/booking.entity'
import { Category } from '../categories/category.entity'
import { isPostgresErrorCode } from '../database/is-postgres-error-code'
import { Location } from '../locations/location.entity'
import { User, UserRole } from '../users/user.entity'
import { CreateEventDto } from './dto/create-event.dto'
import { FilterEventDto } from './dto/filter-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { Event } from './event.entity'

type EventResponse = {
  id: string
  name: string
  description: string | null
  startDate: Date
  endDate: Date
  location: { id: string; name: string }
  category: { id: string; name: string }
  status: string
  capacity: number
  remainingSeats: number
  organizerId: string
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async findAll(filters: FilterEventDto) {
    const query = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.location', 'location')
      .leftJoinAndSelect('event.category', 'category')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .where('event.status = :status', { status: 'PUBLISHED' })

    if (filters.q) {
      query.andWhere(
        "(event.name ILIKE :search OR COALESCE(event.description, '') ILIKE :search)",
        { search: `%${filters.q}%` },
      )
    }
    if (filters.categoryId) {
      query.andWhere('category.id = :categoryId', {
        categoryId: filters.categoryId,
      })
    }
    if (filters.locationId) {
      query.andWhere('location.id = :locationId', {
        locationId: filters.locationId,
      })
    }
    if (filters.dateFrom) {
      query.andWhere('event.startDate >= :dateFrom', {
        dateFrom: this.inclusiveDateFrom(filters.dateFrom),
      })
    }
    if (filters.dateTo) {
      const dateTo = this.inclusiveDateTo(filters.dateTo)
      query.andWhere(
        dateTo.exclusive ? 'event.startDate < :dateTo' : 'event.startDate <= :dateTo',
        { dateTo: dateTo.value },
      )
    }

    const [events, total] = await query
      .orderBy('event.startDate', filters.sort === 'startDate:desc' ? 'DESC' : 'ASC')
      .addOrderBy('event.id', 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount()

    return {
      items: events.map((event) => this.toResponse(event)),
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    }
  }

  async findOne(id: string): Promise<EventResponse> {
    const event = await this.loadEvent(id)
    return this.toResponse(event)
  }

  async create(input: CreateEventDto): Promise<EventResponse> {
    const startDate = new Date(input.startDate)
    const endDate = new Date(input.endDate)
    this.assertDateRange(startDate, endDate)

    const [location, category, organizer] = await Promise.all([
      this.locationsRepository.findOneBy({ id: input.locationId }),
      this.categoriesRepository.findOneBy({ id: input.categoryId }),
      this.usersRepository.findOneBy({ id: input.organizerId }),
    ])
    if (!location) {
      throw new NotFoundException(`Location ${input.locationId} not found`)
    }
    if (!category) {
      throw new NotFoundException(`Category ${input.categoryId} not found`)
    }
    if (!organizer) {
      throw new NotFoundException(`Organizer ${input.organizerId} not found`)
    }
    if (organizer.role !== UserRole.ORGANIZER) {
      throw new BadRequestException('organizerId must refer to a user with the organizer role.')
    }

    const event = this.eventsRepository.create({
      name: input.name.trim(),
      description: input.description ?? null,
      startDate,
      endDate,
      location,
      category,
      organizer,
      status: 'DRAFT',
      capacity: input.capacity,
      remainingSeats: input.capacity,
    })
    return this.toResponse(await this.eventsRepository.save(event))
  }

  async update(id: string, input: UpdateEventDto): Promise<EventResponse> {
    const event = await this.loadEvent(id)
    const startDate = input.startDate ? new Date(input.startDate) : event.startDate
    const endDate = input.endDate ? new Date(input.endDate) : event.endDate
    this.assertDateRange(startDate, endDate)

    if (input.name !== undefined) {
      event.name = input.name.trim()
    }
    if (input.description !== undefined) {
      event.description = input.description
    }
    event.startDate = startDate
    event.endDate = endDate

    if (input.locationId) {
      const location = await this.locationsRepository.findOneBy({
        id: input.locationId,
      })
      if (!location) {
        throw new NotFoundException(`Location ${input.locationId} not found`)
      }
      event.location = location
    }
    if (input.categoryId) {
      const category = await this.categoriesRepository.findOneBy({
        id: input.categoryId,
      })
      if (!category) {
        throw new NotFoundException(`Category ${input.categoryId} not found`)
      }
      event.category = category
    }
    if (input.capacity !== undefined) {
      const reserved = await this.getConfirmedQuantity(id)
      if (input.capacity < reserved) {
        throw new ConflictException(
          `Capacity cannot be lower than the ${reserved} confirmed reserved seats.`,
        )
      }
      event.capacity = input.capacity
      event.remainingSeats = input.capacity - reserved
    }
    if (input.status) {
      event.status = input.status
    }

    return this.toResponse(await this.eventsRepository.save(event))
  }

  async remove(id: string): Promise<void> {
    await this.loadEvent(id)
    const bookingCount = await this.bookingsRepository.count({
      where: { event: { id } },
    })
    if (bookingCount > 0) {
      throw new ConflictException('This event cannot be deleted because it has bookings.')
    }

    try {
      await this.eventsRepository.delete(id)
    } catch (error) {
      if (isPostgresErrorCode(error, '23503')) {
        throw new ConflictException('This event cannot be deleted because it has bookings.')
      }
      throw error
    }
  }

  private async loadEvent(id: string): Promise<Event> {
    const event = await this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.location', 'location')
      .leftJoinAndSelect('event.category', 'category')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .where('event.id = :id', { id })
      .getOne()
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`)
    }
    return event
  }

  private async getConfirmedQuantity(eventId: string): Promise<number> {
    const result = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('COALESCE(SUM(booking.quantity), 0)', 'quantity')
      .where('booking.event_id = :eventId', { eventId })
      .andWhere('booking.status = :status', { status: 'CONFIRMED' })
      .getRawOne<{ quantity: string }>()
    return Number(result?.quantity ?? 0)
  }

  private assertDateRange(startDate: Date, endDate: Date): void {
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate
    ) {
      throw new BadRequestException('Event endDate must be greater than or equal to startDate.')
    }
  }

  private inclusiveDateFrom(date: string): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00.000Z` : date
  }

  private inclusiveDateTo(date: string): {
    value: string
    exclusive: boolean
  } {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const nextDay = new Date(`${date}T00:00:00.000Z`)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      return { value: nextDay.toISOString(), exclusive: true }
    }
    return { value: date, exclusive: false }
  }

  private toResponse(event: Event): EventResponse {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: { id: event.location.id, name: event.location.name },
      category: { id: event.category.id, name: event.category.name },
      status: event.status,
      capacity: event.capacity,
      remainingSeats: event.remainingSeats,
      organizerId: event.organizer.id,
    }
  }
}
