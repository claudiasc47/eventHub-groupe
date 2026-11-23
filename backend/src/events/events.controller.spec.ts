import { Test, TestingModule } from '@nestjs/testing'
import { CreateEventDto } from './dto/create-event.dto'
import { FilterEventDto } from './dto/filter-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'

describe('EventsController', () => {
  let controller: EventsController
  let eventsService: jest.Mocked<
    Pick<EventsService, 'findAll' | 'create' | 'findOne' | 'update' | 'remove'>
  >

  const mockEventResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Conférence NestJS',
    description: 'Architecture modulaire et tests unitaires',
    startDate: new Date('2026-12-15T18:00:00Z'),
    endDate: new Date('2026-12-15T20:00:00Z'),
    location: { id: 'loc-1', name: 'Marseille' },
    category: { id: 'cat-1', name: 'Conférence' },
    status: 'PUBLISHED',
    capacity: 50,
    remainingSeats: 50,
    organizerId: 'org-1',
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    eventsService = {
      findAll: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: eventsService }],
    }).compile()

    controller = module.get(EventsController)
  })

  describe('findAll', () => {
    it('delegates query filters to EventsService.findAll', async () => {
      const filters: FilterEventDto = { q: 'NestJS', page: 1, pageSize: 20 }
      const paginatedResponse = {
        items: [mockEventResponse],
        page: 1,
        pageSize: 20,
        total: 1,
      }
      eventsService.findAll.mockResolvedValue(paginatedResponse)

      const result = await controller.findAll(filters)

      expect(eventsService.findAll).toHaveBeenCalledWith(filters)
      expect(result).toEqual(paginatedResponse)
    })
  })

  describe('create', () => {
    it('delegates event creation to EventsService.create', async () => {
      const dto: CreateEventDto = {
        name: 'Conférence NestJS',
        description: 'Architecture modulaire et tests unitaires',
        startDate: '2026-12-15T18:00:00Z',
        endDate: '2026-12-15T20:00:00Z',
        locationId: 'loc-1',
        categoryId: 'cat-1',
        organizerId: 'org-1',
        capacity: 50,
      }
      eventsService.create.mockResolvedValue(mockEventResponse)

      const result = await controller.create(dto)

      expect(eventsService.create).toHaveBeenCalledWith(dto)
      expect(result).toBe(mockEventResponse)
    })
  })

  describe('findOne', () => {
    it('delegates id lookup to EventsService.findOne', async () => {
      eventsService.findOne.mockResolvedValue(mockEventResponse)

      const result = await controller.findOne(mockEventResponse.id)

      expect(eventsService.findOne).toHaveBeenCalledWith(mockEventResponse.id)
      expect(result).toBe(mockEventResponse)
    })
  })

  describe('update', () => {
    it('delegates partial update to EventsService.update', async () => {
      const dto: UpdateEventDto = { name: 'Conférence NestJS v11' }
      const updatedEvent = {
        ...mockEventResponse,
        name: 'Conférence NestJS v11',
      }
      eventsService.update.mockResolvedValue(updatedEvent)

      const result = await controller.update(mockEventResponse.id, dto)

      expect(eventsService.update).toHaveBeenCalledWith(
        mockEventResponse.id,
        dto,
      )
      expect(result).toEqual(updatedEvent)
    })
  })

  describe('remove', () => {
    it('delegates deletion to EventsService.remove', async () => {
      eventsService.remove.mockResolvedValue(undefined)

      await expect(
        controller.remove(mockEventResponse.id),
      ).resolves.toBeUndefined()
      expect(eventsService.remove).toHaveBeenCalledWith(mockEventResponse.id)
    })
  })
})
