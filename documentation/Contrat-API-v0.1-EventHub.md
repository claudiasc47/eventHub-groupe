# EventHub — Contrat d’API v0.1

**Statut — Validé par l’équipe (13 novembre 2026).** Ce document décrit l’API cible du MVP avec React/Vite, une application NestJS et une base PostgreSQL. Les routes et réponses ci-dessous servent de base commune pour les mocks Front et l’implémentation Back.

## Changements depuis la v0

Revue Front (Robin) du 13 novembre 2026. Les points marqués **D1** à **D5** ont été tranchés par l’équipe, voir [Décisions validées](#décisions-validées).

- Ajout des champs de profil de #29 à l’inscription et dans `User` (**D2**).
- Ajout de `GET /users` et `PATCH /users/{id}/role` pour l’administrateur, et de comptes de démonstration (**D3**).
- `GET /events/{id}` renvoie aussi les brouillons à leur propriétaire (**D5**).
- `Event` expose `organizerId`. `Booking` embarque un résumé de l’événement et `createdAt`.
- Les erreurs `VALIDATION_ERROR` détaillent les champs en erreur.
- Valeurs de `role`, durée de vie du jeton, transitions de statut et recherche texte `q` documentées.
- Périmètre hors MVP explicité : types de billets, paiement, prix, annulation d’événement avec remboursement (**D4**).

## Connexion Front/Back

- URL locale — `http://localhost:3000/api`, configurable par `VITE_API_URL` dans le Front. L’API autorise l’origine `http://localhost:5173` via `CORS_ORIGIN` (voir `.env.example`, PR #34). Swagger est servi sur `http://localhost:3000/api/docs`.
- Les routes protégées attendent `Authorization: Bearer <access_token>`. L’API tire l’identité et les droits du compte authentifié, jamais du corps de la requête.
- Le jeton d’accès est valable 1 heure. Pas de rafraîchissement dans le MVP : sur un `401`, le Front efface la session locale et redirige vers `/login`.
- Rôles — `participant`, `organizer`, `admin`, en minuscules. L’inscription publique crée toujours un `participant`. Seul un `admin` change un rôle.
- Le catalogue publié est accessible sans connexion. Les réservations nécessitent un compte. Les opérations organisateur sont réservées au rôle `organizer` et, pour un événement donné, à son propriétaire.

## Routes

| Méthode et chemin (relatif à `/api`) | Accès                                           | Entrée                                                                        | Succès et réponse                                                     | Erreurs attendues                                                                                                    |
| ------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `POST /users/register`               | Public                                          | `RegisterInput`                                                               | `201` — `User` (pas de jeton : le Front enchaîne sur la connexion)    | `400` données invalides, `409` email déjà utilisé                                                                    |
| `POST /auth/login`                   | Public                                          | `{ email, password }`                                                         | `200` — `{ access_token, user: User }`                                | `400` données invalides, `401` identifiants incorrects                                                               |
| `GET /users/me`                      | Connecté                                        | Jeton                                                                         | `200` — `User`                                                        | `401` session invalide ou absente                                                                                    |
| `GET /users`                         | `admin`                                         | Aucun                                                                         | `200` — `User[]`                                                      | `401`, `403`                                                                                                         |
| `PATCH /users/{id}/role`             | `admin`                                         | `{ role }`                                                                    | `200` — `User` mis à jour, effectif à la reconnexion                  | `400` rôle ou ID invalide, `401`, `403`, `404`                                                                       |
| `GET /events`                        | Public                                          | Filtres et pagination ci-dessous                                              | `200` — `{ items: Event[], page, pageSize, total }`                   | `400` filtre, tri ou pagination invalide                                                                             |
| `GET /events/{id}`                   | Public ; brouillon visible par son propriétaire | ID événement                                                                  | `200` — `Event`                                                       | `400` ID invalide, `404` événement absent, ou brouillon d’un autre compte                                            |
| `POST /events`                       | `organizer`                                     | `EventInput`                                                                  | `201` — `Event` en `DRAFT`                                            | `400` données invalides, `401`, `403`                                                                                |
| `GET /me/events`                     | `organizer`                                     | Jeton                                                                         | `200` — `Event[]` de l’organisateur, brouillons inclus                | `401`, `403`                                                                                                         |
| `PATCH /events/{id}`                 | Propriétaire                                    | Champs modifiables de `EventInput`, ou `{ status: "PUBLISHED" }` pour publier | `200` — `Event` mis à jour                                            | `400` données invalides ou transition interdite, `401`, `403`, `404`, `409` capacité inférieure aux places réservées |
| `DELETE /events/{id}`                | Propriétaire                                    | ID événement                                                                  | `204` — corps vide                                                    | `400`, `401`, `403`, `404`, `409` réservations actives                                                               |
| `GET /locations`, `GET /categories`  | Public                                          | Aucun                                                                         | `200` — tableau de `{ id, name }` pour les filtres et formulaires     | —                                                                                                                    |
| `POST /events/{id}/bookings`         | Connecté                                        | `{ quantity }`, entier strictement positif                                    | `201` — `Booking` en `CONFIRMED`                                      | `400` quantité ou ID invalide, `401`, `404` événement absent ou non publié, `409` places insuffisantes               |
| `GET /me/bookings`                   | Connecté                                        | Jeton                                                                         | `200` — `Booking[]` du compte connecté, du plus récent au plus ancien | `401`                                                                                                                |
| `PATCH /bookings/{id}/cancel`        | Propriétaire de la réservation                  | ID réservation                                                                | `200` — `Booking` en `CANCELLED`, y compris si déjà annulée           | `400` ID invalide, `401`, `403` autre propriétaire, `404` réservation absente                                        |

### Cycle de vie d’un événement

- `DRAFT` → `PUBLISHED` uniquement. Pas de retour en brouillon dans le MVP : `PATCH` avec `{ status: "DRAFT" }` sur un événement publié renvoie `400`.
- Un événement publié reste modifiable. La capacité ne peut pas descendre sous le nombre de places réservées (`409 CAPACITY_BELOW_RESERVED`).
- La suppression est possible en `DRAFT` ou en `PUBLISHED` tant qu’aucune réservation `CONFIRMED` n’existe (`409 ACTIVE_BOOKINGS` sinon).

## Formats JSON

```text
RegisterInput = { email, password, pseudo, firstName?, lastName?, phone?, birthDate? }
User          = { id, email, pseudo, firstName, lastName, phone, birthDate, role }
EventInput    = { name, description?, startDate, endDate, locationId, categoryId, capacity }
Event         = { id, name, description, startDate, endDate, location: { id, name },
                  category: { id, name }, status, capacity, remainingSeats, organizerId }
EventSummary  = { id, name, startDate, endDate, location: { id, name }, status }
Booking       = { id, event: EventSummary, quantity, status, createdAt }
```

1. Utiliser `camelCase` pour les propriétés JSON. Seule exception : `access_token`, conservé pour la compatibilité avec le Front actuel.
2. Exposer les identifiants comme des chaînes UUID. Les dates d’événement sont sans heure, au format `YYYY-MM-DD`, avec `endDate >= startDate`. `birthDate` suit le même format. `createdAt` est un horodatage ISO 8601 en UTC.
3. Les champs optionnels absents valent `null` en réponse (`description`, `firstName`, `lastName`, `phone`, `birthDate`). `password` n’apparaît jamais dans une réponse.
4. Statuts en majuscules. `Event.status` vaut `DRAFT` ou `PUBLISHED`. `Booking.status` vaut `CONFIRMED` ou `CANCELLED`.
5. Contraintes de saisie : `password` de 8 caractères minimum, `pseudo` de 3 à 30 caractères, `capacity` entier strictement positif.

### Catalogue — `GET /events`

- Ne renvoie que les événements `PUBLISHED`, passés compris. Pour n’afficher que les événements à venir, le Front envoie `dateFrom` à la date du jour.
- Paramètres : `q` (recherche insensible à la casse dans `name` et `description`), `categoryId`, `locationId`, `dateFrom`, `dateTo` (bornes incluses sur `startDate`), `page` (défaut `1`), `pageSize` (défaut `20`, maximum `100`) et `sort=startDate:asc` ou `sort=startDate:desc` (défaut `asc`, puis `id` pour stabiliser la pagination).
- Les filtres se combinent. Une recherche sans résultat renvoie `200` et `items: []`.

### Erreurs

Format commun des erreurs JSON. Le Front réagit au champ `code` et affiche le champ `message`. Pour `VALIDATION_ERROR`, `details` liste les champs en erreur afin de les afficher sous le formulaire.

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Certaines données sont invalides.",
  "details": [{ "field": "capacity", "message": "La capacité doit être un entier positif." }]
}
```

Codes — `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_ALREADY_USED`, `INSUFFICIENT_SEATS`, `ACTIVE_BOOKINGS` et `CAPACITY_BELOW_RESERVED` (409). `details` est absent pour les autres codes.

## Données de démonstration

Le seed de la base crée un compte par rôle (`admin`, `organizer`, `participant`), quelques lieux et catégories, et des événements publiés et en brouillon. Les identifiants de ces comptes sont documentés dans le README, pas dans ce contrat.

## Hors MVP

- Types de billets et réservation `EN_ATTENTE` (#12), paiement sous 15 minutes (#13), QR code (#14), remboursement (#16).
- Filtre par prix (#9) : les événements n’ont pas de prix dans le MVP.
- Annulation d’un événement avec remboursement automatique (#20) : un événement avec des réservations actives ne peut pas être supprimé.
- Rafraîchissement du jeton, mot de passe oublié, statistiques organisateur (#21), modération (#24), rapports (#25).
- Notifications et messages `EventCreated` / `EventUpdated` : pas de RabbitMQ (ADR-001).

## Critères à partager avec les tests

- Sur deux demandes simultanées pour la dernière place, une obtient `201` et l’autre `409`. La jauge passe à zéro. Le Back enregistre l’inscription et le changement de stock dans la même transaction.
- Deux annulations de la même réservation renvoient `200` et le statut `CANCELLED`. La jauge augmente une seule fois.
- Un participant qui appelle `POST /events` reçoit `403`. Un autre compte que le propriétaire qui lit un brouillon reçoit `404`.
- La déconnexion efface la session locale du Front.

## Décisions validées

Les 5 points structurants ci-dessous ont été validés par l'ensemble de l'équipe afin de permettre le développement en parallèle du Front et du Back :

| #   | Question                                                                  | Pourquoi il faut trancher                                                                                                                            | Décision retenue                                                                                                   |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| D1  | Le Back suit-il les routes du contrat ou celles des tickets du Sprint 1 ? | Quatre tickets décrivent d’autres routes (détail ci-dessous). Si chacun suit sa source, le Front appellera des routes qui n’existent pas.            | Suivre le contrat et renommer les tickets.                                                                    |
| D2  | Quels champs demande-t-on à l’inscription ?                               | #29 prévoit pseudo, nom, téléphone et date de naissance. La v0 ne demandait que l’email et le mot de passe.                                          | `pseudo` obligatoire ; `firstName`, `lastName`, `phone` et `birthDate` optionnels.                            |
| D3  | Comment un compte devient-il organisateur ?                               | L’inscription crée toujours un `participant` et aucune route ne change le rôle : personne ne peut utiliser les écrans organisateur. #23 est en Must. | Comptes de démonstration créés par le seed, plus `GET /users` et `PATCH /users/{id}/role` réservés à l’admin. |
| D4  | Garde-t-on les types de billets et le statut `EN_ATTENTE` de #12 ?        | `EN_ATTENTE` n’a de sens qu’avec le paiement (#13), hors MVP. Les types de billets ajoutent une entité et un stock par type. Mais #12 est en Must.   | Pour le MVP : une quantité, sans type de billet, réservation `CONFIRMED` immédiatement. Mettre à jour #12.    |
| D5  | Un organisateur peut-il ouvrir son brouillon par son ID ?                 | Dans la v0, `GET /events/{id}` renvoie `404` pour tout événement non publié : l’écran de modification d’un brouillon ne peut pas le charger.         | Le propriétaire reçoit son brouillon, les autres comptes reçoivent `404`.                                     |

Détail de D1 — routes à aligner :

| Ticket | Route prévue par le ticket   | Route du contrat                                    |
| ------ | ---------------------------- | --------------------------------------------------- |
| #30    | `POST /users`                | `POST /users/register`                              |
| #32    | `POST /users/login`          | `POST /auth/login`                                  |
| #32    | `POST auth/validate-token`   | Supprimée : `GET /users/me` vérifie déjà le jeton   |
| #33    | Guard JWT dans l’API Gateway | Guard JWT dans l’API unique (ADR-001)               |
| #36    | `POST /events/:id/publish`   | `PATCH /events/{id}` avec `{ status: "PUBLISHED" }` |

## Validation avant développement en parallèle

- **Kenzo** valide le préfixe, les routes et les formats, notamment `locationId`, les rôles et les règles de stock. Le code existant utilise des noms comme `nom` et `date_debut`. La proposition les mappe dans les réponses publiques de l’API.
- **Robin** confirme que les réponses suffisent pour les écrans (revue faite pour cette v0.1) et part sur des mocks dès validation.
- **Claudia** prépare les tests à partir des mêmes réponses et codes d’erreur. **Chloé** confirme le périmètre à livrer avec le groupe.

Document validé par l’équipe, déposé dans `documentation/` et prêt pour l’intégration OpenAPI.
