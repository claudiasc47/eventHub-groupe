import { Test, TestingModule } from '@nestjs/testing'

jest.mock('@nestjs/jwt', () => ({
  JwtService: class MockJwtService {},
}))

import { UserRole } from '../users/user.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<Pick<AuthService, 'login'>>

  beforeEach(async () => {
    jest.clearAllMocks()

    authService = {
      login: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile()

    controller = module.get(AuthController)
  })

  describe('login', () => {
    it('delegates login to AuthService and returns access_token and user', async () => {
      const dto: LoginDto = {
        email: 'alice@example.com',
        password: 'Password123!',
      }
      const expectedResponse = {
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
      }

      authService.login.mockResolvedValue(expectedResponse)

      const result = await controller.login(dto)

      expect(authService.login).toHaveBeenCalledWith(dto)
      expect(result).toEqual(expectedResponse)
    })
  })
})
