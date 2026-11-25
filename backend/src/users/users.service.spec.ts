import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './user.entity';
import { UsersService } from './users.service';

// Mock de bcrypt pour éviter un vrai hachage coûteux en CPU lors des tests unitaires
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

/**
 * Tests unitaires du service UsersService.
 * On simule (mock) le repository TypeORM User, MailService et bcrypt afin de tester
 * la normalisation des emails, le hachage du mot de passe, la génération du token de
 * vérification et les requêtes de recherche sans base de données PostgreSQL.
 */
describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<
    Pick<
      Repository<User>,
      | 'existsBy'
      | 'create'
      | 'save'
      | 'findOneBy'
      | 'find'
      | 'createQueryBuilder'
    >
  >;

  beforeEach(async () => {
    // Réinitialise l'état des mocks avant chaque scénario de test
    jest.clearAllMocks();

    repository = {
      existsBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    // Simulation du service d'envoi d'e-mails pour ne pas envoyer de vrais courriels
    const mail = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    // Instanciation isolée du service avec le repository et MailService simulés
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  // ============================================================================
  // 1. Tests d'inscription : register(dto)
  // ============================================================================

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'Alice@Example.com',
      pseudo: 'alice',
      password: 'Password123!',
    };

    it('normalizes email, hashes password and saves a new user', async () => {
      // Cas nominal : l'email est converti en minuscules, le mot de passe est haché (coût 10)
      // et un jeton de vérification d'email (hash + date d'expiration) est généré
      const savedUser = {
        id: 'user-1',
        email: 'alice@example.com',
        pseudo: 'alice',
        passwordHash: 'hashed-password',
        role: UserRole.PARTICIPANT,
      } as User;

      repository.existsBy.mockResolvedValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      repository.create.mockReturnValue(savedUser);
      repository.save.mockResolvedValue(savedUser);

      const result = await service.register(dto);

      expect(repository.existsBy).toHaveBeenCalledWith({
        email: 'alice@example.com',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(repository.create).toHaveBeenCalledWith({
        email: 'alice@example.com',
        pseudo: 'alice',
        passwordHash: 'hashed-password',
        verificationTokenHash: expect.any(String) as string,
        verificationTokenExpiresAt: expect.any(Date) as Date,
      });
      expect(repository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toBe(savedUser);
    });

    it('throws ConflictException when email is already used', async () => {
      // Si l'adresse email est déjà présente en base -> erreur 409 Conflict
      repository.existsBy.mockResolvedValue(true);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      // Aucun enregistrement ne doit être tenté en base
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 2. Test de recherche pour la connexion : findByEmailWithPassword(email)
  // ============================================================================

  describe('findByEmailWithPassword', () => {
    it('queries user with passwordHash using lowercase email', async () => {
      // Par défaut, passwordHash est masqué sur l'entité User (select: false).
      // On vérifie donc que le QueryBuilder ajoute explicitement addSelect('u.passwordHash')
      // et recherche avec l'email normalisé en minuscules
      const user = { id: 'user-1', email: 'alice@example.com' } as User;
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      repository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.findByEmailWithPassword('Alice@Example.com');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('u');
      expect(qb.addSelect).toHaveBeenCalledWith('u.passwordHash');
      expect(qb.where).toHaveBeenCalledWith('u.email = :email', {
        email: 'alice@example.com',
      });
      expect(result).toBe(user);
    });
  });

  // ============================================================================
  // 3. Tests de lecture : findById(id) et findAll()
  // ============================================================================

  describe('findById & findAll', () => {
    it('returns a user by id', async () => {
      // Recherche simple par identifiant UUID
      const user = { id: 'user-1' } as User;
      repository.findOneBy.mockResolvedValue(user);

      await expect(service.findById('user-1')).resolves.toBe(user);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'user-1' });
    });

    it('lists all users ordered by createdAt ASC', async () => {
      // Vérifie que la liste des utilisateurs est triée par ordre chronologique d'inscription
      const users = [{ id: 'user-1' }] as User[];
      repository.find.mockResolvedValue(users);

      await expect(service.findAll()).resolves.toBe(users);
      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
      });
    });
  });
});
