# Tests Front — Inscription, connexion, profil et déconnexion

Ce bilan couvre les écrans React historiques et le bouton de déconnexion de la barre de navigation. Le transfert vers `frontend/` et l’intégration de MSW attendent la fusion de la PR de Robin.

## Référence du contrat

Les deux fichiers ont été examinés dans `origin/main` au commit `caf4f616ed380cd3874420411f3f3504754db2a8`.

| Source | Version et sections examinées |
| --- | --- |
| `documentation/Contrat-API-v0.1-EventHub.md` | Contrat v0.1 validé par l’équipe le 13 novembre 2026, ajouté au commit `e3b31c1f3c25ba9ffc5f10479151e582bc600295`. Sections « Connexion Front/Back » (ligne 17), « Routes » (25), « Formats JSON » (51), « Erreurs » (75) et déconnexion locale (107). |
| `documentation/openapi.yaml` | OpenAPI 3.1.0, version d’API `0.1.0`, ajouté au commit `0d7fd9c9c82dcacb612cf78dc9adbbcb8a2813fd`. Opérations d’inscription (ligne 40), de connexion (73) et de profil (96). Schémas `RegisterInput` (577), `LoginInput` (604), `LoginResponse` (616), `User` (626) et `Error` (838). |

Fichiers Front examinés : [Register.jsx](../services/users-service/ui/src/pages/Register.jsx), [Login.jsx](../services/users-service/ui/src/pages/Login.jsx), [Profile.jsx](../services/users-service/ui/src/pages/Profile.jsx), [Navbar.jsx](../services/users-service/ui/src/components/Navbar.jsx) et [client Axios](../services/users-service/ui/src/api.js).

## Requêtes et formats communs

- **Inscription** — `POST /api/users/register`, route publique, JSON `{ email, password, pseudo, firstName?, lastName?, phone?, birthDate? }`. `email` respecte le format e-mail, `password` fait au moins 8 caractères et `pseudo` entre 3 et 30. Les quatre champs facultatifs peuvent être omis ou valoir `null`. La date renseignée suit `YYYY-MM-DD`, sans heure. Le corps ne contient pas de `role`.
- **Connexion** — `POST /api/auth/login`, route publique, JSON `{ email, password }`.
- **Profil** — `GET /api/users/me`, sans corps, avec `Authorization: Bearer <access_token>` pour une session authentifiée.
- **Réponse `User`** — `{ id, email, pseudo, firstName, lastName, phone, birthDate, role }`. `id` est un UUID. Les quatre champs de profil facultatifs sont présents et valent `null` quand ils ne sont pas renseignés. `role` vaut `participant`, `organizer` ou `admin`.
- **Erreurs documentées** — `{ statusCode, code, message }`. Pour `VALIDATION_ERROR`, `details` décrit les champs en erreur sous la forme `[{ field, message }]`. Les exemples OpenAPI illustrent les messages. Leur libellé exact peut varier.

## Scénarios de recette

La colonne « Simulations effectuées » décrit les vérifications en mémoire faites sur le Front historique avec des réponses HTTP, des états de composant et un stockage simulés. La colonne « Tests MSW à faire » décrit la future suite. Aucun scénario n’a été exécuté avec MSW, dans un navigateur ou sur l’API réelle.

