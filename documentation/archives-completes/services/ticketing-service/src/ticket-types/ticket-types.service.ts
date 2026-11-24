import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere, Like } from 'typeorm'
import { TicketType, TicketTypeStatus } from '../entity/ticket-type.entity'
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto'
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto'
import { FilterTicketTypeDto } from './dto/filter-ticket-type.dto'

@Injectable()
export class TicketTypesService {
  constructor(
    @InjectRepository(TicketType)
    private readonly ticketTypeRepository: Repository<TicketType>,
  ) {}

  async create(dto: CreateTicketTypeDto): Promise<TicketType> {
    const ticketType = this.ticketTypeRepository.create({
      eventId: dto.eventId,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      totalCapacity: dto.totalCapacity,
      status: dto.status || TicketTypeStatus.ACTIVE,
      soldCount: 0,
    })

    return this.ticketTypeRepository.save(ticketType)
  }

  async findAll(filter: FilterTicketTypeDto): Promise<TicketType[]> {
    const where: FindOptionsWhere<TicketType> = {}

    if (filter.eventId) {
      where.eventId = filter.eventId
    }

    if (filter.status) {
      where.status = filter.status
    }

    if (filter.search) {
      where.name = Like(`%${filter.search}%`)
    }

    return this.ticketTypeRepository.find({
      where,
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<TicketType> {
    const ticketType = await this.ticketTypeRepository.findOne({
      where: { id },
    })

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found')
    }

    return ticketType
  }

  async findByEventId(eventId: string): Promise<TicketType[]> {
    return this.ticketTypeRepository.find({
      where: { eventId },
      order: { price: 'ASC' },
    })
  }

  async update(id: string, dto: UpdateTicketTypeDto): Promise<TicketType> {
    const ticketType = await this.findOne(id)

    // Vérifier que soldCount ne dépasse pas totalCapacity
    if (dto.soldCount !== undefined && dto.soldCount > ticketType.totalCapacity) {
      throw new BadRequestException('Sold count cannot exceed total capacity')
    }

    Object.assign(ticketType, dto)

    // Mettre à jour le statut si vendu
    if (ticketType.isSoldOut && ticketType.status !== TicketTypeStatus.SOLD_OUT) {
      ticketType.status = TicketTypeStatus.SOLD_OUT
    }

    return this.ticketTypeRepository.save(ticketType)
  }

  async incrementSoldCount(id: string, quantity: number): Promise<TicketType> {
    const ticketType = await this.findOne(id)

    if (ticketType.availableTickets < quantity) {
      throw new BadRequestException('Not enough tickets available')
    }

    ticketType.soldCount += quantity

    if (ticketType.isSoldOut) {
      ticketType.status = TicketTypeStatus.SOLD_OUT
    }

    return this.ticketTypeRepository.save(ticketType)
  }

  async decrementSoldCount(id: string, quantity: number): Promise<TicketType> {
    const ticketType = await this.findOne(id)

    ticketType.soldCount = Math.max(0, ticketType.soldCount - quantity)

    if (!ticketType.isSoldOut && ticketType.status === TicketTypeStatus.SOLD_OUT) {
      ticketType.status = TicketTypeStatus.ACTIVE
    }

    return this.ticketTypeRepository.save(ticketType)
  }

  async remove(id: string): Promise<void> {
    const ticketType = await this.findOne(id)

    if (ticketType.soldCount > 0) {
      throw new BadRequestException('Cannot delete ticket type with existing bookings')
    }

    await this.ticketTypeRepository.remove(ticketType)
  }
}
