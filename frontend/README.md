# EventHub — Front (React + TypeScript + Vite)

SPA du MVP EventHub (ADR-001). Elle consomme l'API unique décrite par le
[contrat v0.1](../documentation/Contrat-API-v0.1-EventHub.md) et son
[OpenAPI](../documentation/openapi.yaml).

## Lancement local

Prérequis : Node.js 22.22.2 ou plus récent.
`.npmrc` active `engine-strict` : `npm install` refuse une version de Node trop ancienne.

```bash
cd frontend
cp .env.example .env   # PowerShell : Copy-Item .env.example .env
npm install
npm run dev
```

Le Front est servi sur http://localhost:5173, l'origine autorisée par le CORS de l'API.
Avec Docker, `docker compose up` à la racine lance aussi le service `web`.

## Scripts

| Commande               | Rôle                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Serveur de développement Vite                                        |
| `npm run build`        | Vérification TypeScript puis build de production dans `dist/`        |
| `npm run lint`         | Lint (oxlint)                                                        |
| `npm run format`       | Formate le code avec Prettier                                        |
| `npm run format:check` | Vérifie le formatage sans modifier les fichiers                      |
| `npm test`             | Tests (Vitest + React Testing Library), lancement unique comme en CI |
| `npm run test:watch`   | Tests relancés à chaque modification                                 |
| `npm run gen:api`      | Régénère `src/api/schema.d.ts` depuis `documentation/openapi.yaml`   |

## Appels API

- Tous les appels passent par `src/api/client.ts` : une seule `baseURL`, lue dans `VITE_API_URL`
  (préfixe `/api` inclus), et le jeton `Authorization: Bearer` ajouté automatiquement.
- Les types des requêtes et réponses viennent de `src/api/types.ts`, alias des schémas générés.
  Après toute modification de `openapi.yaml`, lancer `npm run gen:api` et commiter le résultat.
- `VITE_API_URL` est lue au démarrage de Vite : relancer le serveur après l'avoir modifiée.
- En cas d'échec d'un appel, `getApiError(err)` (`src/api/errors.ts`) renvoie `status`, `code`,
  `message` à afficher et `fieldErrors` (erreurs de validation par champ, pour les formulaires).

## Tests

Les tests sont à côté du code (`*.test.ts` / `*.test.tsx`). `src/test/setup.ts` ajoute les
matchers `jest-dom` (`toBeInTheDocument()`…) et une valeur fictive de `VITE_API_URL` est fournie
par `vite.config.ts`. `src/App.test.tsx` sert d'exemple de test d'écran.

Les tests d'authentification interceptent les requêtes HTTP avec MSW. Pour les
essayer dans le navigateur, mettre `VITE_MOCK_AUTH=true` dans `.env` et relancer Vite.
Le compte fictif `demo@example.test` utilise le mot de passe `demo-eventhub`.
Les comptes créés et les sessions simulées existent en mémoire jusqu'au rechargement.
Pour utiliser l'API réelle, laisser `VITE_MOCK_AUTH=false` et configurer `VITE_API_URL`.

## Mes réservations

La route `/me/bookings` nécessite une session. Elle consomme `GET /me/bookings`
et `PATCH /bookings/{id}/cancel` selon le contrat. L’annulation demande une
confirmation ; une erreur conserve la réservation et permet une nouvelle tentative.

Pour tester l’écran avant la disponibilité des endpoints, définir
`VITE_MOCK_BOOKINGS=true` dans `frontend/.env`, puis relancer Vite. Ce mode
intercepte uniquement les routes de réservations et affiche une mention de
démonstration. Il peut être utilisé avec une connexion réelle ou avec
`VITE_MOCK_AUTH=true`. Les réservations simulées sont isolées par jeton et
réinitialisées au rechargement. Elles ne prouvent pas la persistance côté Back.

Avec Docker, après modification de `frontend/.env` :

```bash
docker compose restart web
```

Pour la recette réelle, définir `VITE_MOCK_BOOKINGS=false`. Si les endpoints
ne sont pas disponibles, l’écran affiche une erreur et un bouton « Réessayer ».

## Mes événements organisateur

