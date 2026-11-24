# Service Événements

---

## 1. Rôle du service

Le Service Événements a pour responsabilités principales :

- Gérer les événements : création, mise à jour, annulation, suppression logique.
- Gérer les métadonnées associées : catégories, statuts, dates, capacité indicative, etc.
- Exposer une API de recherche et de filtrage des événements (par date, catégorie, mot‑clé…).
- Publier des **événements métiers** sur le message broker, par exemple :
  - `EventCreated`
  - `EventUpdated`
  - `EventCancelled`
- Servir de source de vérité pour toutes les informations liées aux événements, consultées par la billetterie, le paiement et les notifications.

---

## 2. Architecture interne

L’architecture interne suit une organisation en couches simple et testable :

- **Controller (REST)**  
  - Expose les endpoints HTTP (`/events`, `/categories`…).  
  - Valide les entrées (DTO, schémas de validation).  
  - Gère les codes de réponses HTTP.

- **Service (domaine)**  
  - Contient la logique métier : règles de validation, statuts d’événement, cohérence des dates, gestion de la publication, etc.  
  - Orchestration avec les repositories et le bus d’événements (publication des messages `EventCreated`, `EventUpdated`, `EventCancelled`).

- **Repository / Accès aux données**  
  - Encapsule l’accès à la base de données (ex. PostgreSQL via ORM).  
  - Fournit des méthodes pour :
    - créer / mettre à jour un événement,
    - rechercher par critères,
    - récupérer les événements par organisateur, par statut, etc.

- **Intégration avec le message broker**  
  - Adaptateur dédié pour publier les événements métiers sur le broker (RabbitMQ).  

---

## 3. Routes principales (API REST)

Les routes présentées ci‑dessous sont indicatives ; adaptez les noms / schémas selon votre implémentation réelle.

### 3.1 Ressource Événements

- `GET /events`  
  Récupérer la liste des événements avec filtres possibles :  
  - `?q=` (recherche texte),  
  - `?categoryId=`,  
  - `?dateFrom=`, `?dateTo=`,  
  - `?status=` (DRAFT, PUBLISHED, CANCELLED…).

- `GET /events/:id`  
  Récupérer le détail d’un événement par son identifiant.

- `POST /events`  
  Créer un nouveau événement.  
  Corps typique :
{
"title": "Conférence Microservices",
"description": "…",
"startDate": "2025-06-01T09:00:00Z",
"endDate": "2025-06-01T18:00:00Z",
"locationId": "…",
"categoryId": "…",
"capacity": 200
}

text
- Publie un événement métier `EventCreated` sur le broker.

- `PUT /events/:id`  
Mettre à jour un événement existant (titre, dates, capacité, description…).  
- Publie un événement `EventUpdated`.

- `DELETE /events/:id` (optionnel)  
Suppression logique ou définitive selon vos choix.

### 3.2 Ressource Catégories 

- `GET /categories`  
Liste des catégories d’événements.

- `POST /categories`  
Création d’une nouvelle catégorie.

- `PUT /categories/:id`  
Mise à jour d’une catégorie.

### 3.3 Ressource Location 

- `GET /location`  
Liste des lieux d’événements.

- `POST /location`  
Création d’un nouveau lieu.

- `PUT /location/:id`  
Mise à jour d’un lieu.

---

## 4. Intégration avec les autres services

- **Billetterie**  
- Consomme les événements `EventCreated` / `EventUpdated` pour préparer les quotas de billets.  
- Consomme `EventCancelled` pour bloquer la vente et déclencher la logique d’annulation de billets.

- **Paiement**  
- Consomme `EventCancelled` pour initier les workflows de remboursement de masse si nécessaire.

- **Notifications**  
- Consomme `EventCreated` / `EventUpdated` / `EventCancelled` pour informer les participants et organisateurs (email, push, etc.).

---

