import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { Location } from './location.entity';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  const repository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Location), useValue: repository },
      ],
    }).compile();

    service = module.get(LocationsService);
  });

  it('lists locations alphabetically', async () => {
    const locations = [{ id: '1', name: 'Paris' }];
    repository.find.mockResolvedValue(locations);

    await expect(service.findAll()).resolves.toBe(locations);
    expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  it('returns a location by id', async () => {
    const location = { id: '1', name: 'Paris' };
    repository.findOneBy.mockResolvedValue(location);

    await expect(service.findOne('1')).resolves.toBe(location);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: '1' });
  });

  it('throws when a location does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a location', async () => {
    const input = { name: 'Paris' };
    const location = { id: '1', ...input };
    repository.create.mockReturnValue(location);
    repository.save.mockResolvedValue(location);

    await expect(service.create(input)).resolves.toBe(location);
    expect(repository.create).toHaveBeenCalledWith(input);
    expect(repository.save).toHaveBeenCalledWith(location);
  });

  it('rejects duplicate location names', async () => {
    repository.create.mockReturnValue({ name: 'Paris' });
    repository.save.mockRejectedValue(
      new QueryFailedError('query', [], { code: '409' }),
    );

    await expect(service.create({ name: 'Paris' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('updates a location', async () => {
    const location = { id: '1', name: 'Paris' };
    repository.findOneBy.mockResolvedValue(location);
    repository.save.mockImplementation(async (value) => value);

    await expect(service.update('1', { name: 'Lyon' })).resolves.toEqual({
      id: '1',
      name: 'Lyon',
    });
  });

  it('deletes an unused location', async () => {
    repository.findOneBy.mockResolvedValue({ id: '1', name: 'Paris' });
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove('1')).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith('1');
  });

  it('rejects deleting a location used by an event', async () => {
    repository.findOneBy.mockResolvedValue({ id: '1', name: 'Paris' });
    repository.delete.mockRejectedValue(
      new QueryFailedError('query', [], { code: '23503' }),
    );

    await expect(service.remove('1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
