# API Gateway

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Description

L'API Gateway est le point d'entrée unique pour tous les services, elle agit comme un proxy inverse et un orchestrateur pour les microservices sous-jacents.

Ce projet suit une **Architecture en Couches (Layered Architecture)** standard NestJS.

## Architecture

La structure du projet est organisée par modules fonctionnels, séparant clairement les responsabilités :

```bash
src/
 ├── main.ts                # Point d'entrée
 ├── app.module.ts          # Module racine
 ├── clients/               # Clients HTTP pour communiquer avec les microservices
 │    ├── auth.client.ts
 │    ├── events.client.ts
 │    └── tickets.client.ts
 ├── common/
 │    ├── decorators/       # Décorateurs personnalisés (ex: @Public)
 │    ├── dto/              # Data Transfer Objects (Validation)
 │    └── guards/           # Guards (ex: AuthenticationGuard)
 ├── modules/               # Modules fonctionnels
 │    ├── auth/
 │    │     ├── auth.controller.ts
 │    │     └── auth.service.ts
 │    └── booking/
 │          ├── booking.controller.ts
 │          └── booking.service.ts
```

## API Routes

Toutes les routes sont préfixées par `/api`.

### Authentification (`/api/auth`)

| Méthode | Route    | Description                             | Auth Requise |
| :------ | :------- | :-------------------------------------- | :----------- |
| `POST`  | `/login` | Connexion utilisateur (retourne un JWT) | ❌ Non       |

### Réservation (`/api/booking`)

| Méthode | Route              | Description                                              | Auth Requise |
| :------ | :----------------- | :------------------------------------------------------- | :----------- |
| `GET`   | `/events`          | Liste tous les événements disponibles (statut PUBLISHED) | ✅ Oui       |
| `GET`   | `/events/:id`      | Détails d'un événement avec ses types de billets         | ✅ Oui       |
| `POST`  | `/events/:id/book` | Réserver des billets pour un événement                   | ✅ Oui       |

**Corps de la requête pour `/book` :**

```json
{
  "ticketTypeId": "uuid-du-type-de-billet",
  "quantity": 2
}
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
