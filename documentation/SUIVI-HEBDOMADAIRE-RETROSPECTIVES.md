# Suivi hebdomadaire et rétrospectives — EventHub

> **Période couverte :** à partir du 6 novembre 2026  
> **Dernière mise à jour :** 23 novembre 2026  
> **Équipe :** Claudia / Arnaud / Kenzo / Robin / Chloé

## Objectif du document

Ce document garde une trace de l’avancement du projet, des objectifs annoncés et atteints, des décisions prises, des difficultés rencontrées et des améliorations retenues lors des rétrospectives. Il sert de mémoire commune à l’équipe et permet de comparer les objectifs prévus aux résultats observés.

Les éléments ci-dessous reprennent les informations communiquées par l’équipe et les décisions déjà consignées dans les documents du projet. Les informations qui restent à confirmer sont signalées comme telles : elles pourront être complétées lors de la prochaine revue.

## Repères du projet

EventHub est une application de gestion d’événements et de réservations. Le périmètre technique retenu est une application React/Vite, une API NestJS et une base de données PostgreSQL. Les principales fonctionnalités du MVP concernent les utilisateurs, les événements et les réservations. Les choix d’architecture et de modèle de données sont détaillés dans les [décisions d’architecture](../docs/adr/ADR-001-architecture-spa-api-unifiee.md) et le [modèle de données](../docs/adr/ADR-002-modele-donnees-simplifie.md). Le [contrat d’API](./Contrat-API-v0.1-EventHub.md) décrit les parcours et échanges attendus entre le Front et le Back.

## Historique des comptes rendus

### Du 6 au 13 novembre 2026 — Cadrage et préparation

**Objectif de la période :** organiser le travail avant le premier sprint et établir une base commune pour le développement.

**Travaux rapportés**

- Définition des user stories et clarification des besoins à couvrir.
- Répartition des rôles et des responsabilités au sein de l’équipe.
- Création des sprints et organisation des premiers travaux.
- Création du schéma de la base de données.

**Résultats et repères**

- Le contrat d’API v0.1 a été validé par l’équipe le 13 novembre.
- Le choix d’une application Front React/Vite, d’une API NestJS unifiée et d’une base PostgreSQL a été consigné dans l’ADR-001 du 13 novembre.

**Points à compléter lors d’une prochaine revue**

- Référencer le backlog et les user stories retenues, avec leurs critères d’acceptation.
- Préciser la répartition des rôles et les responsables de chaque sujet.
- Ajouter les dates et objectifs prévus pour chaque sprint.

### Du 13 au 22 novembre 2026 — Sprint 1

**Objectif de la période :** mettre en place les fondations de l’application et démarrer les fonctionnalités cœur.

**Travaux prévus ou rapportés**

- Création et configuration de la base de données.
- Gestion des utilisateurs.
- Création d’événements.

**Décision de conception pendant le sprint**

- Le modèle relationnel a été simplifié autour de cinq tables : `users`, `locations`, `categories`, `events` et `bookings`. Cette décision est documentée dans l’ADR-002 du 20 novembre.

**Bilan**

- État d’avancement détaillé des fonctionnalités : 
        - Inscription et connexion d'un utilisateur fonctionnel (front et back)
        - Creation d'un evenement fonctionnel cote back uniquement


### 23 novembre 2026 — Objectifs de clôture du Sprint 1

**Objectif annoncé :** terminer le Sprint 1.

**Travaux visés**

- Finaliser l’envoi d’un email de confirmation après l’inscription.
- Réaliser les tests de l’application et corriger les anomalies bloquantes.
- Réaliser la page web pour la création d'evènements 

**Résultat de la journée :**

- Le parcours d’inscription fonctionne de bout en bout et le résultat attendu est visible par l’utilisateur.
- Les tests prévus sont exécutés ; leurs résultats et les éventuels échecs sont consignés.
- Les user stories du sprint sont classées comme terminées ou reportées.


## Rétrospective du Sprint 1

### Ce qui a bien fonctionné

- La coordination entre le Front et le Back a permis de commencer le développement de l’interface avec des données fictives pendant la mise en place de l’API, sans bloquer l’avancement de l’équipe.

### Ce qui a été difficile ou a ralenti l’équipe

- Le démarrage du projet et l’organisation du travail en parallèle ont rendu la coordination initiale plus exigeante, notamment pour que chacun puisse avancer sans dépendre des autres.

### Ce que nous avons appris

- Une communication plus régulière sur l’avancement, les besoins et les blocages permettrait de gagner du temps et de mieux s’entraider.

### Bilan du sprint

| Indicateur | Bilan |
| --- | --- |
| Tests automatisés recensés à la clôture | 113 cas (52 Back et 61 Front, répartis sur 17 fichiers) |
| Anomalies restantes | 0 |
| Objectif du sprint atteint ? | OUI |


### Du 24 Novembre au 6 Décembre — Sprint 2

**Objectif de la période :**  
Mettre en place un parcours de réservation fonctionnel et faciliter la recherche d’événements grâce à des filtres, notamment par lieu et par date.

**Travaux prévus**

- Implémenter les filtres de recherche des événements côté Back, puis les intégrer à l’interface Front.
- Permettre aux utilisateurs de réserver des places et d’annuler une réservation.
- Gérer la quantité de places réservées et mettre à jour le nombre de places restantes.

**Travaux réalisés**

- [Résultat observable, lien vers une PR, un ticket ou une livraison.]

**Décisions prises**

- [Décision — raison — personnes concernées — document de référence, le cas échéant.]

**Difficultés, dépendances ou risques**

- [Blocage ou risque — impact — action de résolution — responsable.]

**Prochaines étapes**

- [Action — responsable — échéance.]

### Rétrospective de la période

- **À poursuivre :** [pratique efficace à conserver.]
- **À améliorer :** [difficulté ou processus à faire évoluer.]
- **À essayer :** [changement concret à tester au prochain sprint.]
- **Actions retenues :** [responsable, échéance et statut pour chaque action.]

## Règles de mise à jour

1. Ajouter les faits au fil de l’eau ou à la fin de chaque revue, en indiquant la date.
2. Garder une trace des objectifs initiaux même lorsqu’ils changent ; ajouter la décision et sa raison au lieu de réécrire l’historique.
3. Relier autant que possible les éléments aux user stories, tickets, pull requests, tests ou documents concernés.
4. Distinguer clairement une décision validée d’une proposition ou d’un point encore à arbitrer.
5. Pour chaque action de rétrospective, indiquer un responsable, une échéance et un statut, puis vérifier son avancement à la revue suivante.
