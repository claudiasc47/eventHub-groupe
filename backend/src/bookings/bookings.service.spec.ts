import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Event } from '../events/event.entity'
import { Booking } from './booking.entity'
import { BookingsService } from './bookings.service'

/**
 * Tests unitaires du service BookingsService.
 * On simule (mock) le repository Booking et le gestionnaire de transactions TypeORM
 * afin de tester la logique de réservation sans base de données PostgreSQL.
 */
describe('BookingsService', () => {
  let service: BookingsService

  // Mock du QueryBuilder utilisé dans cancel() pour poser un verrou pessimiste sur la réservation
  const lockQuery = {
    select: jest.fn(),
    where: jest.fn(),
    setLock: jest.fn(),
    getOne: jest.fn(),
  }

  // Mock de l'EntityManager passé dans le callback de dataSource.transaction()
  // Toutes les requêtes SQL d'une même transaction passent par cet objet
  const manager = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    decrement: jest.fn(),
    increment: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  // Mock du DataSource TypeORM : au lieu d'ouvrir une vraie transaction SQL,
  // on exécute directement la fonction callback en lui passant notre manager simulé
  const dataSource = {
    transaction: jest.fn(async (callback: (em: typeof manager) => Promise<unknown>) =>
      callback(manager),
    ),
  }

  // Mock du repository Booking utilisé pour les lectures finales (findMine, findOneWithEvent)
  const bookingsRepository = {
    find: jest.fn(),
    findOneOrFail: jest.fn(),
  }

  // Jeu de données de référence réutilisé dans les différents scénarios de test
  const publishedEvent = {
    id: 'event-id',
    name: 'Concert',
    startDate: new Date('2027-05-15T19:00:00Z'),
    endDate: new Date('2027-05-15T23:00:00Z'),
    location: { id: 'location-id', name: 'Paris' },
    status: 'PUBLISHED',
    remainingSeats: 10,
  }

  const confirmedBooking = {
    id: 'booking-id',
    event: publishedEvent,
    user: { id: 'user-id' },
    quantity: 2,
    status: 'CONFIRMED',
    createdAt: new Date('2027-01-10T10:00:00Z'),
  }

  beforeEach(async () => {
    // Réinitialise tous les compteurs d'appels et retours simulés avant chaque test
    jest.clearAllMocks()

    // Permet le chaînage des méthodes du QueryBuilder (.select().where().setLock())
    for (const method of [lockQuery.select, lockQuery.where, lockQuery.setLock]) {
      method.mockReturnValue(lockQuery)
    }
    manager.createQueryBuilder.mockReturnValue(lockQuery)

    // Construction du module de test NestJS isolé avec nos dépendances simulées
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile()

    service = module.get(BookingsService)
  })

  // ============================================================================
  // 1. Tests de création de réservation : create(userId, eventId, quantity)
  // ============================================================================

  it('creates a confirmed booking and decrements remaining seats in a transaction', async () => {
    // Cas nominal : l'événement est publié et dispose de 10 places, on en réserve 2
    manager.findOne.mockResolvedValue({ ...publishedEvent })
    manager.create.mockReturnValue({ id: 'booking-id' })
    manager.save.mockResolvedValue({ id: 'booking-id' })
    bookingsRepository.findOneOrFail.mockResolvedValue(confirmedBooking)

    const result = await service.create('user-id', 'event-id', 2)

    // Vérifie qu'on verrouille bien la ligne de l'événement en écriture (pessimistic_write)
    // pour éviter que deux utilisateurs réservent les dernières places en même temps
    expect(manager.findOne).toHaveBeenCalledWith(Event, {
      where: { id: 'event-id' },
      lock: { mode: 'pessimistic_write' },
    })
    // Vérifie que le stock de places restantes est décrémenté de 2
    expect(manager.decrement).toHaveBeenCalledWith(Event, { id: 'event-id' }, 'remainingSeats', 2)
    // Vérifie que la réservation est enregistrée avec le statut CONFIRMED
    expect(manager.create).toHaveBeenCalledWith(Booking, {
      event: { id: 'event-id' },
      user: { id: 'user-id' },
      quantity: 2,
      status: 'CONFIRMED',
    })
    expect(result).toEqual(confirmedBooking)
  })

  it('throws NotFoundException when the event does not exist', async () => {
    // Si l'identifiant d'événement n'existe pas en base, findOne renvoie null
    manager.findOne.mockResolvedValue(null)

    await expect(service.create('user-id', 'missing-event', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    // Aucune décrémentation ni sauvegarde ne doit être effectuée
    expect(manager.decrement).not.toHaveBeenCalled()
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when the event is still a draft', async () => {
    // Un participant ne doit pas pouvoir réserver sur un événement encore en brouillon (DRAFT)
    manager.findOne.mockResolvedValue({ ...publishedEvent, status: 'DRAFT' })

    await expect(service.create('user-id', 'event-id', 1)).rejects.toBeInstanceOf(NotFoundException)
    expect(manager.decrement).not.toHaveBeenCalled()
  })

  it('throws ConflictException when remaining seats are insufficient', async () => {
    // Il ne reste que 1 place disponible alors que l'utilisateur en demande 3 -> erreur 409 Conflict
    manager.findOne.mockResolvedValue({ ...publishedEvent, remainingSeats: 1 })

    await expect(service.create('user-id', 'event-id', 3)).rejects.toBeInstanceOf(ConflictException)
    // Le stock ne doit pas être touché et aucune réservation ne doit être créée
    expect(manager.decrement).not.toHaveBeenCalled()
    expect(manager.save).not.toHaveBeenCalled()
  })

  // ============================================================================
  // 2. Tests de consultation des réservations : findMine(userId)
  // ============================================================================

  it('lists the current user bookings ordered by newest first', async () => {
    // Vérifie qu'on filtre bien par utilisateur, avec le lieu de l'événement chargé et un tri décroissant
    bookingsRepository.find.mockResolvedValue([confirmedBooking])

    const result = await service.findMine('user-id')

    expect(bookingsRepository.find).toHaveBeenCalledWith({
      where: { user: { id: 'user-id' } },
      relations: { event: { location: true } },
      order: { createdAt: 'DESC' },
    })
    expect(result).toEqual([confirmedBooking])
  })

  // ============================================================================
  // 3. Tests d'annulation de réservation : cancel(userId, bookingId)
  // ============================================================================

  it('cancels a confirmed booking and restores remaining seats', async () => {
    // Cas nominal : l'utilisateur annule sa propre réservation confirmée de 2 places
    const cancelledBooking = { ...confirmedBooking, status: 'CANCELLED' }
    lockQuery.getOne.mockResolvedValue({ id: 'booking-id' })
    manager.findOneOrFail.mockResolvedValue({ ...confirmedBooking })
    bookingsRepository.findOneOrFail.mockResolvedValue(cancelledBooking)

    const result = await service.cancel('user-id', 'booking-id')

    // Vérifie le verrou pessimiste, le passage au statut CANCELLED et la remise en stock des 2 places
    expect(lockQuery.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(manager.update).toHaveBeenCalledWith(Booking, 'booking-id', { status: 'CANCELLED' })
    expect(manager.increment).toHaveBeenCalledWith(Event, { id: 'event-id' }, 'remainingSeats', 2)
    expect(result).toEqual(cancelledBooking)
  })

  it('throws NotFoundException when cancelling an unknown booking', async () => {
    // Si aucune réservation ne correspond à l'ID verrouillé, on lève une 404 NotFoundException
    lockQuery.getOne.mockResolvedValue(null)

    await expect(service.cancel('user-id', 'missing-booking')).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(manager.update).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when cancelling another user booking', async () => {
    // Sécurité : un utilisateur ne peut pas annuler la réservation d'un autre compte (erreur 403)
    lockQuery.getOne.mockResolvedValue({ id: 'booking-id' })
    manager.findOneOrFail.mockResolvedValue({
      ...confirmedBooking,
      user: { id: 'another-user' },
    })

    await expect(service.cancel('user-id', 'booking-id')).rejects.toBeInstanceOf(ForbiddenException)
    // On vérifie que ni le statut ni le stock de places n'ont été modifiés
    expect(manager.update).not.toHaveBeenCalled()
    expect(manager.increment).not.toHaveBeenCalled()
  })

  it('does not increment seats twice if the booking is already cancelled', async () => {
    // Cas idempotent : si la réservation est déjà CANCELLED, on retourne directement l'état actuel
    // sans recréditer une deuxième fois les places sur l'événement
    const alreadyCancelled = { ...confirmedBooking, status: 'CANCELLED' }
    lockQuery.getOne.mockResolvedValue({ id: 'booking-id' })
    manager.findOneOrFail.mockResolvedValue(alreadyCancelled)
    bookingsRepository.findOneOrFail.mockResolvedValue(alreadyCancelled)

    const result = await service.cancel('user-id', 'booking-id')

    expect(manager.update).not.toHaveBeenCalled()
    expect(manager.increment).not.toHaveBeenCalled()
    expect(result).toEqual(alreadyCancelled)
  })
})
