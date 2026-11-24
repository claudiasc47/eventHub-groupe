import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { EventStatus } from '../entity/event.entity';

describe('EventsController', () => {
  let controller: EventsController;

  const eventsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: eventsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('doit appeler EventsService.create et retourner le résultat', async () => {
      const dto: CreateEventDto = {
        nom: 'Conf Nest',
        description: 'Test',
        date_debut: '2025-12-10',
        date_fin: '2025-12-11',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        status: EventStatus.DRAFT,
      };

      const expected = { id: 'evt-1', ...dto };
      eventsServiceMock.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(eventsServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('doit appeler EventsService.findAll avec les filtres', async () => {
      const filter: FilterEventDto = {
        status: EventStatus.PUBLISHED,
        search: 'Conf',
      };

      const expected = [{ id: 'evt-1' }];
      eventsServiceMock.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(filter);

      expect(eventsServiceMock.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('doit appeler EventsService.findOne avec l’id', async () => {
      const expected = { id: 'evt-1' };
      eventsServiceMock.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('evt-1');

      expect(eventsServiceMock.findOne).toHaveBeenCalledWith('evt-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('doit appeler EventsService.update avec l’id et le dto', async () => {
      const dto: UpdateEventDto = { nom: 'Nouveau nom' };
      const expected = { id: 'evt-1', nom: 'Nouveau nom' };
      eventsServiceMock.update.mockResolvedValue(expected);

      const result = await controller.update('evt-1', dto);

      expect(eventsServiceMock.update).toHaveBeenCalledWith('evt-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('doit appeler EventsService.remove avec l’id', async () => {
      eventsServiceMock.remove.mockResolvedValue(undefined);

      const result = await controller.remove('evt-1');

      expect(eventsServiceMock.remove).toHaveBeenCalledWith('evt-1');
      expect(result).toBeUndefined();
    });
  });
});
