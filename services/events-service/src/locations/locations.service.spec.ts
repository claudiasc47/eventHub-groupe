import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location } from '../entity/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

describe('LocationsService', () => {
  let service: LocationsService;

  const locationRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(Location),
          useValue: locationRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('doit créer un lieu', async () => {
      const dto: CreateLocationDto = {
        nom: 'Salle A',
        adresse: '1 rue Test',
        ville: 'Nantes',
        code_postal: '44000',
        capacite: 100,
      };

      const entity = { id: 'loc-1', ...dto } as Location;

      locationRepositoryMock.create.mockReturnValue(entity);
      locationRepositoryMock.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(locationRepositoryMock.create).toHaveBeenCalledWith(dto);
      expect(locationRepositoryMock.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('findAll', () => {
    it('doit retourner tous les lieux', async () => {
      const locations = [{ id: 'loc-1' }] as Location[];
      locationRepositoryMock.find.mockResolvedValue(locations);

      const result = await service.findAll();

      expect(locationRepositoryMock.find).toHaveBeenCalled();
      expect(result).toEqual(locations);
    });
  });

  describe('findOne', () => {
    it('doit retourner un lieu existant', async () => {
      const location = { id: 'loc-1' } as Location;
      locationRepositoryMock.findOne.mockResolvedValue(location);

      const result = await service.findOne('loc-1');

      expect(locationRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: 'loc-1' },
      });
      expect(result).toEqual(location);
    });

    it('doit lever NotFoundException si le lieu est absent', async () => {
      locationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.findOne('loc-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('doit mettre à jour un lieu existant', async () => {
      const location = {
        id: 'loc-1',
        nom: 'Ancien nom',
        adresse: '1 rue Test',
        ville: 'Nantes',
        code_postal: '44000',
        capacite: 100,
      } as Location;

      const dto: UpdateLocationDto = {
        nom: 'Nouveau nom',
        capacite: 150,
      };

      locationRepositoryMock.findOne.mockResolvedValue(location);
      locationRepositoryMock.save.mockResolvedValue({
        ...location,
        ...dto,
      });

      const result = await service.update('loc-1', dto);

      expect(locationRepositoryMock.findOne).toHaveBeenCalled();
      expect(location.nom).toBe('Nouveau nom');
      expect(location.capacite).toBe(150);
      expect(locationRepositoryMock.save).toHaveBeenCalledWith(location);
      expect(result.nom).toBe('Nouveau nom');
    });

    it('doit lever NotFoundException si le lieu est absent', async () => {
      locationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.update('loc-1', { nom: 'Test' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('doit supprimer un lieu existant', async () => {
      const location = { id: 'loc-1' } as Location;
      locationRepositoryMock.findOne.mockResolvedValue(location);

      await service.remove('loc-1');

      expect(locationRepositoryMock.remove).toHaveBeenCalledWith(location);
    });

    it('doit lever NotFoundException si le lieu est absent', async () => {
      locationRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.remove('loc-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(locationRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});
