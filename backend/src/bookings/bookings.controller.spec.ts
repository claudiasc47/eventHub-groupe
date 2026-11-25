import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';

// Mock du guard JWT avant l'import du contrôleur pour isoler les tests unitaires
// et éviter d'avoir à générer de vrais tokens JWT dans chaque test
jest.mock('../common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class MockJwtAuthGuard {
    canActivate() {
      return true;
    }
  },
}));

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser } from '../common/types/authenticated-request';
import { UserRole } from '../users/user.entity';
import { Booking } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * Tests unitaires du contrôleur BookingsController.
 * Vérifie que chaque endpoint délègue correctement au service BookingsService,
 * transforme l'entité via toBookingResponse() et protège les routes via JwtAuthGuard.
 */
describe('BookingsController', () => {
  let controller: BookingsController;
  let bookingsService: jest.Mocked<
    Pick<BookingsService, 'create' | 'findMine' | 'cancel'>
  >;

  // Utilisateur authentifié simulé injecté par le décorateur @CurrentUser()
  const participant: AuthUser = { id: 'user-1', role: UserRole.PARTICIPANT };

  // Entité Booking complète retournée par le service (contient des objets Date)
  const mockBookingEntity = {
    id: 'booking-1',
    event: {
      id: 'event-1',
      name: 'Concert Rock',
      startDate: new Date('2027-06-10T20:00:00Z'),
      endDate: new Date('2027-06-10T23:00:00Z'),
      location: { id: 'loc-1', name: 'Marseille' },
      status: 'PUBLISHED',
    },
    quantity: 2,
    status: 'CONFIRMED',
    createdAt: new Date('2027-02-01T12:00:00Z'),
  } as unknown as Booking;

  // Format JSON attendu en sortie HTTP après passage dans toBookingResponse()
  // Note : createdAt est converti en chaîne ISO 8601 par le mapper
  const expectedResponse = {
    id: 'booking-1',
    event: {
      id: 'event-1',
      name: 'Concert Rock',
      startDate: new Date('2027-06-10T20:00:00Z'),
      endDate: new Date('2027-06-10T23:00:00Z'),
      location: { id: 'loc-1', name: 'Marseille' },
      status: 'PUBLISHED',
    },
    quantity: 2,
    status: 'CONFIRMED',
    createdAt: '2027-02-01T12:00:00.000Z',
  };

  beforeEach(async () => {
    // Réinitialise les mocks avant chaque scénario de test
    jest.clearAllMocks();

    bookingsService = {
      create: jest.fn(),
      findMine: jest.fn(),
      cancel: jest.fn(),
    };

    // Instanciation isolée du contrôleur avec un BookingsService simulé
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: bookingsService }],
    }).compile();

    controller = module.get(BookingsController);
  });

  // ============================================================================
  // 1. Tests des routes HTTP (création, liste personnelle, annulation)
  // ============================================================================

  describe('create', () => {
    it('delegates booking creation and maps the result to response DTO', async () => {
      // Vérifie que POST /events/:id/bookings transmet l'ID utilisateur, l'ID événement
      // et la quantité demandée au service, puis formate la réponse JSON
      const dto: CreateBookingDto = { quantity: 2 };
      bookingsService.create.mockResolvedValue(mockBookingEntity);

      const result = await controller.create('event-1', dto, participant);

      expect(bookingsService.create).toHaveBeenCalledWith(
        'user-1',
        'event-1',
        2,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('mine', () => {
    it('returns the formatted list of bookings for the authenticated user', async () => {
      // Vérifie que GET /me/bookings récupère les réservations de l'utilisateur courant
      // et applique toBookingResponse() sur chaque élément du tableau
      bookingsService.findMine.mockResolvedValue([mockBookingEntity]);

      const result = await controller.mine(participant);

      expect(bookingsService.findMine).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([expectedResponse]);
    });
  });

  describe('cancel', () => {
    it('delegates booking cancellation and returns the updated booking', async () => {
      // Vérifie que PATCH /bookings/:id/cancel appelle le service avec user.id et bookingId
      // et renvoie la réservation mise à jour au statut CANCELLED
      const cancelledEntity = {
        ...mockBookingEntity,
        status: 'CANCELLED',
      };
      bookingsService.cancel.mockResolvedValue(cancelledEntity);

      const result = await controller.cancel('booking-1', participant);

      expect(bookingsService.cancel).toHaveBeenCalledWith(
        'user-1',
        'booking-1',
      );
      expect(result).toEqual({
        ...expectedResponse,
        status: 'CANCELLED',
      });
    });
  });

  // ============================================================================
  // 2. Vérification de la sécurité des routes (métadonnées NestJS)
  // ============================================================================

  describe('route authentication guard', () => {
    it('protects all booking routes with JwtAuthGuard at controller level', () => {
      // On inspecte les métadonnées posées par @UseGuards(JwtAuthGuard) sur la classe :
      // cela garantit qu'aucune route de réservation n'est accessible sans être connecté
      expect(Reflect.getMetadata(GUARDS_METADATA, BookingsController)).toEqual([
        JwtAuthGuard,
      ]);
    });
  });
});
