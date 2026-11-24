# Ticketing Service

Service de gestion de la billetterie pour la plateforme de gestion d'événements.

## Fonctionnalités

- Gestion des types de billets (VIP, Standard, etc.)
- Réservation de billets en temps réel
- Génération de QR codes pour les billets
- Gestion des capacités et disponibilités
- Validation des billets

## API Endpoints

### Tickets Types

- `POST /ticket-types` - Créer un type de billet
- `GET /ticket-types` - Lister tous les types de billets
- `GET /ticket-types/:id` - Obtenir un type de billet
- `PATCH /ticket-types/:id` - Modifier un type de billet
- `DELETE /ticket-types/:id` - Supprimer un type de billet

### Bookings

- `POST /bookings` - Créer une réservation
- `GET /bookings` - Lister les réservations
- `GET /bookings/:id` - Obtenir une réservation
- `PATCH /bookings/:id` - Modifier une réservation
- `DELETE /bookings/:id` - Annuler une réservation
- `GET /bookings/:id/qrcode` - Obtenir le QR code d'une réservation

## Technologies

- NestJS
- TypeORM
- PostgreSQL
- QR Code generation