| Scénario | Requête et réponse à simuler | Comportement attendu dans l’interface | Simulations effectuées | Tests MSW à faire |
| --- | --- | --- | --- | --- |
| **Inscription réussie** | Inscription valide → `201`, `User` avec `role: "participant"`, sans jeton. | Redirection vers `/login`. | Corps envoyé sans `role`, champs vides omis et redirection. | Intercepter le POST et vérifier le corps, la redirection et l’absence de création de session. |
| **Données d’inscription invalides** | Inscription → `400`, `{ statusCode: 400, code: "VALIDATION_ERROR", message, details: [{ field, message }] }`. | Message sous chaque champ signalé. Le formulaire reste affiché. | Erreur associée au pseudo. | Renvoyer plusieurs erreurs dans une même réponse et vérifier leur association aux champs. |
| **E-mail déjà utilisé** | Inscription → `409`, `{ statusCode: 409, code: "EMAIL_ALREADY_USED", message }`. | Message sous l’e-mail et maintien sur le formulaire. | Affichage sous le bon champ et absence de redirection. | Vérifier le rendu du conflit et la possibilité de corriger l’e-mail. |
| **Connexion réussie** | Connexion valide → `200`, `{ access_token: string, user: User }`. | Stockage de `token`, `role` et `email`, puis ouverture de `/profile`. | Stockage des trois valeurs et redirection. | Rejouer la connexion puis vérifier le JWT transmis à la requête de profil. |
| **Données de connexion invalides** | Connexion → `400`, `{ statusCode: 400, code: "VALIDATION_ERROR", message, details: [{ field, message }] }`. | Le message global apparaît dans le formulaire, sans création de session. | Affichage du `message` global. | Rejouer le `400` pendant une soumission du formulaire. |
| **Identifiants incorrects** | Connexion → `401`, `{ statusCode: 401, code: "UNAUTHENTICATED", message }`. | « Email ou mot de passe incorrect » dans le formulaire, sans création de session. | Message, maintien sur `/login` et absence d’écriture de session. | Vérifier la distinction entre le `401` de connexion et une panne réseau. |
| **Profil complet** | Profil avec JWT valide → `200`, `User` avec les quatre champs de profil renseignés. | Chargement, puis affichage du pseudo, de l’e-mail, du rôle et des informations de profil. | Chargement, en-tête `Bearer`, valeurs et date `YYYY-MM-DD`. | Retarder la réponse pour vérifier le chargement, puis contrôler les valeurs affichées. |
| **Champs facultatifs absents** | Profil avec JWT valide → `200`, `User` avec `firstName: null`, `lastName: null`, `phone: null`, `birthDate: null`. | « Non renseigné » pour chacune de ces valeurs. | Rendu avec les quatre valeurs à `null`. | Rejouer le profil avec le corps exact, en conservant les clés à `null`. |
| **Session expirée** | Profil avec JWT expiré → `401`, `{ statusCode: 401, code: "UNAUTHENTICATED", message }`. | Effacement de `token`, `role` et `email`, puis redirection vers `/login`. | `401` avec ou sans jeton, nettoyage et redirection. | Partir d’une session stockée, renvoyer `401` et vérifier les trois suppressions. |
| **Panne réseau** | Un des trois appels ne reçoit aucune réponse HTTP. | Message d’API inaccessible sur la connexion et le profil. Message de repli sur l’inscription. Le profil conserve la session. | Connexion et profil. | Couvrir les trois appels et vérifier la conservation de la session sur le profil. |
| **Erreur serveur** | Un des trois appels reçoit un `5xx`. **Pour la recette, utiliser un `503` sans corps.** Le contrat ne précise ni statut `5xx` particulier ni format pour ce cas. | Message de repli. Le profil conserve la session. | `503` sur la connexion et le profil. | Couvrir les trois appels et vérifier que le `503` ne provoque pas la redirection prévue pour un `401`. |
| **Déconnexion locale** | Aucune requête ni réponse HTTP. Le contrat prévoit l’effacement de la session locale. | Le bouton efface `token`, `role` et `email`, puis ouvre `/login`. | Suppression des trois valeurs, redirection et aucun appel HTTP de déconnexion. | Intégrer cette action au scénario connecté et vérifier les requêtes émises. |
| **Accès au profil après déconnexion** | Si l’écran lance `GET /api/users/me` sans en-tête `Authorization` → `401`, `{ statusCode: 401, code: "UNAUTHENTICATED", message }`. | Retour vers `/login` et absence des données du profil précédent. | Réouverture simulée sans JWT ni affichage des données précédentes. | Rejouer l’accès direct après déconnexion et vérifier la requête si elle est émise. |

## Vérifications encore à faire

### Dans le navigateur après intégration

- Exécuter avec MSW le parcours inscription → connexion → profil → déconnexion. Vérifier les erreurs à leur emplacement dans les formulaires et les états de chargement.
- Après déconnexion, utiliser le bouton Retour, ouvrir directement `/profile` et recharger la page. Vérifier l’affichage, le stockage et les requêtes dans les outils du navigateur.
- Rejouer une panne réseau et une réponse serveur pour vérifier que les écrans restent utilisables et que la session du profil est conservée.

### Avec l’API réelle, mocks désactivés

- Créer un compte avec les seuls champs obligatoires, vérifier le rôle `participant`, puis soumettre la même adresse pour obtenir le `409`. Contrôler également la forme du `400` et les noms de champs renvoyés dans `details`.
- Vérifier la connexion valide et le `401` sur mauvais mot de passe. Ouvrir le profil avec le JWT obtenu et contrôler les champs facultatifs à `null`, puis le rendu d’un compte dont le profil est renseigné.
- Vérifier le `401` après expiration réelle du JWT, dont la durée de vie contractuelle est d’une heure. Rejouer la déconnexion locale et l’accès direct au profil sans jeton.

L’API locale était inaccessible lors de la dernière vérification. La référence Back examinée, `origin/feature/api` au commit `3c60d74fb1f9bc0a65b327bb9c0c49f11352b485`, ne déclarait pas encore ces trois routes métier dans `backend/`.
