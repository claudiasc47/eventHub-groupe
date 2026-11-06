import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../entity/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const categoryRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('doit créer une catégorie', async () => {
      const dto: CreateCategoryDto = { libelle: 'Conférence' };
      const entity = { id: 'cat-1', libelle: dto.libelle } as Category;

      categoryRepositoryMock.create.mockReturnValue(entity);
      categoryRepositoryMock.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(categoryRepositoryMock.create).toHaveBeenCalledWith(dto);
      expect(categoryRepositoryMock.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('findAll', () => {
    it('doit retourner toutes les catégories', async () => {
      const categories = [{ id: 'cat-1' }] as Category[];
      categoryRepositoryMock.find.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(categoryRepositoryMock.find).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('findOne', () => {
    it('doit retourner une catégorie existante', async () => {
      const category = { id: 'cat-1' } as Category;
      categoryRepositoryMock.findOne.mockResolvedValue(category);

      const result = await service.findOne('cat-1');

      expect(categoryRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(result).toEqual(category);
    });

    it('doit lever NotFoundException si la catégorie est absente', async () => {
      categoryRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.findOne('cat-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('doit mettre à jour une catégorie existante', async () => {
      const category = { id: 'cat-1', libelle: 'Ancien' } as Category;
      const dto: UpdateCategoryDto = { libelle: 'Nouveau' };

      categoryRepositoryMock.findOne.mockResolvedValue(category);
      categoryRepositoryMock.save.mockResolvedValue({
        ...category,
        ...dto,
      });

      const result = await service.update('cat-1', dto);

      expect(categoryRepositoryMock.findOne).toHaveBeenCalled();
      expect(category.libelle).toBe('Nouveau');
      expect(categoryRepositoryMock.save).toHaveBeenCalledWith(category);
      expect(result.libelle).toBe('Nouveau');
    });

    it('doit lever NotFoundException si la catégorie est absente', async () => {
      categoryRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.update('cat-1', { libelle: 'Test' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('doit supprimer une catégorie existante', async () => {
      const category = { id: 'cat-1' } as Category;
      categoryRepositoryMock.findOne.mockResolvedValue(category);

      await service.remove('cat-1');

      expect(categoryRepositoryMock.remove).toHaveBeenCalledWith(category);
    });

    it('doit lever NotFoundException si la catégorie est absente', async () => {
      categoryRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.remove('cat-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(categoryRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});