La route `/me/events` affiche les brouillons et événements publiés du compte
organisateur connecté via `GET /me/events`. Le profil est d’abord vérifié avec
`GET /users/me` ; seuls les comptes `organizer` accèdent à la liste. Le Back reste
responsable du contrôle des droits et du filtrage par propriétaire.

L’écran propose un filtre par statut, le nombre de brouillons et de publications,
les horaires et les places disponibles. Le lien de création mène à `/events/new`.
Chaque carte propose un lien vers l’écran de modification `/events/{id}/edit`.

Pour la démonstration locale, ajouter `VITE_MOCK_ORGANIZER=true` dans `frontend/.env`
et redémarrer Vite ou `docker compose restart web`. Ce mode simule aussi
`GET /users/me` avec un profil organisateur, y compris sur la page Profil ; il
accepte le jeton de la session locale sans vérifier sa signature. Une mention
explicite signale la simulation. Il ne modifie pas le rôle du compte en base.
Pour tester les droits et les événements réels, désactiver ce mode et utiliser
un compte organisateur fourni par le Back.

## Création d’événement

La route `/events/new` est réservée aux comptes `organizer` (`RequireRole` : sans session,
redirection vers `/login` ; avec un autre rôle, message d’accès refusé). Elle charge
`GET /locations` et `GET /categories`, puis envoie `POST /events`. Les dates saisies en heure
locale sont converties en horodatage ISO 8601 UTC, comme l’exige le contrat. L’événement est
créé en brouillon ; sa publication se fait ensuite depuis `/events/:id/edit`
(section suivante).

Pour la démonstration locale, ajouter `VITE_MOCK_EVENTS=true` (lieux, catégories, création)
et `VITE_MOCK_AUTH=true`, puis se connecter avec `organizer@example.test` / `demo-eventhub`.

## Modification et publication

La route `/events/:id/edit` charge le profil, l’événement, les lieux et les
catégories. Le formulaire est réservé à l’organisateur propriétaire. Les contrôles
Front facilitent le parcours ; l’API doit appliquer les mêmes autorisations.

La sauvegarde utilise `PATCH /events/{id}` avec les seuls champs modifiés, sans
identifiant d’utilisateur ni rôle. Les dates sont affichées dans le fuseau du
navigateur et converties en ISO 8601 UTC lors de l’envoi. Une description effacée
est transmise à `null`. Le formulaire vérifie le nom, la capacité entière positive
et l’ordre des dates. Un conflit `CAPACITY_BELOW_RESERVED` conserve les saisies.

La publication d’un brouillon demande confirmation puis envoie les changements
avec `status: "PUBLISHED"`. Aucun retour en brouillon n’est proposé. Un événement
publié reste modifiable.

Avec `VITE_MOCK_ORGANIZER=true`, les handlers simulent également le détail,
les référentiels et le PATCH. Les changements sont conservés par session simulée
pendant la navigation vers « Mes événements », puis réinitialisés au rechargement.
La recette réelle des autorisations, de la persistance et des conflits de capacité
reste à effectuer avec les mocks désactivés.

## Détail d’un événement

`/events/:id` affiche les informations et les places disponibles via
`GET /events/{id}`. Un événement publié est visible sans connexion. L’API
vérifie l’identité du visiteur pour les brouillons et renvoie `404` aux autres
visiteurs.

Avec `VITE_MOCK_ORGANIZER=true`, ouvrir
`/events/e1be1089-12ef-46d3-89ab-916db978cbb5` pour voir un événement publié
de démonstration.

## Thèmes et visuel

`src/design.css` contient les couleurs et styles partagés. Le bouton de navigation
permet de choisir le thème clair vert pâle ou le thème sombre. Le choix est conservé
localement ; à défaut, la préférence du système est utilisée.

Le visuel du bandeau est stocké dans `src/assets/eventhub-venue.png`. Vite gère
son URL et son nom de fichier versionné lors du build, sans requête vers un hébergeur
externe. Il est décoratif et ne contient aucune information nécessaire au parcours.
Une version WebP peut remplacer le PNG sous le nom `eventhub-venue.webp` ; conserver
un seul format pour éviter d’intégrer plusieurs versions au build.
