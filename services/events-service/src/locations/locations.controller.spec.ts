import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

describe('LocationsController', () => {
  let controller: LocationsController;

  const locationsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: locationsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('doit appeler LocationsService.create et retourner le lieu', async () => {
      const dto: CreateLocationDto = {
        nom: 'Salle A',
        adresse: '1 rue Test',
        ville: 'Nantes',
        code_postal: '44000',
        capacite: 100,
      };

      const expected = { id: 'loc-1', ...dto };
      locationsServiceMock.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(locationsServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('doit appeler LocationsService.findAll', async () => {
      const expected = [{ id: 'loc-1' }];
      locationsServiceMock.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(locationsServiceMock.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('doit appeler LocationsService.findOne avec l’id', async () => {
      const expected = { id: 'loc-1' };
      locationsServiceMock.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('loc-1');

      expect(locationsServiceMock.findOne).toHaveBeenCalledWith('loc-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('doit appeler LocationsService.update', async () => {
      const dto: UpdateLocationDto = {
        nom: 'Salle B',
      };

      const expected = { id: 'loc-1', nom: 'Salle B' };
      locationsServiceMock.update.mockResolvedValue(expected);

      const result = await controller.update('loc-1', dto);

      expect(locationsServiceMock.update).toHaveBeenCalledWith('loc-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('doit appeler LocationsService.remove', async () => {
      locationsServiceMock.remove.mockResolvedValue(undefined);

      const result = await controller.remove('loc-1');

      expect(locationsServiceMock.remove).toHaveBeenCalledWith('loc-1');
      expect(result).toBeUndefined();
    });
  });
});
