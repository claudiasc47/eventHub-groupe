import { Injectable, NotFoundException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ClientProxy } from '@nestjs/microservices'
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm'
import { Event } from '../entity/event.entity'
import { Category } from '../entity/category.entity'
import { Location } from '../entity/location.entity'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { FilterEventDto } from './dto/filter-event.dto'

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @Inject('EVENT_BROKER')
    private readonly eventsClient: ClientProxy,
  ) {}

  async create(dto: CreateEventDto): Promise<Event> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    })
    if (!category) {
      throw new NotFoundException('Category not found')
    }

    const location = await this.locationRepository.findOne({
      where: { id: dto.locationId },
    })
    if (!location) {
      throw new NotFoundException('Location not found')
    }

    const event = this.eventRepository.create({
      nom: dto.nom,
      description: dto.description,
      date_debut: new Date(dto.date_debut),
      date_fin: new Date(dto.date_fin),
      status: dto.status,
      category,
      location,
    })

    const saved = await this.eventRepository.save(event)

    // Publication de l’événement métier dans RabbitMQ
    this.eventsClient.emit('event.created', {
      id: saved.id,
      nom: saved.nom,
      date_debut: saved.date_debut,
      date_fin: saved.date_fin,
      status: saved.status,
      categoryId: category.id,
      locationId: location.id,
      createdAt: saved.createdAt,
    })

    return saved
  }

  async findAll(filter: FilterEventDto): Promise<Event[]> {
    const where: FindOptionsWhere<Event> = {}

    if (filter.status) {
      where.status = filter.status
    }

    if (filter.search) {
      where.nom = Like(`%${filter.search}%`)
      // pour filtrer aussi sur description, tu peux utiliser QueryBuilder
    }

    if (filter.categoryId) {
      where.category = { id: filter.categoryId }
    }

    if (filter.locationId) {
      where.location = { id: filter.locationId }
    }

    if (filter.dateFrom && filter.dateTo) {
      where.date_debut = Between(new Date(filter.dateFrom), new Date(filter.dateTo))
    }

    return this.eventRepository.find({
      where,
      relations: ['category', 'location'],
      order: { date_debut: 'ASC' },
    })
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['category', 'location'],
    })
    if (!event) {
      throw new NotFoundException('Event not found')
    }
    return event
  }

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id)

    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      })
      if (!category) {
        throw new NotFoundException('Category not found')
      }
      event.category = category
    }

    if (dto.locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: dto.locationId },
      })
      if (!location) {
        throw new NotFoundException('Location not found')
      }
      event.location = location
    }

    if (dto.nom !== undefined) event.nom = dto.nom
    if (dto.description !== undefined) event.description = dto.description
    if (dto.date_debut !== undefined) event.date_debut = new Date(dto.date_debut)
    if (dto.date_fin !== undefined) event.date_fin = new Date(dto.date_fin)
    if (dto.status !== undefined) event.status = dto.status

    const saved = await this.eventRepository.save(event)

    this.eventsClient.emit('event.updated', {
      id: saved.id,
      nom: saved.nom,
      date_debut: saved.date_debut,
      date_fin: saved.date_fin,
      status: saved.status,
      categoryId: saved.category.id,
      locationId: saved.location.id,
      updatedAt: saved.updatedAt,
    })

    return saved
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id)
    await this.eventRepository.remove(event)

    this.eventsClient.emit('event.deleted', {
      id: event.id,
    })
  }
}
