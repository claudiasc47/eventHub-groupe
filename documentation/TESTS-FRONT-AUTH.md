# Tests Front — Inscription, connexion, profil et déconnexion

Ce bilan couvre le parcours compte intégré dans `frontend/` : inscription, connexion, profil et déconnexion locale. Les écrans initialement adaptés dans `services/users-service/ui/` ont été transférés vers le squelette React, TypeScript et Vite, avec les mocks MSW et les tests Vitest / React Testing Library.

L’intégration a été fusionnée dans `main` par la [PR #94](https://github.com/claudiasc47/eventHub-groupe/pull/94), au commit `a93041f`. La validation avec l’API réelle reste à effectuer.

## Référence du contrat

| Source | Version et sections examinées |
| --- | --- |
| [Contrat d’API v0.1](Contrat-API-v0.1-EventHub.md) | Contrat validé le 13 novembre 2026. Sections « Connexion Front/Back », « Routes », « Formats JSON », « Erreurs » et déconnexion locale. |
| [OpenAPI](openapi.yaml) | OpenAPI 3.1.0, version d’API `0.1.0`. Opérations d’inscription, de connexion et de profil ; schémas `RegisterInput`, `LoginInput`, `LoginResponse`, `User` et `Error`. |

Fichiers concernés : [RegisterPage.tsx](../frontend/src/pages/RegisterPage.tsx), [LoginPage.tsx](../frontend/src/pages/LoginPage.tsx), [ProfilePage.tsx](../frontend/src/pages/ProfilePage.tsx), [Layout.tsx](../frontend/src/components/Layout.tsx), [gestion de session](../frontend/src/auth/session.ts) et [client Axios](../frontend/src/api/client.ts).

## Requêtes et formats communs

- **Inscription** — `POST /api/users/register`, route publique, JSON `{ email, password, pseudo, firstName?, lastName?, phone?, birthDate? }`. Le mot de passe comporte au moins 8 caractères et le pseudo entre 3 et 30. Les champs facultatifs vides sont omis par le formulaire. `birthDate` suit `YYYY-MM-DD`, sans heure. Aucun rôle n’est envoyé.
- **Connexion** — `POST /api/auth/login`, route publique, JSON `{ email, password }`. La réponse attendue contient `{ access_token, user }`.
- **Profil** — `GET /api/users/me`, avec `Authorization: Bearer <access_token>`.
- **Réponse `User`** — `{ id, email, pseudo, firstName, lastName, phone, birthDate, role }`. Les quatre champs facultatifs valent `null` lorsqu’ils ne sont pas renseignés. Le rôle vaut `participant`, `organizer` ou `admin`.
- **Erreurs** — `{ statusCode, code, message }`, avec `details: [{ field, message }]` pour `VALIDATION_ERROR`.
- **Session locale** — La connexion enregistre `token`, `role` et `email`. La déconnexion les supprime sans appel HTTP. Un `401` reçu lors du chargement du profil efface également la session et redirige vers `/login`.

## Tests automatisés et mocks

La suite [Auth.test.tsx](../frontend/src/pages/Auth.test.tsx) utilise Vitest, React Testing Library et MSW. Les [handlers partagés](../frontend/src/mocks/auth.ts) simulent les trois routes du parcours compte. Le stockage local et les handlers sont réinitialisés entre les tests.

| Scénario | Situation simulée | Vérifications automatisées |
| --- | --- | --- |
| **Inscription réussie** | `201`, profil minimal puis complet. | Corps sans rôle, champs vides omis, date sans heure, redirection vers `/login` et absence de session créée. |
| **Inscription invalide** | `400 VALIDATION_ERROR`, détails pour le pseudo et la date de naissance. | Messages associés aux champs avec `aria-describedby`, maintien sur le formulaire. |
| **E-mail déjà utilisé** | `409 EMAIL_ALREADY_USED`. | Message sous l’e-mail, attribut `aria-invalid`, correction puis inscription réussie. |
| **Connexion et profil complet** | `200`, jeton simulé puis réponse de profil retardée. | Corps de connexion, stockage de session, en-tête `Bearer`, redirection, chargement et affichage du profil. |
| **Connexion invalide** | `400 VALIDATION_ERROR`. | Message global, maintien sur `/login` et absence de session. |
| **Identifiants incorrects** | `401 UNAUTHENTICATED`. | Message « Email ou mot de passe incorrect. » et absence de session. |
| **Champs facultatifs absents** | Inscription minimale puis connexion avec les handlers partagés. | Quatre valeurs « Non renseigné », pseudo et rôle `participant` affichés. |
| **Session expirée** | Jeton stocké rejeté par le mock de profil avec `401`. | Suppression des trois valeurs de session et redirection vers `/login`. |
| **Panne réseau** | Absence de réponse sur chacun des trois appels. | Message de repli, maintien sur la page et conservation de la session sur le profil. |
| **Erreur serveur** | `503` sans corps sur chacun des trois appels. | Message générique, maintien sur la page et conservation de la session sur le profil. |
| **Déconnexion et retour arrière** | Déconnexion locale puis retour dans l’historique. | Suppression de session, redirection, absence d’appel HTTP de déconnexion et de réaffichage du profil. |
| **Profil sans jeton** | Accès direct à `/profile` sans session. | Redirection vers `/login` avant toute requête de profil. |

Les tests vérifient le comportement du Front face à des réponses simulées. Ils ne valident ni la persistance PostgreSQL, ni la signature ou l’expiration réelle des JWT, ni la conformité des réponses du Back à OpenAPI.

## Résultats de validation locale

Vérifications effectuées le 23 novembre 2026 sur la branche `claudia`, au commit `61e3208`, avant sa fusion dans `main` :

| Commande, depuis `frontend/` | Résultat |
| --- | --- |
| `npm ci` | Installation réussie ; aucune vulnérabilité signalée par l’audit npm. |
| `npm run lint` | Aucun avertissement ni erreur. |
| `npm test` | 3 fichiers réussis, soit 24 tests : 16 pour le parcours compte, 6 pour les erreurs API et 2 pour le routage et la navigation. |
| `npm run build` | Vérification TypeScript et build de production Vite réussis. |

Le nombre de tests ne constitue pas une mesure de couverture de code. Le rapport de couverture et le test de bout en bout sur l’API réelle restent à produire.

## Vérifications encore à faire

### Dans le navigateur

Pour utiliser les mocks en développement, définir `VITE_MOCK_AUTH=true` dans `frontend/.env` et relancer Vite. Le compte fictif est `demo@example.test` / `demo-eventhub`. Les comptes créés et les sessions simulées restent en mémoire jusqu’au rechargement.

- Rejouer le parcours inscription → connexion → profil → déconnexion et vérifier les chargements et messages d’erreur.
- Après déconnexion, utiliser le bouton Retour, ouvrir directement `/profile` et recharger la page. Contrôler l’affichage, le stockage et les requêtes.
- Vérifier la navigation au clavier, la visibilité du focus et le rendu sur mobile.

### Avec l’API réelle, mocks désactivés

Définir `VITE_MOCK_AUTH=false`, configurer `VITE_API_URL` puis relancer Vite.

- Créer un compte minimal puis complet ; vérifier le rôle `participant` et les champs facultatifs.
- Soumettre une adresse déjà utilisée pour vérifier le `409`. Contrôler le format du `400` et les noms de champs dans `details`.
- Vérifier la connexion valide, le `401` sur mauvais mot de passe et le chargement du profil avec le JWT obtenu.
- Vérifier le `401` après expiration réelle du JWT, dont la durée contractuelle est d’une heure, puis la suppression de session et la redirection.
- Rejouer la déconnexion locale et l’accès direct au profil sans jeton.
- Consigner les écarts avec le contrat, les étapes de reproduction et les tickets de correction associés.

Les routes d’inscription, de connexion et de profil sont présentes dans le Back de `main`. Leur présence dans le code ne vaut pas validation du parcours intégré ; aucune recette sur l’API réelle n’est attestée dans ce bilan.
