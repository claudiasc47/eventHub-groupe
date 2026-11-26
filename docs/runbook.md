# Runbook EventHub

> **Rôle du document :** Procédures opérationnelles pas à pas pour diagnostiquer et résoudre rapidement une panne sur **EventHub** (Front React/Vite, API NestJS, PostgreSQL, Mailpit, CI/CD).
> **Gouvernance :** Rédigé et maintenu à jour par **Arnaud** (CI/CD, Qualité technique & Runbook) via Pull Request relue par l'autre couche. Chaque incident donnant lieu à un post-mortem sous 48 h enrichit ce fichier, et une entrée est relue et testée au hasard à chaque fin de sprint.

---

## Démarrer en local

1. Copier le fichier d'environnement d'exemple à la racine du dépôt :

       cp -n .env.example .env

   Attendu : le fichier `.env` existe à la racine sans écraser une configuration locale existante.

2. Installer et compiler le Back (nécessaire car le volume `./backend:/app` masque le `dist/` de l'image), puis démarrer la stack Docker (`eventhub-db`, `eventhub-api`, `eventhub-mailpit`, `eventhub-web`) :

       npm --prefix backend ci && npm --prefix backend run build && docker compose up -d --build

   Attendu : le build NestJS réussit (`backend/dist` généré) et les 4 conteneurs démarrent et passent à l'état `Up` (`healthy` pour `db` et `api`).

3. Vérifier l'état des conteneurs :

       docker compose ps

   Attendu : `eventhub-db`, `eventhub-api`, `eventhub-mailpit` et `eventhub-web` sont listés avec les ports `5432`, `3000`, `8025`/`1025` et `5173`.

4. Contrôler que l'API répond :

       curl -i http://localhost:3000/api/health

   Attendu : code HTTP `200 OK`.

---

## Symptômes

### 1. Symptôme : le Front n'affiche aucune donnée ou affiche une erreur réseau / CORS

#### Vérifications
1. Tester la disponibilité de l'API NestJS :

       curl -i http://localhost:3000/api/health

   Attendu : code HTTP `200 OK` (si `Connection refused`, l'API est arrêtée ou crashée).

2. Vérifier l'URL d'API configurée pour le Front dans `.env` :

       grep "^VITE_API_URL=" .env

   Attendu : `VITE_API_URL=http://localhost:3000/api` (avec le préfixe `/api`).

3. Vérifier l'origine autorisée côté Back dans `.env` :

       grep "^CORS_ORIGIN=" .env

   Attendu : `CORS_ORIGIN=http://localhost:5173`.

#### Cause probable
- Le conteneur `eventhub-api` est arrêté ou a échoué au démarrage, ou bien `VITE_API_URL` / `CORS_ORIGIN` ne correspondent pas aux ports locaux (`5173` pour le Front, `3000/api` pour le Back).

#### Action
1. Consulter les dernières lignes de logs du Back pour identifier une éventuelle erreur de démarrage :

       docker compose logs --tail=50 api

2. Aligner `VITE_API_URL=http://localhost:3000/api` et `CORS_ORIGIN=http://localhost:5173` dans `.env` si nécessaire (sans jamais commiter `.env`).
3. Recréer et redémarrer l'API et le Front pour appliquer les nouvelles variables du `.env` :

       docker compose up -d api web

#### Escalade
- Prévenir **Kenzo** (périmètre Back) si `eventhub-api` reste en erreur, **Robin** (périmètre Front) si la requête échoue côté client malgré un `200 OK`, ou **Arnaud** (Docker / Infra) si le problème vient du réseau Docker Compose.

#### Contrôle final
- Ouvrir `http://localhost:5173` dans le navigateur : le catalogue des événements s'affiche sans erreur réseau ni erreur CORS dans la console.

---

### 2. Symptôme : la CI est rouge sur une Pull Request (`Backend CI`, `Frontend CI` ou `Validate OpenAPI Contract`)

#### Vérifications
1. Vérifier la syntaxe de `docker-compose.yml` (job `Validate Docker Compose`) :

       cp -n .env.example .env && docker compose config -q

   Attendu : aucune sortie et code de retour `0`.

2. Vérifier le lint, le build et les tests unitaires du Back (job `Backend CI (NestJS)`) :

       cd backend && npm run lint && npm run build && npm test && cd ..

   Attendu : 0 erreur ESLint, build NestJS réussi et toutes les suites Jest passées (`PASS`).

3. Vérifier le lint, le build et les tests du Front (job `Frontend CI (React / Vite)`) :

       cd frontend && npm run lint && npm run build && npm test && cd ..

   Attendu : 0 erreur Oxlint, build Vite réussi et tous les tests Vitest passés.

4. Vérifier la validité du contrat OpenAPI (job `Validate OpenAPI Contract`) :

       npx --yes @redocly/cli@latest lint documentation/openapi.yaml

   Attendu : `Woohoo! Your API definition is valid.` (0 erreur).

#### Cause probable
- Un fichier modifié ne respecte pas les règles de lint/typage TypeScript, casse un test existant, ou introduit une incohérence dans `documentation/openapi.yaml`.

#### Action
1. Lancer uniquement la commande en échec relevée à l'étape précédente pour afficher le détail de l'erreur.
2. Corriger le code, le test ou la spécification OpenAPI concernée.
3. Relancer la vérification locale correspondante jusqu'à obtenir un code de retour `0`, puis pousser le correctif sur la branche de la PR.

#### Escalade
- Prévenir **Arnaud** (CI/CD & Tests automatisés), ainsi que le référent de la couche impactée (**Robin** pour le Front, **Kenzo** pour le Back) sur le canal de coordination de l'équipe.

#### Contrôle final
- Les 4 checks GitHub Actions (`Validate Docker Compose`, `Backend CI (NestJS)`, `Frontend CI (React / Vite)`, `Validate OpenAPI Contract`) passent au vert sur la Pull Request.

---

### 3. Symptôme : la base est vide ou aucun compte utilisateur n'est disponible pour la recette

#### Vérifications
1. Vérifier que le conteneur PostgreSQL `eventhub-db` est sain :

       docker compose ps db

   Attendu : état `Up (healthy)`.

2. Vérifier l'état des tables et des utilisateurs en base dans le conteneur PostgreSQL :

       docker compose exec db psql -U eventhub -d eventhub -c "SELECT email, role FROM users;"

   Attendu : la table `users` existe (0 ligne si aucun compte de test n'a encore été créé, car le Back actuel ne génère pas de comptes de démonstration par défaut).

#### Cause probable
- Les migrations TypeORM n'ont pas encore été exécutées sur la base locale, ou aucun compte de test n'a encore été inscrit et confirmé pour la recette.

#### Action
1. Appliquer les migrations TypeORM en attente dans le conteneur API :

       docker compose exec api npm run migration:run

2. Créer un compte de test via l'interface d'inscription (`http://localhost:5173`) ou via `POST /api/auth/register`.
3. Récupérer le jeton de confirmation reçu dans Mailpit (`http://localhost:8025`) et valider le compte via `POST /api/auth/verify-email`.

#### Escalade
- Prévenir **Kenzo** (périmètre Back / Base de données) si une migration échoue au démarrage ou lors de `migration:run`.

#### Contrôle final
- Se connecter sur `http://localhost:5173` avec le compte de test créé et confirmé : l'authentification réussit (`200 OK`) et redirige vers l'application.

---

### 4. Symptôme : l'inscription renvoie `201 Created` mais aucun e-mail de vérification n'est reçu

#### Vérifications
1. Vérifier que le serveur SMTP local Mailpit tourne :

       docker compose ps mailpit

   Attendu : `eventhub-mailpit` à l'état `Up` sur les ports `8025` et `1025`.

2. Vérifier les variables SMTP dans `.env` :

       grep -E "^MAIL_(HOST|PORT)=" .env

   Attendu : `MAIL_HOST=mailpit` et `MAIL_PORT=1025`.

#### Cause probable
- En développement local, les e-mails ne sont pas envoyés vers une boîte externe mais interceptés par **Mailpit**, ou le conteneur `eventhub-mailpit` est arrêté.

#### Action
1. Démarrer ou redémarrer le conteneur Mailpit :

       docker compose up -d mailpit

2. Ouvrir l'interface web Mailpit à l'adresse `http://localhost:8025` pour consulter les e-mails capturés.

#### Escalade
- Prévenir **Kenzo** (périmètre Back) si aucun message n'apparaît dans Mailpit après une nouvelle inscription, ou **Arnaud** (Docker) si le conteneur `eventhub-mailpit` refuse de démarrer.

#### Contrôle final
- Récupérer le token dans Mailpit (`http://localhost:8025`), le transmettre à `POST /api/auth/verify-email` (la page Front `/verify-email` étant absente), puis vérifier que la connexion réussit sur `http://localhost:5173`.

---

### 5. Symptôme : divergence de contrat API entre le Front et le Back (champ manquant, type invalide ou erreur `400`/`404`)

#### Vérifications
1. Valider la spécification OpenAPI de référence :

       npx --yes @redocly/cli@latest lint documentation/openapi.yaml

   Attendu : aucune erreur de schéma.

2. Vérifier si les types TypeScript générés côté Front sont synchronisés avec `documentation/openapi.yaml` :

       cd frontend && npm run gen:api && git diff src/api/schema.d.ts && cd ..

   Attendu : `git diff` vide si les types Front étaient déjà à jour.

#### Cause probable
- Une route ou un DTO a été modifié côté Back sans mise à jour de `documentation/openapi.yaml`, ou les types Front (`frontend/src/api/schema.d.ts`) n'ont pas été régénérés.

#### Action
1. Mettre à jour `documentation/openapi.yaml` pour refléter le contrat validé (`documentation/Contrat-API-v0.1-EventHub.md`).
2. Régénérer les types côté Front :

       cd frontend && npm run gen:api && cd ..

3. Lancer les tests Front et Back pour confirmer la compatibilité :

       cd frontend && npm test && cd ../backend && npm test && cd ..

#### Escalade
- Ouvrir un ticket d'écart de contrat et prévenir **Robin** (Front), **Kenzo** (Back) et **Chloé** (périmètre produit) avant de fusionner la PR.

#### Contrôle final
- `npm run build` et `npm test` passent sans erreur côté Front et côté Back, et Swagger UI (`http://localhost:3000/api/docs`) reflète le même format de réponse.

---

## Déploiement et retour arrière

### Déploiement d'une version validée
1. Vérifier que la branche `main` est propre et à jour, avec tous les checks CI au vert :

       git checkout main && git pull origin main

   Attendu : branche `main` synchronisée avec `origin/main`.

2. Poser un tag de version daté/numéroté avant mise en ligne :

       git tag -a v0.x.0 -m "Release v0.x.0" && git push origin v0.x.0

   Attendu : le tag apparaît sur le dépôt distant.

3. Installer les dépendances, recompiler le Back et redémarrer les services avec la configuration cible :

       npm --prefix backend ci && npm --prefix backend run build && docker compose up -d --build

   Attendu : la compilation NestJS réussit et tous les conteneurs redémarrent sans erreur.

4. Exécuter le contrôle de santé et un parcours critique (catalogue + connexion) :

       curl -i http://localhost:3000/api/health

   Attendu : code HTTP `200 OK`, puis validation manuelle de la liste des événements et de la connexion sur `http://localhost:5173`.

### Retour arrière sans paniquer (Rollback)
1. Lister les versions saines déjà taguées :

       git tag --list

   Attendu : affichage de la liste des tags disponibles (ex. `v0.1.0`, `v0.2.0`).

2. Revenir à la dernière version saine (ou annuler le commit fautif sur `main` via `git revert`) :

       git checkout <tag-sain>

   Attendu : le dépôt local est positionné sur le commit validé du tag sain.

3. Recompiler le Back sur cette version saine et relancer la stack :

       npm --prefix backend ci && npm --prefix backend run build && docker compose up -d --build

   Attendu : la compilation réussit et les conteneurs redémarrent sur la version antérieure stable.

4. Contrôler le retour à la normale :

       curl -i http://localhost:3000/api/health

   Attendu : `200 OK` et affichage normal du catalogue sur `http://localhost:5173`.

5. Prévenir toute l'équipe sur le canal de communication et planifier un **post-mortem sans blâme sous 48 h** (`docs/post-mortems/`).

---

## Contacts et escalade

| Périmètre | Référent | Quand escalader |
| :--- | :--- | :--- |
| **Front-end (React / Vite / UI / Mocks)** | **Robin** | Erreur d'affichage, routage, désynchronisation avec `openapi.yaml` |
| **Back-end (NestJS / API / BDD / Mailpit)** | **Kenzo** | Erreur `500`, API arrêtée, échec migration/seed PostgreSQL, SMTP |
| **CI/CD, Docker, Déploiement, Tests & Runbook** | **Arnaud** | Pipeline GitHub Actions rouge, Docker Compose, rollback, mise à jour du runbook |
| **Recette & Tests fonctionnels** | **Claudia** | Validation des parcours et cas d'erreur sur les livrables |
| **Périmètre & Arbitrage fonctionnel** | **Chloé** | Impact sur le périmètre d'une user story ou report en sprint |

### Règles de vie du document
- **Boucle post-mortem :** `Incident` → `Post-mortem (sous 48 h)` → `Action (« Ajouter l'entrée au runbook »)` → `Runbook`.
- **Relecture croisée :** Toute modification de `docs/runbook.md` passe par une Pull Request relue et testée pas à pas par un membre de l'autre couche.
- **Contrôle de fin de sprint :** Une entrée du runbook est tirée au hasard, rejouée et vérifiée à chaque fin de sprint.
