import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'

jest.mock('../common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class MockJwtAuthGuard {
    canActivate() {
      return true
    }
  },
}))

jest.mock('../common/guards/optional-jwt-auth.guard', () => ({
  OptionalJwtAuthGuard: class MockOptionalJwtAuthGuard {
    canActivate() {
      return true
    }
  },
}))

import { ROLES_KEY } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AuthUser } from '../common/types/authenticated-request'
import { UserRole } from '../users/user.entity'
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

  const organizer: AuthUser = { id: 'org-1', role: UserRole.ORGANIZER }

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
    it('delegates event creation with the authenticated organizer id', async () => {
      const dto: CreateEventDto = {
        name: 'Conférence NestJS',
        description: 'Architecture modulaire et tests unitaires',
        startDate: '2026-12-15T18:00:00Z',
        endDate: '2026-12-15T20:00:00Z',
        locationId: 'loc-1',
        categoryId: 'cat-1',
        capacity: 50,
      }
      eventsService.create.mockResolvedValue(mockEventResponse)

      const result = await controller.create(dto, organizer)

      expect(eventsService.create).toHaveBeenCalledWith(dto, 'org-1')
      expect(result).toBe(mockEventResponse)
    })
  })

  describe('findOne', () => {
    it('delegates id lookup to EventsService.findOne', async () => {
      eventsService.findOne.mockResolvedValue(mockEventResponse)

      const result = await controller.findOne(mockEventResponse.id)

      expect(eventsService.findOne).toHaveBeenCalledWith(mockEventResponse.id, undefined)
      expect(result).toBe(mockEventResponse)
    })

    it('passes the identity of the authenticated viewer', async () => {
      await controller.findOne(mockEventResponse.id, organizer)
      expect(eventsService.findOne).toHaveBeenCalledWith(mockEventResponse.id, organizer.id)
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

      const result = await controller.update(mockEventResponse.id, dto, organizer)

      expect(eventsService.update).toHaveBeenCalledWith(mockEventResponse.id, dto, 'org-1')
      expect(result).toEqual(updatedEvent)
    })
  })

  describe('remove', () => {
    it('delegates deletion to EventsService.remove', async () => {
      eventsService.remove.mockResolvedValue(undefined)

      await expect(controller.remove(mockEventResponse.id, organizer)).resolves.toBeUndefined()
      expect(eventsService.remove).toHaveBeenCalledWith(mockEventResponse.id, 'org-1')
    })
  })
  describe('protection of writing routes', () => {
    // On lit les métadonnées posées par les décorateurs : la méthode n'est jamais appelée.
    const handlerOf = (method: keyof EventsController): object =>
      Object.getOwnPropertyDescriptor(EventsController.prototype, method)!.value as object

    it.each(['create', 'update', 'remove'] as const)(
      '%s requires a valid token and the organizer role',
      (method) => {
        const handler = handlerOf(method)

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard])
        expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ORGANIZER])
      },
    )

    it('keeps the catalogue public and reads an optional token on the detail route', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, handlerOf('findAll'))).toBeUndefined()
      expect(Reflect.getMetadata(GUARDS_METADATA, handlerOf('findOne'))).toEqual([
        OptionalJwtAuthGuard,
      ])
    })
  })
})
