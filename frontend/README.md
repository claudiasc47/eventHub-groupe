# EventHub — Front (React + TypeScript + Vite)

SPA du MVP EventHub (ADR-001). Elle consomme l'API unique décrite par le
[contrat v0.1](../documentation/Contrat-API-v0.1-EventHub.md) et son
[OpenAPI](../documentation/openapi.yaml).

## Lancement local

Prérequis : Node.js 20.19+ ou 22.12+.

```bash
cd frontend
cp .env.example .env   # PowerShell : Copy-Item .env.example .env
npm install
npm run dev
```

Le Front est servi sur http://localhost:5173, l'origine autorisée par le CORS de l'API.
Avec Docker, `docker compose up` à la racine lance aussi le service `web`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification TypeScript puis build de production dans `dist/` |
| `npm run lint` | Lint (oxlint) |
| `npm run gen:api` | Régénère `src/api/schema.d.ts` depuis `documentation/openapi.yaml` |

## Appels API

- Tous les appels passent par `src/api/client.ts` : une seule `baseURL`, lue dans `VITE_API_URL`
  (préfixe `/api` inclus), et le jeton `Authorization: Bearer` ajouté automatiquement.
- Les types des requêtes et réponses viennent de `src/api/types.ts`, alias des schémas générés.
  Après toute modification de `openapi.yaml`, lancer `npm run gen:api` et commiter le résultat.
- `VITE_API_URL` est lue au démarrage de Vite : relancer le serveur après l'avoir modifiée.
