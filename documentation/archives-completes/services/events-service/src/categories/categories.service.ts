import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Category } from '../entity/category.entity'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto) {
    const category = this.categoryRepository.create(dto)
    return this.categoryRepository.save(category)
  }

  findAll() {
    return this.categoryRepository.find()
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } })
    if (!category) {
      throw new NotFoundException('Category not found')
    }
    return category
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id)
    Object.assign(category, dto)
    return this.categoryRepository.save(category)
  }

  async remove(id: string) {
    const category = await this.findOne(id)
    await this.categoryRepository.remove(category)
  }
}
