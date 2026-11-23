import { ConflictException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { RegisterDto } from './dto/register.dto'
import { User, UserRole } from './user.entity'
import { UsersService } from './users.service'
import { MailService } from '../mail/mail.service'

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}))

describe('UsersService', () => {
  let service: UsersService
  let repository: jest.Mocked<
    Pick<
      Repository<User>,
      'existsBy' | 'create' | 'save' | 'findOneBy' | 'find' | 'createQueryBuilder'
    >
  >

  beforeEach(async () => {
    jest.clearAllMocks()

    repository = {
      existsBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    }
    const mail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: repository },{ provide: MailService, useValue: mail }],
    }).compile()

    service = module.get(UsersService)
  })

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'Alice@Example.com',
      pseudo: 'alice',
      password: 'Password123!',
    }

    it('normalizes email, hashes password and saves a new user', async () => {
      const savedUser = {
        id: 'user-1',
        email: 'alice@example.com',
        pseudo: 'alice',
        passwordHash: 'hashed-password',
        role: UserRole.PARTICIPANT,
      } as User

      repository.existsBy.mockResolvedValue(false)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
      repository.create.mockReturnValue(savedUser)
      repository.save.mockResolvedValue(savedUser)

      const result = await service.register(dto)

      expect(repository.existsBy).toHaveBeenCalledWith({
        email: 'alice@example.com',
      })
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10)
      expect(repository.create).toHaveBeenCalledWith({
        email: 'alice@example.com',
        pseudo: 'alice',
        passwordHash: 'hashed-password',
        verificationTokenHash: expect.any(String) as string,
        verificationTokenExpiresAt: expect.any(Date) as Date,
      })
      expect(repository.save).toHaveBeenCalledWith(savedUser)
      expect(result).toBe(savedUser)
    })

    it('throws ConflictException when email is already used', async () => {
      repository.existsBy.mockResolvedValue(true)

      await expect(service.register(dto)).rejects.toThrow(ConflictException)
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('findByEmailWithPassword', () => {
    it('queries user with passwordHash using lowercase email', async () => {
      const user = { id: 'user-1', email: 'alice@example.com' } as User
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      }
      repository.createQueryBuilder.mockReturnValue(qb as never)

      const result = await service.findByEmailWithPassword('Alice@Example.com')

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('u')
      expect(qb.addSelect).toHaveBeenCalledWith('u.passwordHash')
      expect(qb.where).toHaveBeenCalledWith('u.email = :email', {
        email: 'alice@example.com',
      })
      expect(result).toBe(user)
    })
  })

  describe('findById & findAll', () => {
    it('returns a user by id', async () => {
      const user = { id: 'user-1' } as User
      repository.findOneBy.mockResolvedValue(user)

      await expect(service.findById('user-1')).resolves.toBe(user)
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'user-1' })
    })

    it('lists all users ordered by createdAt ASC', async () => {
      const users = [{ id: 'user-1' }] as User[]
      repository.find.mockResolvedValue(users)

      await expect(service.findAll()).resolves.toBe(users)
      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
      })
    })
  })
})
