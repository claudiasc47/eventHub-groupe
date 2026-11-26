import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresErrorCode } from '../database/is-postgres-error-code';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async create(input: CreateCategoryDto): Promise<Category> {
    try {
      return await this.categoriesRepository.save(
        this.categoriesRepository.create(input),
      );
    } catch (error) {
      this.throwIfUniqueNameConflict(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (input.name === undefined) {
      return category;
    }

    category.name = input.name;
    try {
      return await this.categoriesRepository.save(category);
    } catch (error) {
      this.throwIfUniqueNameConflict(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.categoriesRepository.delete(id);
    } catch (error) {
      if (isPostgresErrorCode(error, '23503')) {
        throw new ConflictException(
          'This category cannot be deleted because it is used by an event.',
        );
      }
      throw error;
    }
  }

  private throwIfUniqueNameConflict(error: unknown): void {
    if (isPostgresErrorCode(error, '23505')) {
      throw new ConflictException('A category with this name already exists.');
    }
  }
}
