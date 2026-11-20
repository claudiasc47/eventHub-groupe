import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { QueryFailedError } from 'typeorm'
import { Category } from './category.entity'
import { CategoriesService } from './categories.service'

describe('CategoriesService', () => {
  let service: CategoriesService
  const repository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repository },
      ],
    }).compile()

    service = module.get(CategoriesService)
  })

  it('lists categories alphabetically', async () => {
    const categories = [{ id: '1', name: 'Art' }]
    repository.find.mockResolvedValue(categories)

    await expect(service.findAll()).resolves.toBe(categories)
    expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } })
  })

  it('returns a category by id', async () => {
    const category = { id: '1', name: 'Art' }
    repository.findOneBy.mockResolvedValue(category)

    await expect(service.findOne('1')).resolves.toBe(category)
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: '1' })
  })

  it('throws when a category does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null)

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates a category', async () => {
    const input = { name: 'Music' }
    const category = { id: '1', ...input }
    repository.create.mockReturnValue(category)
    repository.save.mockResolvedValue(category)

    await expect(service.create(input)).resolves.toBe(category)
    expect(repository.create).toHaveBeenCalledWith(input)
    expect(repository.save).toHaveBeenCalledWith(category)
  })

  it('rejects duplicate category names', async () => {
    repository.create.mockReturnValue({ name: 'Music' })
    repository.save.mockRejectedValue(new QueryFailedError('query', [], { code: '23505' }))

    await expect(service.create({ name: 'Music' })).rejects.toBeInstanceOf(ConflictException)
  })

  it('updates a category', async () => {
    const category = { id: '1', name: 'Art' }
    repository.findOneBy.mockResolvedValue(category)
    repository.save.mockResolvedValue(category)

    await expect(service.update('1', { name: 'Music' })).resolves.toEqual({
      id: '1',
      name: 'Music',
    })
  })

  it('deletes an unused category', async () => {
    repository.findOneBy.mockResolvedValue({ id: '1', name: 'Art' })
    repository.delete.mockResolvedValue({ affected: 1 })

    await expect(service.remove('1')).resolves.toBeUndefined()
    expect(repository.delete).toHaveBeenCalledWith('1')
  })

  it('rejects deleting a category used by an event', async () => {
    repository.findOneBy.mockResolvedValue({ id: '1', name: 'Art' })
    repository.delete.mockRejectedValue(new QueryFailedError('query', [], { code: '23503' }))

    await expect(service.remove('1')).rejects.toBeInstanceOf(ConflictException)
  })
})
