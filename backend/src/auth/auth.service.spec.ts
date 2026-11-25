import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

// Mock de @nestjs/jwt avant l'import du service pour éviter le chargement de la configuration JWT
jest.mock('@nestjs/jwt', () => ({
  JwtService: class MockJwtService {},
}))

// Mock de bcrypt pour maîtriser le résultat de la comparaison de mot de passe sans hachage réel
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}))

import { JwtService } from '@nestjs/jwt'
import { User, UserRole } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

/**
 * Tests unitaires du service AuthService.
 * On simule (mock) UsersService, JwtService et bcrypt afin de tester
 * la logique d'authentification (vérification du compte, comparaison du hash,
 * génération du JWT et masquage du mot de passe) sans base de données.
 */
describe('AuthService', () => {
  let service: AuthService
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmailWithPassword'>>
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>

  // Utilisateur complet simulé retourné par findByEmailWithPassword (inclut le passwordHash)
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
    emailVerifiedAt: new Date('2026-11-23T09:00:01Z'),
  }

  beforeEach(async () => {
    // Réinitialise les compteurs d'appels et retours simulés avant chaque test
    jest.clearAllMocks()

    usersService = {
      findByEmailWithPassword: jest.fn(),
    }

    jwtService = {
      signAsync: jest.fn(),
    }

    // Construction du module de test NestJS isolé avec nos services simulés
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  // ============================================================================
  // 1. Tests de connexion : login({ email, password })
  // ============================================================================

  describe('login', () => {
    it('returns access_token and sanitized user when credentials are valid', async () => {
      // Cas nominal : l'email existe et bcrypt confirme que le mot de passe correspond au hash
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      jwtService.signAsync.mockResolvedValue('jwt-token-123')

      const result = await service.login({
        email: 'alice@example.com',
        password: 'Password123!',
      })

      // Vérifie que la recherche se fait par email, puis que bcrypt compare le clair et le hash
      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith('alice@example.com')
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashed-password')
      // Vérifie que le payload du token JWT contient bien sub (ID utilisateur) et role
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: UserRole.PARTICIPANT,
      })
      // Vérifie la réponse retournée et s'assure que passwordHash n'est jamais exposé au client
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
      // Si aucun compte n'existe pour cet email, on rejette avec 401 Unauthorized
      usersService.findByEmailWithPassword.mockResolvedValue(null)

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException)

      // Inutile d'appeler bcrypt ou de signer un JWT si l'utilisateur est introuvable
      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('throws UnauthorizedException when password does not match', async () => {
      // Si l'utilisateur existe mais que bcrypt.compare renvoie false -> 401 Unauthorized
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        service.login({
          email: 'alice@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException)

      // Aucun jeton JWT ne doit être généré en cas de mauvais mot de passe
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })
  })
})
