import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

jest.mock('@nestjs/jwt', () => ({
  JwtService: class MockJwtService {},
}))

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}))

import { JwtService } from '@nestjs/jwt'
import { User, UserRole } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmailWithPassword'>>
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>

  const mockUser: User = {
    id: 'user-1',
    email: 'alice@example.com',
    pseudo: 'alice',
    passwordHash: 'hashed-password',
    firstName: 'Alice',
    lastName: 'Martin',
    phone: null,
    birthDate: null,
    role: UserRole.PARTICIPANT,
    createdAt: new Date('2026-11-23T09:00:00Z'),
    updatedAt: new Date('2026-11-23T09:00:00Z'),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    usersService = {
      findByEmailWithPassword: jest.fn(),
    }

    jwtService = {
      signAsync: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  describe('login', () => {
    it('returns access_token and sanitized user when credentials are valid', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      jwtService.signAsync.mockResolvedValue('jwt-token-123')

      const result = await service.login({
        email: 'alice@example.com',
        password: 'Password123!',
      })

      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith('alice@example.com')
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashed-password')
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: UserRole.PARTICIPANT,
      })
      expect(result).toEqual({
        access_token: 'jwt-token-123',
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          pseudo: 'alice',
          firstName: 'Alice',
          lastName: 'Martin',
          phone: null,
          birthDate: null,
          role: UserRole.PARTICIPANT,
        },
      })
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('throws UnauthorizedException when user does not exist', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null)

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException)

      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('throws UnauthorizedException when password does not match', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        service.login({
          email: 'alice@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException)

      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })
  })
})
