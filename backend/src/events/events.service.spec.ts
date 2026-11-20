import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from '../bookings/booking.entity';
import { Category } from '../categories/category.entity';
import { Location } from '../locations/location.entity';
import { User, UserRole } from '../users/user.entity';
import { Event } from './event.entity';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;

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
    jest.clearAllMocks();
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
    eventQuery.getOne.mockResolvedValue(event);

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
    expect(eventQuery.where).toHaveBeenCalledWith('event.status = :status', {
      status: 'PUBLISHED',
    });
    expect(eventQuery.skip).toHaveBeenCalledWith(0);
    expect(eventQuery.take).toHaveBeenCalledWith(20);
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

    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      { search: '%music%' },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'category.id = :categoryId',
      { categoryId: 'category-id' },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'location.id = :locationId',
      { locationId: 'location-id' },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'event.startDate >= :dateFrom',
      { dateFrom: '2027-05-15T00:00:00.000Z' },
    );
    expect(eventQuery.andWhere).toHaveBeenCalledWith(
      'event.startDate < :dateTo',
      { dateTo: '2027-05-16T00:00:00.000Z' },
    );
    expect(eventQuery.orderBy).toHaveBeenCalledWith('event.startDate', 'DESC');
    expect(eventQuery.addOrderBy).toHaveBeenCalledWith('event.id', 'ASC');
    expect(eventQuery.skip).toHaveBeenCalledWith(10);
  });

  it('returns an event by id', async () => {
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

  it('throws when the requested event does not exist', async () => {
    eventQuery.getOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a draft event with all seats available', async () => {
    locationsRepository.findOneBy.mockResolvedValue(location);
    categoriesRepository.findOneBy.mockResolvedValue(category);
    usersRepository.findOneBy.mockResolvedValue(organizer);
    eventsRepository.create.mockImplementation((input) => input);
    eventsRepository.save.mockImplementation(async (input) => ({
      id: 'new-event',
      ...input,
    }));

    const result = await service.create({
      name: '  Concert  ',
      description: 'Live music',
      startDate: '2027-05-15T19:00:00Z',
      endDate: '2027-05-15T23:00:00Z',
      locationId: 'location-id',
      categoryId: 'category-id',
      organizerId: 'organizer-id',
      capacity: 100,
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
      service.create({
        name: 'Invalid',
        startDate: '2027-05-15T23:00:00Z',
        endDate: '2027-05-15T19:00:00Z',
        locationId: 'location-id',
        categoryId: 'category-id',
        organizerId: 'organizer-id',
        capacity: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(locationsRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('requires an existing location, category and organizer', async () => {
    locationsRepository.findOneBy.mockResolvedValue(null);
    categoriesRepository.findOneBy.mockResolvedValue(category);
    usersRepository.findOneBy.mockResolvedValue(organizer);

    await expect(
      service.create({
        name: 'Concert',
        startDate: '2027-05-15T19:00:00Z',
        endDate: '2027-05-15T23:00:00Z',
        locationId: 'missing',
        categoryId: 'category-id',
        organizerId: 'organizer-id',
        capacity: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires the selected user to have the organizer role', async () => {
    locationsRepository.findOneBy.mockResolvedValue(location);
    categoriesRepository.findOneBy.mockResolvedValue(category);
    usersRepository.findOneBy.mockResolvedValue({
      id: 'user-id',
      role: UserRole.PARTICIPANT,
    });

    await expect(
      service.create({
        name: 'Concert',
        startDate: '2027-05-15T19:00:00Z',
        endDate: '2027-05-15T23:00:00Z',
        locationId: 'location-id',
        categoryId: 'category-id',
        organizerId: 'user-id',
        capacity: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes an event and recalculates remaining seats from confirmed bookings', async () => {
    bookingQuery.getRawOne.mockResolvedValue({ quantity: '4' });
    eventsRepository.save.mockImplementation(async (value) => value);

    const result = await service.update('event-id', {
      capacity: 20,
      status: 'PUBLISHED',
    });

    expect(result).toMatchObject({
      status: 'PUBLISHED',
      capacity: 20,
      remainingSeats: 16,
    });
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'booking.status = :status',
      { status: 'CONFIRMED' },
    );
  });

  it('does not reduce capacity below confirmed reservations', async () => {
    bookingQuery.getRawOne.mockResolvedValue({ quantity: '12' });

    await expect(
      service.update('event-id', { capacity: 10 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(eventsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects deleting an event with bookings', async () => {
    bookingsRepository.count.mockResolvedValue(1);

    await expect(service.remove('event-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(eventsRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes an event without bookings', async () => {
    bookingsRepository.count.mockResolvedValue(0);
    eventsRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove('event-id')).resolves.toBeUndefined();
    expect(eventsRepository.delete).toHaveBeenCalledWith('event-id');
  });
});
