# EventHub — Front React / Vite

## Lancement local

Prérequis : Node.js 22.12 ou supérieur et npm. Depuis la racine, dans PowerShell :

```powershell
cd services/users-service/ui
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```

Ouvrir http://localhost:5173/login. Il n’y a pas de page pour `/`.
Les commandes de lancement des API sont dans le [README racine](../../../README.md#démarrer-en-local).

Tous les appels passent par le client Axios `src/api.js` et son unique
`baseURL`, lue depuis `import.meta.env.VITE_API_URL`. L’exemple utilise
`http://localhost:3001`, adresse actuelle de Users Service avec Compose.
Sans cette variable, le client signale une erreur de configuration.
Le jeton stocké sous `token` est joint par l’intercepteur sous la forme
`Authorization: Bearer <token>`.

Ne pas écraser un `.env` existant : y ajouter ou y ajuster `VITE_API_URL`.
Vite lit la configuration au démarrage et l’intègre au bundle à la compilation :
relancer le serveur après un changement et reconstruire avant livraison.
Les variables `VITE_*` sont publiques ; ne pas y mettre de secret.
Conserver l’origine `http://localhost:5173`, autorisée par le CORS actuel.

Pour compiler, depuis le dossier du Front après configuration de `.env` :

```powershell
npm.cmd run build
```

Ou depuis la racine : `npm.cmd run build --prefix services/users-service/ui`.
Le résultat se trouve dans `dist/` (ignoré par Git).

## Écrans et appels existants

Les six routes sont déclarées dans `src/App.jsx`.
Tous les chemins API ci-dessous sont relatifs à `VITE_API_URL`.
Ils décrivent le service utilisateurs actuel, pas le contrat de la future API.

| Écran | Route navigateur | Appels actuels |
| --- | --- | --- |
| Connexion | `/login` | `POST /auth/login` |
| Inscription | `/register-user` | `POST /users/register` |
| Profil | `/profile` | `GET /users/me` |
| Administration | `/admin` | `GET /users/admin` |
| Changement de mot de passe | `/reset` | `POST /users/reset-password` |
| Gestion des utilisateurs | `/users` | `GET /users/all`, `POST /users/register`, `DELETE /users/:id` |

La connexion enregistre `access_token`, `user.role` et `user.email` dans
`localStorage` sous les clés `token`, `role` et `email`, puis ouvre le profil.
Le profil affiche l’email et le rôle reçus du serveur ; une erreur renvoie
vers la connexion. Le bouton Logout de `src/components/Navbar.jsx` supprime
`token` et `role`, puis ouvre `/login` ; l’email reste actuellement stocké.
`src/pages/Logout.jsx` existe mais n’est pas monté dans le routeur.
La déconnexion actuelle est locale et n’appelle aucune route serveur.

## Emplacement et préparation de l’API unique

Inspection du 13 novembre 2026 : l’[ADR-001](../../../documentation/ADR-001-simplifier-architecture.md)
porte le statut « Proposé, en attente de validation par l’équipe ».
Aucune validation du déplacement vers `frontend/`, aucun dossier cible ni
déplacement en cours n’a été trouvé dans l’état local du dépôt.
L’intégration reste donc dans `services/users-service/ui`.
Robin doit confirmer l’emplacement avant une éventuelle migration unique et
la mise à jour des scripts qui en dépendront.

Aucun contrat OpenAPI/Swagger ni implémentation de la nouvelle API regroupée
n’a été trouvé. Les applications NestJS existantes restent séparées.
Les routes et formats des écrans sont conservés en attendant le contrat de Kenzo.
Changer seulement l’URL ne suffira que si ce contrat reste compatible.
L’ancienne passerelle expose `POST /api/auth/login`, mais ne relaie pas les
routes utilisateurs nécessaires au profil et à l’inscription ; elle ne peut
donc pas remplacer directement Users Service pour l’ensemble de ces écrans.

### Points précis à confirmer avec Kenzo

Les routes ci-dessous sont **les routes actuelles à comparer avec le futur contrat**,
et ne constituent aucune proposition de nouveaux endpoints.

| Besoin | Contrat actuel utilisé par le Front | À confirmer pour l’API unique |
| --- | --- | --- |
| URL commune | `http://localhost:3001`, sans préfixe global | URL, port, éventuel préfixe commun et CORS pour `http://localhost:5173`, y compris l’en-tête Authorization |
| Connexion | `POST /auth/login`, corps `{ email, password }` ; réponse `{ access_token, refresh_token, user: { id, email, role } }` | Chemin, champs, type du jeton, structure de `user`, rôles et erreurs ; le Front n’exploite pas le refresh token |
| Profil | `GET /users/me`, Bearer ; réponse directe `{ id, email, role }` | Chemin, authentification et réponse directe ou enveloppée ; erreurs 401/403 |
| Inscription | `POST /users/register`, corps `{ email, password, role }` ; serveur actuel : `{ message, user: { id, email, role } }` ; le Front utilise seulement le succès HTTP | Chemin, champs requis, rôles autorisés et règles de validation ; le formulaire actuel propose participant/admin |
| Déconnexion | Suppression locale de la session, aucune requête | Une révocation serveur sera-t-elle requise ? Si oui, fournir son contrat |
| Administration | `GET /users/admin`, Bearer ; réponse `{ msg }` | Maintien du parcours et règles de rôle |
| Mot de passe | `POST /users/reset-password`, Bearer ; corps `{ oldPassword, newPassword }`, réponse `{ message }` | Route, champs et erreurs de validation |
| Utilisateurs | `GET /users/all` → tableau de `{ id, email, role }` ; `DELETE /users/:id` → `{ message }` | Routes, éventuelle pagination, type de l’identifiant et permissions |
| Catalogue futur | Aucun écran ni appel catalogue dans le Front | Fournir route, filtres, pagination, champs d’un événement, réponse et règles d’accès avant branchement |

La passerelle actuelle possède `GET /api/booking/events` et
`GET /api/booking/events/:id`. Ces routes appartiennent à l’ancienne
architecture et ne sont pas utilisées par le Front. Leur présence ne valide
ni les chemins ni les formats du futur catalogue de l’API unique.

## Vérification et reprise des parcours

Compilation de production réussie le 13 novembre 2026 avec
`VITE_API_URL=http://localhost:3001` fournie à l’environnement du processus,
sans modifier les éventuels fichiers `.env` locaux. La commande exécutée
est `npm.cmd run build` (99 modules transformés). Le premier essai était
bloqué par le bac à sable (`spawn EPERM` d’esbuild) ; la relance autorisée
hors bac à sable a réussi.

Contrôle du 13 novembre 2026 : les tentatives HTTP vers
`http://localhost:3001/users/me` et `http://localhost:3000/api/booking/events`
échouent à établir une connexion (aucune réponse HTTP).
La connexion, l’inscription, le profil et la déconnexion n’ont donc pas été
validés de bout en bout dans le navigateur. Le catalogue reste non testable
car son écran et son branchement n’existent pas encore.

Quand l’API sera disponible, vérifier depuis `/register-user` la création d’un
compte de test participant, puis depuis `/login` sa connexion et l’affichage
de son email/rôle sur `/profile`. Dans l’onglet Réseau, vérifier l’URL issue
de `VITE_API_URL` et le Bearer du profil. Cliquer Logout, vérifier le retour
à `/login` et la suppression de `token`/`role`, puis vérifier qu’un accès au
profil ne restitue pas les données de la session précédente.
Robin et Claudia pourront reprendre cette vérification après confirmation
du contrat par Kenzo, puis ajouter le catalogue quand son écran sera prêt.
