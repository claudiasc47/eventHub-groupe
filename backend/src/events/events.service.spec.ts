import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';
import { User, UserRole } from '../users/user.entity';
import { Event } from './event.entity';
import { EventsService } from './events.service';

/**
 * Tests unitaires du service EventsService.
 * On simule (mock) les repositories TypeORM afin de tester la logique métier
 * sans dépendre d'une vraie base de données PostgreSQL.
 */
describe('EventsService', () => {
  let service: EventsService;

  // Mocks des QueryBuilders utilisés pour les requêtes complexes (filtres, somme des places réservées)
  const eventQuery = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };
  const bookingQuery = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getRawOne: jest.fn(),
  };

  // Mocks des repositories TypeORM injectés dans EventsService
  const eventsRepository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const locationsRepository = { findOneBy: jest.fn() };
  const categoriesRepository = { findOneBy: jest.fn() };
  const usersRepository = { findOneBy: jest.fn() };
  const bookingsRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  // Jeu de données de référence réutilisé dans les différents scénarios de test
  const location = { id: 'location-id', name: 'Paris' };
  const category = { id: 'category-id', name: 'Music' };
  const organizer = { id: 'organizer-id', role: UserRole.ORGANIZER };
  const event = {
    id: 'event-id',
    name: 'Concert',
    description: 'Live music',
    startDate: new Date('2027-05-15T19:00:00Z'),
    endDate: new Date('2027-05-15T23:00:00Z'),
    location,
    category,
    organizer,
    status: 'DRAFT',
    capacity: 100,
    remainingSeats: 100,
    createdAt: new Date('2027-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    // Réinitialise tous les mocks avant chaque test pour éviter les effets de bord
    jest.clearAllMocks();

    // Permet le chaînage des méthodes du QueryBuilder (.where().andWhere().orderBy()...)
    for (const method of [
      eventQuery.leftJoinAndSelect,
      eventQuery.where,
      eventQuery.andWhere,
      eventQuery.orderBy,
      eventQuery.addOrderBy,
      eventQuery.skip,
      eventQuery.take,
    ]) {
      method.mockReturnValue(eventQuery);
    }
    for (const method of [
      bookingQuery.select,
      bookingQuery.where,
      bookingQuery.andWhere,
    ]) {
      method.mockReturnValue(bookingQuery);
    }

    eventsRepository.createQueryBuilder.mockReturnValue(eventQuery);
    bookingsRepository.createQueryBuilder.mockReturnValue(bookingQuery);
    // Par défaut, getOne renvoie une copie de l'événement brouillon
    eventQuery.getOne.mockResolvedValue({ ...event });

    // Création du module de test NestJS avec injection des mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: eventsRepository },
        {
          provide: getRepositoryToken(Location),
          useValue: locationsRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoriesRepository,
        },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  // --- Tests de récupération de liste (findAll) ---

  it('lists published events with pagination defaults and response shape', async () => {
    eventQuery.getManyAndCount.mockResolvedValue([[event], 1]);

    await expect(service.findAll({ page: 1, pageSize: 20 })).resolves.toEqual({
      items: [
        {
          id: 'event-id',
          name: 'Concert',
          description: 'Live music',
          startDate: event.startDate,
          endDate: event.endDate,
          location: { id: 'location-id', name: 'Paris' },
          category: { id: 'category-id', name: 'Music' },
          status: 'DRAFT',
          capacity: 100,
          remainingSeats: 100,
          organizerId: 'organizer-id',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    // Vérifie que seuls les événements publiés sont retournés par défaut, triés par date croissante
    expect(eventQuery.where).toHaveBeenCalledWith('event.status = :status', {
      status: 'PUBLISHED',
    });
    expect(eventQuery.orderBy).toHaveBeenCalledWith('event.startDate', 'ASC');
    expect(eventQuery.andWhere).not.toHaveBeenCalled();
    expect(eventQuery.skip).toHaveBeenCalledWith(0);
    expect(eventQuery.take).toHaveBeenCalledWith(20);
  });

  it('applies inclusive date-time bounds when ISO timestamps are provided', async () => {
    eventQuery.getManyAndCount.mockResolvedValue([[], 0]);

    await service.findAll({
      dateFrom: '2027-05-15T10:00:00.000Z',
      dateTo: '2027-05-15T22:00:00.000Z',
      page: 1,
      pageSize: 20,
      sort: 'startDate:asc',
    });

    // Avec un horodatage ISO complet, la borne dateTo est inclusive (<=)
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'event.startDate >= :dateFrom',
      {
        dateFrom: '2027-05-15T10:00:00.000Z',
      },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'event.startDate <= :dateTo',
      {
        dateTo: '2027-05-15T22:00:00.000Z',
      },
    );
    expect(eventQuery.orderBy).toHaveBeenCalledWith('event.startDate', 'ASC');
  });

  it('applies search, ID, inclusive date and descending sort filters', async () => {
    eventQuery.getManyAndCount.mockResolvedValue([[], 0]);

    await service.findAll({
      q: 'music',
      categoryId: 'category-id',
      locationId: 'location-id',
      dateFrom: '2027-05-15',
      dateTo: '2027-05-15',
      page: 2,
      pageSize: 10,
      sort: 'startDate:desc',
    });

    // Vérifie l'application de tous les filtres combinés et le calcul de l'offset (page 2 -> skip 10)
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      {
        search: '%music%',
      },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'category.id = :categoryId',
      {
        categoryId: 'category-id',
      },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'location.id = :locationId',
      {
        locationId: 'location-id',
      },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'event.startDate >= :dateFrom',
      {
        dateFrom: '2027-05-15T00:00:00.000Z',
      },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'event.startDate < :dateTo',
      {
        dateTo: '2027-05-16T00:00:00.000Z',
      },
    );
    expect(eventQuery.orderBy).toHaveBeenCalledWith('event.startDate', 'DESC');
    expect(eventQuery.addOrderBy).toHaveBeenCalledWith('event.id', 'ASC');
    expect(eventQuery.skip).toHaveBeenCalledWith(10);
  });

  // --- Tests de récupération unitaire (findOne) ---

  it('returns a published event by id to an anonymous visitor', async () => {
    eventQuery.getOne.mockResolvedValue({ ...event, status: 'PUBLISHED' });
    await expect(service.findOne('event-id')).resolves.toMatchObject({
      id: 'event-id',
      location: { id: 'location-id', name: 'Paris' },
      category: { id: 'category-id', name: 'Music' },
      organizerId: 'organizer-id',
    });
    expect(eventQuery.where).toHaveBeenCalledWith('event.id = :id', {
      id: 'event-id',
    });
  });

  it('returns a draft to its owner', async () => {
    await expect(
      service.findOne(event.id, organizer.id),
    ).resolves.toMatchObject({
      id: event.id,
      status: 'DRAFT',
    });
  });

  it.each([undefined, 'another-organizer'])(
    'hides the draft from viewer %s',
    async (viewerId) => {
      // Un brouillon ne doit pas fuiter : on renvoie une 404 aux visiteurs anonymes ou autres organisateurs
      await expect(service.findOne(event.id, viewerId)).rejects.toMatchObject({
        status: 404,
        message: `Event ${event.id} not found`,
      });
    },
  );

  it('throws when the requested event does not exist', async () => {
    eventQuery.getOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // --- Tests de création (create) ---

  it('creates a draft event with all seats available', async () => {
    locationsRepository.findOneBy.mockResolvedValue(location);
    categoriesRepository.findOneBy.mockResolvedValue(category);
    usersRepository.findOneBy.mockResolvedValue(organizer);
    const newEvent = {
      ...event,
      id: 'new-event',
      name: 'Concert',
      status: 'DRAFT',
    };
    eventsRepository.create.mockReturnValue(newEvent);
    eventsRepository.save.mockResolvedValue(newEvent);

    const result = await service.create(
      {
        name: '  Concert  ',
        description: 'Live music',
        startDate: '2027-05-15T19:00:00Z',
        endDate: '2027-05-15T23:00:00Z',
        locationId: 'location-id',
        categoryId: 'category-id',
        capacity: 100,
      },
      'organizer-id',
    );

    // Vérifie le nettoyage des espaces (trim) sur le nom et l'initialisation des places restantes
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({
      id: 'organizer-id',
    });
    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Concert',
        status: 'DRAFT',
        capacity: 100,
        remainingSeats: 100,
        startDate: new Date('2027-05-15T19:00:00Z'),
        endDate: new Date('2027-05-15T23:00:00Z'),
      }),
    );
    expect(result).toMatchObject({
      id: 'new-event',
      status: 'DRAFT',
      remainingSeats: 100,
    });
  });

  it('rejects an event whose end is before its start', async () => {
    await expect(
      service.create(
        {
          name: 'Invalid',
          startDate: '2027-05-15T23:00:00Z',
          endDate: '2027-05-15T19:00:00Z',
          locationId: 'location-id',
          categoryId: 'category-id',
          capacity: 10,
        },
        'organizer-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(locationsRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('requires an existing location, category and organizer', async () => {
    locationsRepository.findOneBy.mockResolvedValue(null);
    categoriesRepository.findOneBy.mockResolvedValue(category);
    usersRepository.findOneBy.mockResolvedValue(organizer);

    await expect(
      service.create(
        {
          name: 'Concert',
          startDate: '2027-05-15T19:00:00Z',
          endDate: '2027-05-15T23:00:00Z',
          locationId: 'missing',
          categoryId: 'category-id',
          capacity: 10,
        },
        'organizer-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['category', location, null, organizer],
    ['organizer', location, category, null],
  ])(
    'throws NotFoundException when %s does not exist on create',
    async (_, loc, cat, org) => {
      // Vérifie qu'une catégorie ou un organisateur inexistant déclenche bien une 404
      locationsRepository.findOneBy.mockResolvedValue(loc);
      categoriesRepository.findOneBy.mockResolvedValue(cat);
      usersRepository.findOneBy.mockResolvedValue(org);

      await expect(
        service.create(
          {
            name: 'Concert',
            startDate: '2027-05-15T19:00:00Z',
            endDate: '2027-05-15T23:00:00Z',
            locationId: 'location-id',
            categoryId: 'category-id',
            capacity: 10,
          },
          'organizer-id',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('requires the authenticated user to have the organizer role', async () => {
    locationsRepository.findOneBy.mockResolvedValue(location);
    categoriesRepository.findOneBy.mockResolvedValue(category);
    usersRepository.findOneBy.mockResolvedValue({
      id: 'user-id',
      role: UserRole.PARTICIPANT,
    });

    await expect(
      service.create(
        {
          name: 'Concert',
          startDate: '2027-05-15T19:00:00Z',
          endDate: '2027-05-15T23:00:00Z',
          locationId: 'location-id',
          categoryId: 'category-id',
          capacity: 10,
        },
        'user-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // --- Tests de mise à jour (update) ---

  it('publishes an event and recalculates remaining seats from confirmed bookings', async () => {
    // 4 places sont déjà confirmées -> sur une capacité de 20, il doit rester 16 places
    bookingQuery.getRawOne.mockResolvedValue({ quantity: '4' });
    eventsRepository.save.mockResolvedValue({
      ...event,
      status: 'PUBLISHED',
      capacity: 20,
      remainingSeats: 16,
    });

    const result = await service.update(
      'event-id',
      { capacity: 20, status: 'PUBLISHED' },
      'organizer-id',
    );

    expect(result).toMatchObject({
      status: 'PUBLISHED',
      capacity: 20,
      remainingSeats: 16,
    });
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'booking.status = :status',
      {
        status: 'CONFIRMED',
      },
    );
  });

  it('does not reduce capacity below confirmed reservations', async () => {
    // Impossible de baisser la capacité à 10 si 12 places sont déjà réservées
    bookingQuery.getRawOne.mockResolvedValue({ quantity: '12' });

    await expect(
      service.update('event-id', { capacity: 10 }, 'organizer-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(eventsRepository.save).not.toHaveBeenCalled();
  });

  it('refuses to update an event owned by another organizer', async () => {
    await expect(
      service.update('event-id', { name: 'Hijacked' }, 'another-organizer'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(eventsRepository.save).not.toHaveBeenCalled();
  });

  it('updates event details, location and category', async () => {
    const newLocation = { id: 'loc-2', name: 'Lyon' };
    const newCategory = { id: 'cat-2', name: 'Conference' };
    locationsRepository.findOneBy.mockResolvedValue(newLocation);
    categoriesRepository.findOneBy.mockResolvedValue(newCategory);
    // Retourne l'objet sauvegardé tel quel pour vérifier les champs mis à jour
    eventsRepository.save.mockImplementation((e: Record<string, unknown>) =>
      Promise.resolve(e),
    );

    const result = await service.update(
      'event-id',
      {
        name: '  Tech Conf  ',
        description: 'Updated description',
        locationId: 'loc-2',
        categoryId: 'cat-2',
      },
      'organizer-id',
    );

    expect(result).toMatchObject({
      name: 'Tech Conf',
      description: 'Updated description',
      location: newLocation,
      category: newCategory,
    });
  });

  it('throws NotFoundException when updated location or category is missing', async () => {
    locationsRepository.findOneBy.mockResolvedValue(null);
    await expect(
      service.update('event-id', { locationId: 'missing-loc' }, 'organizer-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    categoriesRepository.findOneBy.mockResolvedValue(null);
    await expect(
      service.update('event-id', { categoryId: 'missing-cat' }, 'organizer-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // --- Tests de suppression (remove) ---

  it('rejects deleting an event with bookings', async () => {
    bookingsRepository.count.mockResolvedValue(1);

    await expect(
      service.remove('event-id', 'organizer-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(eventsRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes an event without bookings', async () => {
    bookingsRepository.count.mockResolvedValue(0);
    eventsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(
      service.remove('event-id', 'organizer-id'),
    ).resolves.toBeUndefined();
    expect(eventsRepository.delete).toHaveBeenCalledWith('event-id');
  });

  it('refuses to delete an event owned by another organizer', async () => {
    bookingsRepository.count.mockResolvedValue(0);

    await expect(
      service.remove('event-id', 'another-organizer'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(eventsRepository.delete).not.toHaveBeenCalled();
  });

  it('translates PostgreSQL foreign key violation (23503) into ConflictException on remove', async () => {
    // Simule une contrainte d'intégrité PostgreSQL (code 23503) si une réservation apparaît en parallèle
    bookingsRepository.count.mockResolvedValue(0);
    eventsRepository.delete.mockRejectedValue(
      new QueryFailedError(
        'DELETE FROM events',
        [],
        Object.assign(new Error('fk'), { code: '23503' }),
      ),
    );

    await expect(
      service.remove('event-id', 'organizer-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
