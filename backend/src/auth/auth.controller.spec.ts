import { Test, TestingModule } from '@nestjs/testing';

// Mock du JwtService avant l'import du contrôleur pour isoler AuthController
// sans avoir à charger la configuration JWT complète de NestJS
jest.mock('@nestjs/jwt', () => ({
  JwtService: class MockJwtService {},
}));

import { UserRole } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Tests unitaires du contrôleur AuthController.
 * Vérifie que la route de connexion (POST /auth/login) délègue bien
 * l'authentification à AuthService et renvoie le jeton JWT ainsi que le profil utilisateur.
 */
describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'login'>>;

  beforeEach(async () => {
    // Réinitialise l'état des mocks avant chaque test
    jest.clearAllMocks();

    // Simulation minimaliste du service d'authentification
    authService = {
      login: jest.fn(),
    };

    // Construction du module de test NestJS isolé avec le service simulé
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  // ============================================================================
  // 1. Test de la route de connexion : login(dto)
  // ============================================================================

  describe('login', () => {
    it('delegates login to AuthService and returns access_token and user', async () => {
      // Vérifie que le contrôleur transmet les identifiants (email + mot de passe)
      // à AuthService.login() et retourne tel quel l'objet { access_token, user }
      const dto: LoginDto = {
        email: 'alice@example.com',
        password: 'Password123!',
      };
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
      };

      authService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
