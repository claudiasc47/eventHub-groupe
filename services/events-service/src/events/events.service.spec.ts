import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event, EventStatus } from '../entity/event.entity';
import { Category } from '../entity/category.entity';
import { Location } from '../entity/location.entity';
import { ClientProxy } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

describe('EventsService', () => {
  let service: EventsService;

  const eventRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const categoryRepositoryMock = {
    findOne: jest.fn(),
  };

  const locationRepositoryMock = {
    findOne: jest.fn(),
  };

  const eventsClientMock: Pick<ClientProxy, 'emit'> = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: eventRepositoryMock,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepositoryMock,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: locationRepositoryMock,
        },
        {
          provide: 'EVENT_BROKER',
          useValue: eventsClientMock,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('doit créer un event et publier event.created', async () => {
      const dto: CreateEventDto = {
        nom: 'Conf Nest',
        description: 'Test',
        date_debut: '2025-12-10',
        date_fin: '2025-12-11',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        status: EventStatus.DRAFT,
      };

      const category = { id: 'cat-1', libelle: 'Conférence' } as Category;
      const location = { id: 'loc-1', nom: 'Salle A' } as Location;
      const savedEvent = {
        id: 'evt-1',
        nom: dto.nom,
        description: dto.description,
        date_debut: new Date(dto.date_debut),
        date_fin: new Date(dto.date_fin),
        status: dto.status,
        category,
        location,
        createdAt: new Date(),
      } as Event;

      categoryRepositoryMock.findOne.mockResolvedValue(category);
      locationRepositoryMock.findOne.mockResolvedValue(location);
      eventRepositoryMock.create.mockReturnValue(savedEvent);
      eventRepositoryMock.save.mockResolvedValue(savedEvent);

      const result = await service.create(dto);

      expect(categoryRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: dto.categoryId },
      });
      expect(locationRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: dto.locationId },
      });
      expect(eventRepositoryMock.create).toHaveBeenCalled();
      expect(eventRepositoryMock.save).toHaveBeenCalledWith(savedEvent);

      expect(eventsClientMock.emit).toHaveBeenCalledWith(
        'event.created',
        expect.objectContaining({
          id: savedEvent.id,
          nom: savedEvent.nom,
        }),
      );

      expect(result).toEqual(savedEvent);
    });

    it('doit lever NotFoundException si la catégorie est absente', async () => {
      const dto: CreateEventDto = {
        nom: 'Conf Nest',
        description: 'Test',
        date_debut: '2025-12-10',
        date_fin: '2025-12-11',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        status: EventStatus.DRAFT,
      };

      categoryRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(locationRepositoryMock.findOne).not.toHaveBeenCalled();
      expect(eventRepositoryMock.save).not.toHaveBeenCalled();
      expect(eventsClientMock.emit).not.toHaveBeenCalled();
    });

    it('doit lever NotFoundException si le lieu est absent', async () => {
      const dto: CreateEventDto = {
        nom: 'Conf Nest',
        description: 'Test',
        date_debut: '2025-12-10',
        date_fin: '2025-12-11',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        status: EventStatus.DRAFT,
      };

      const category = { id: 'cat-1', libelle: 'Conférence' } as Category;
      categoryRepositoryMock.findOne.mockResolvedValue(category);
      locationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(eventRepositoryMock.save).not.toHaveBeenCalled();
      expect(eventsClientMock.emit).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('doit retourner un event existant', async () => {
      const event = { id: 'evt-1' } as Event;
      eventRepositoryMock.findOne.mockResolvedValue(event);

      const result = await service.findOne('evt-1');

      expect(eventRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        relations: ['category', 'location'],
      });
      expect(result).toEqual(event);
    });

    it('doit lever NotFoundException si event inexistant', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.findOne('evt-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('doit mettre à jour un event existant', async () => {
      const category = { id: 'cat-1', libelle: 'Conf' } as Category;
      const location = { id: 'loc-1', nom: 'Salle A' } as Location;

      const existingEvent = {
        id: 'evt-1',
        nom: 'Ancien nom',
        description: 'Ancienne desc',
        category,
        location,
      } as Event;

      const dto: UpdateEventDto = {
        nom: 'Nouveau nom',
        description: 'Nouvelle desc',
      };

      eventRepositoryMock.findOne.mockResolvedValue(existingEvent);
      eventRepositoryMock.save.mockResolvedValue(existingEvent);

      const result = await service.update('evt-1', dto);

      expect(eventRepositoryMock.findOne).toHaveBeenCalled();
      expect(existingEvent.nom).toBe('Nouveau nom');
      expect(existingEvent.description).toBe('Nouvelle desc');
      expect(eventRepositoryMock.save).toHaveBeenCalledWith(existingEvent);
      expect(eventsClientMock.emit).toHaveBeenCalledWith(
        'event.updated',
        expect.objectContaining({
          id: existingEvent.id,
          categoryId: category.id,
          locationId: location.id,
        }),
      );
      expect(result).toEqual(existingEvent);
    });

    it('doit lever NotFoundException si event inexistant', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.update('evt-1', { nom: 'test' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('doit mettre à jour la catégorie si categoryId fourni', async () => {
      const oldCategory = { id: 'cat-1', libelle: 'Ancienne' } as Category;
      const newCategory = { id: 'cat-2', libelle: 'Nouveau' } as Category;
      const location = { id: 'loc-1', nom: 'Salle A' } as Location;

      const existingEvent = {
        id: 'evt-1',
        nom: 'Nom',
        category: oldCategory,
        location,
      } as Event;

      eventRepositoryMock.findOne.mockResolvedValue(existingEvent);
      categoryRepositoryMock.findOne.mockResolvedValue(newCategory);
      eventRepositoryMock.save.mockResolvedValue(existingEvent);

      const dto: UpdateEventDto = {
        categoryId: 'cat-2',
      };

      const result = await service.update('evt-1', dto);

      expect(categoryRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-2' },
      });
      expect(existingEvent.category).toBe(newCategory);
      expect(eventsClientMock.emit).toHaveBeenCalledWith(
        'event.updated',
        expect.objectContaining({
          id: existingEvent.id,
          categoryId: newCategory.id,
          locationId: location.id,
        }),
      );
      expect(result).toEqual(existingEvent);
    });
  });

  describe('remove', () => {
    it('doit supprimer un event existant', async () => {
      const existingEvent = { id: 'evt-1' } as Event;
      eventRepositoryMock.findOne.mockResolvedValue(existingEvent);
      eventRepositoryMock.remove.mockResolvedValue(existingEvent);

      await service.remove('evt-1');

      expect(eventRepositoryMock.remove).toHaveBeenCalledWith(existingEvent);
      expect(eventsClientMock.emit).toHaveBeenCalledWith('event.deleted', {
        id: existingEvent.id,
      });
    });

    it('doit lever NotFoundException si event inexistant', async () => {
      eventRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.remove('evt-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(eventRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});
