import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

// Mocks virtuels des guards et décorateurs NestJS avant l'import du contrôleur
// afin de tester les méthodes HTTP en isolation sans contexte HTTP complet
jest.mock(
  'src/common/guards/jwt-auth.guard',
  () => ({
    JwtAuthGuard: class MockJwtAuthGuard {
      canActivate() {
        return true
      }
    },
  }),
  { virtual: true },
)

jest.mock(
  'src/common/guards/roles.guard',
  () => ({
    RolesGuard: class MockRolesGuard {
      canActivate() {
        return true
      }
    },
  }),
  { virtual: true },
)

jest.mock(
  'src/common/decorators/current-user.decorator',
  () => ({
    CurrentUser: () => () => undefined,
  }),
  { virtual: true },
)

jest.mock(
  'src/common/decorators/roles.decorator',
  () => ({
    Roles: () => () => undefined,
  }),
  { virtual: true },
)

import { RegisterDto } from './dto/register.dto'
import { User, UserRole } from './user.entity'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

/**
 * Tests unitaires du contrôleur UsersController.
 * Vérifie l'inscription d'un utilisateur, la récupération du profil courant (/me),
 * la liste administrateur et le filtrage systématique du champ sensible passwordHash.
 */
describe('UsersController', () => {
  let controller: UsersController
  let usersService: jest.Mocked<Pick<UsersService, 'register' | 'findById' | 'findAll'>>

  // Entité User complète simulée retournée par UsersService (contient passwordHash)
  const mockUser: User = {
    id: 'user-1',
    email: 'alice@example.com',
    pseudo: 'alice',
    passwordHash: 'hashed-secret',
    firstName: 'Alice',
    lastName: 'Martin',
    phone: null,
    birthDate: null,
    role: UserRole.PARTICIPANT,
    createdAt: new Date('2026-11-23T09:00:00Z'),
    updatedAt: new Date('2026-11-23T09:00:00Z'),
  }

  beforeEach(async () => {
    // Réinitialise l'état des mocks avant chaque test
    jest.clearAllMocks()

    usersService = {
      register: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    }

    // Instanciation isolée du contrôleur avec un UsersService simulé
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile()

    controller = module.get(UsersController)
  })

  // ============================================================================
  // 1. Test d'inscription : register(dto)
  // ============================================================================

  describe('register', () => {
    it('registers a user and returns sanitized user response without passwordHash', async () => {
      // Vérifie que POST /users/register délègue la création à UsersService.register()
      // et retourne un profil nettoyé où passwordHash est retiré
      const dto: RegisterDto = {
        email: 'alice@example.com',
        pseudo: 'alice',
        password: 'Password123!',
      }
      usersService.register.mockResolvedValue(mockUser)

      const result = await controller.register(dto)

      expect(usersService.register).toHaveBeenCalledWith(dto)
      expect(result).toEqual({
        id: 'user-1',
        email: 'alice@example.com',
        pseudo: 'alice',
        firstName: 'Alice',
        lastName: 'Martin',
        phone: null,
        birthDate: null,
        role: UserRole.PARTICIPANT,
      })
      expect(result).not.toHaveProperty('passwordHash')
    })
  })

  // ============================================================================
  // 2. Tests du profil de l'utilisateur connecté : me(user)
  // ============================================================================

  describe('me', () => {
    it('returns the current authenticated user profile', async () => {
      // Cas nominal : l'utilisateur extrait du JWT existe en base, on renvoie son profil sans hash
      usersService.findById.mockResolvedValue(mockUser)

      const result = await controller.me({ id: 'user-1' })

      expect(usersService.findById).toHaveBeenCalledWith('user-1')
      expect(result.email).toBe('alice@example.com')
      expect(result).not.toHaveProperty('passwordHash')
    })

    it('throws UnauthorizedException when current user is not found in database', async () => {
      // Si le compte associé au token JWT a été supprimé entre-temps -> erreur 401 Unauthorized
      usersService.findById.mockResolvedValue(null)

      await expect(controller.me({ id: 'missing-id' })).rejects.toThrow(UnauthorizedException)
    })
  })

  // ============================================================================
  // 3. Test de la liste administrateur : list()
  // ============================================================================

  describe('list', () => {
    it('returns mapped user responses for admin listing', async () => {
      // Vérifie que GET /users récupère tous les comptes et retire passwordHash sur chaque élément
      usersService.findAll.mockResolvedValue([mockUser])

      const result = await controller.list()

      expect(usersService.findAll).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('user-1')
      expect(result[0]).not.toHaveProperty('passwordHash')
    })
  })
})
