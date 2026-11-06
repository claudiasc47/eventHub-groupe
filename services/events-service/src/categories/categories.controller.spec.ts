import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  const categoriesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: categoriesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('doit appeler CategoriesService.create et retourner la catégorie', async () => {
      const dto: CreateCategoryDto = { libelle: 'Conférence' };
      const expected = { id: 'cat-1', libelle: 'Conférence' };
      categoriesServiceMock.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(categoriesServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('doit appeler CategoriesService.findAll', async () => {
      const expected = [{ id: 'cat-1' }];
      categoriesServiceMock.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(categoriesServiceMock.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('doit appeler CategoriesService.findOne avec l’id', async () => {
      const expected = { id: 'cat-1' };
      categoriesServiceMock.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('cat-1');

      expect(categoriesServiceMock.findOne).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('doit appeler CategoriesService.update', async () => {
      const dto: UpdateCategoryDto = { libelle: 'Nouveau' };
      const expected = { id: 'cat-1', libelle: 'Nouveau' };
      categoriesServiceMock.update.mockResolvedValue(expected);

      const result = await controller.update('cat-1', dto);

      expect(categoriesServiceMock.update).toHaveBeenCalledWith('cat-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('doit appeler CategoriesService.remove', async () => {
      categoriesServiceMock.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cat-1');

      expect(categoriesServiceMock.remove).toHaveBeenCalledWith('cat-1');
      expect(result).toBeUndefined();
    });
  });
});
