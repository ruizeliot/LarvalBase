# PRD — audit4 : Application de Planification de Vacances

**Version :** 1.0
**Date :** 15 février 2026
**Statut :** Approuvé (brainstorm validé)

---

## 1. Vision & Objectifs

### 1.1 Vision

Créer une application mobile-first intuitive qui permet de planifier et organiser ses vacances de bout en bout, en combinant planification manuelle et suggestions IA optionnelles. L'app se distingue par un focus équilibré sur deux piliers : **la gestion du budget** et **la planification d'itinéraire**.

### 1.2 Objectifs

- **O1 :** Permettre la création et la gestion complète d'un voyage (itinéraire, budget, participants) en une seule application
- **O2 :** Offrir un mode hybride où l'utilisateur garde le contrôle tout en bénéficiant de suggestions IA optionnelles
- **O3 :** Supporter les voyages solo et les voyages de groupe avec partage de frais
- **O4 :** Fournir une expérience mobile-first avec version web complémentaire

### 1.3 Positionnement

**Gap identifié :** Entre Splitwise (gestion de dépenses uniquement) et Wanderlog (itinéraire-first avec budget secondaire).

**Différenciation :**
- Budget et Itinéraire traités comme piliers égaux (vs Wanderlog où le budget est un add-on)
- Mode hybride : suggestions optionnelles, pas imposées (vs Wanderlog plus IA-heavy)
- Flexibilité solo/groupe sans complexifier l'onboarding

### 1.4 Public cible

- Voyageurs individuels souhaitant organiser leurs vacances de manière structurée
- Groupes de voyageurs ayant besoin de coordonner itinéraires et dépenses partagées
- Familles (couvertes par le mode groupe)
- Utilisateurs cherchant un planificateur léger, pas un assistant IA complet

---

## 2. Spécifications fonctionnelles

### Epic 1 — 🏠 Accueil & Dashboard

**Description :** Point d'entrée de l'application. Vue d'ensemble de tous les voyages, accès rapide au prochain trip, résumé des indicateurs clés.

#### Fonctionnalités

| ID | Fonctionnalité | Priorité | Description |
|----|---------------|----------|-------------|
| E1-F1 | Liste des voyages | P0 | Affichage de tous les voyages avec cards visuelles, tags (budget, groupe/solo, terminé/en cours) |
| E1-F2 | Hero card prochain voyage | P0 | Card mise en avant du voyage à venir avec countdown, résumé budget et itinéraire |
| E1-F3 | Actions rapides | P1 | Grid d'actions : ajouter dépense, voir carte, inviter des participants, créer un voyage |
| E1-F4 | Résumé budget/itinéraire | P1 | Indicateurs visuels du budget utilisé et des prochaines étapes de l'itinéraire |
| E1-F5 | Animations d'entrée | P2 | Animations slide-up au chargement, hover effects sur les cards |

#### User Stories

- **US-E1-01 :** En tant qu'utilisateur, je veux voir tous mes voyages en un coup d'œil afin de choisir rapidement lequel consulter
- **US-E1-02 :** En tant qu'utilisateur, je veux accéder directement à mon prochain voyage afin de ne pas perdre de temps en navigation
- **US-E1-03 :** En tant qu'utilisateur, je veux voir un résumé budget/itinéraire afin de savoir où j'en suis sans entrer dans les détails

---

### Epic 2 — 🗺️ Itinéraire & Carte

**Description :** Pilier central #1. Planning jour par jour, carte interactive, optimisation de trajets. Permet de structurer le voyage dans le temps et l'espace.

#### Fonctionnalités

| ID | Fonctionnalité | Priorité | Description |
|----|---------------|----------|-------------|
| E2-F1 | Vue Timeline | P0 | Planning jour par jour avec activités ordonnées, tags par type (culture, gastronomie, transport, nature) |
| E2-F2 | Vue Carte | P0 | Carte interactive avec pins pour chaque activité, lignes de trajet entre les points |
| E2-F3 | Vue Liste | P1 | Résumé compact de l'itinéraire (toutes les activités dans un format condensé) |
| E2-F4 | Drag & drop | P1 | Réorganisation des activités par glisser-déposer sur la timeline |
| E2-F5 | Optimisation de trajets | P1 | Calcul automatique de l'itinéraire optimal entre les points (suggestion IA) |
| E2-F6 | Statistiques de trajet | P2 | Distance totale, temps de déplacement estimé, nombre d'activités |
| E2-F7 | Switch entre vues | P0 | Navigation fluide entre les 3 vues (Carte, Timeline, Liste) |

#### User Stories

- **US-E2-01 :** En tant qu'utilisateur, je veux organiser mon voyage jour par jour afin d'avoir un planning clair
- **US-E2-02 :** En tant qu'utilisateur, je veux voir mes activités sur une carte afin de comprendre la géographie de mon voyage
- **US-E2-03 :** En tant qu'utilisateur, je veux réorganiser mes activités par glisser-déposer afin d'optimiser mon planning facilement
- **US-E2-04 :** En tant qu'utilisateur, je veux que l'app me suggère un itinéraire optimisé afin de minimiser les temps de trajet
- **US-E2-05 :** En tant qu'utilisateur, je veux switcher entre vue carte, timeline et liste afin de voir mon voyage sous différents angles

---

### Epic 3 — 💰 Budget & Dépenses

**Description :** Pilier central #2. Suivi des dépenses, partage des frais, alertes budget. Essentiel pour le contrôle financier individuel et la gestion de groupe.

#### Fonctionnalités

| ID | Fonctionnalité | Priorité | Description |
|----|---------------|----------|-------------|
| E3-F1 | Progression budget | P0 | Barre de progression visuelle du budget utilisé vs total alloué |
| E3-F2 | Catégories de dépenses | P0 | Grid de catégories (restauration, hébergement, transport, activités) avec montants par catégorie |
| E3-F3 | Fil de dépenses | P0 | Liste chronologique de toutes les dépenses, filtrable par catégorie |
| E3-F4 | Ajout rapide de dépense | P0 | Formulaire simplifié pour ajouter une dépense (montant, catégorie, description) |
| E3-F5 | Alerte budget | P1 | Notification visuelle quand le budget approche ou dépasse le seuil |
| E3-F6 | Graphique de répartition | P1 | Pie chart de la répartition des dépenses par catégorie |
| E3-F7 | Partage des frais | P1 | Attribution d'une dépense à un ou plusieurs participants (lié à Epic 4) |

#### User Stories

- **US-E3-01 :** En tant qu'utilisateur, je veux voir combien j'ai dépensé par rapport à mon budget afin de contrôler mes finances
- **US-E3-02 :** En tant qu'utilisateur, je veux catégoriser mes dépenses afin de savoir où va mon argent
- **US-E3-03 :** En tant qu'utilisateur, je veux ajouter une dépense rapidement afin de ne pas oublier de la noter
- **US-E3-04 :** En tant qu'utilisateur, je veux être alerté si je dépasse mon budget afin de pouvoir ajuster mes dépenses
- **US-E3-05 :** En tant qu'utilisateur, je veux attribuer une dépense à plusieurs participants afin de partager les frais équitablement

---

### Epic 4 — 👥 Mode Groupe

**Description :** Fonction support pour les voyages à plusieurs. Invitation, collaboration temps réel, partage de frais entre participants.

#### Fonctionnalités

| ID | Fonctionnalité | Priorité | Description |
|----|---------------|----------|-------------|
| E4-F1 | Liste des membres | P0 | Affichage des participants avec avatars, rôles (admin/membre), statut en ligne |
| E4-F2 | Invitation par lien | P0 | Génération d'un lien d'invitation partageable + options de partage social |
| E4-F3 | Partage des frais | P0 | Vue "qui doit quoi à qui" avec simplification automatique des dettes |
| E4-F4 | Feed d'activité | P1 | Flux temps réel des actions du groupe (dépenses ajoutées, itinéraire modifié, membres rejoints) |
| E4-F5 | Règlement des dettes | P1 | Boutons pour marquer une dette comme réglée, historique des règlements |
| E4-F6 | Rôles et permissions | P2 | Admin peut modifier l'itinéraire et le budget, membre peut ajouter des dépenses |

#### User Stories

- **US-E4-01 :** En tant qu'organisateur, je veux inviter des amis à mon voyage afin de planifier ensemble
- **US-E4-02 :** En tant que membre d'un groupe, je veux voir qui doit combien à qui afin de régler les dettes facilement
- **US-E4-03 :** En tant que membre d'un groupe, je veux que les dettes soient simplifiées automatiquement afin de minimiser les transactions
- **US-E4-04 :** En tant qu'organisateur, je veux voir l'activité du groupe en temps réel afin de suivre l'avancement de la planification

---

### Epic 5 — 🤖 Suggestions IA

**Description :** Implémente le côté "suggestions optionnelles" du mode hybride. Recommandations contextuelles, optimisation d'itinéraire, chat IA.

#### Fonctionnalités

| ID | Fonctionnalité | Priorité | Description |
|----|---------------|----------|-------------|
| E5-F1 | Suggestions d'activités | P1 | Cards de recommandations contextuelles avec score de pertinence (%), prix, distance, notation |
| E5-F2 | Optimisation d'itinéraire | P1 | Proposition d'itinéraire optimisé avec stats d'économie (temps/km gagnés) |
| E5-F3 | Chat IA | P2 | Interface conversationnelle pour questions libres sur le voyage |
| E5-F4 | Toggle par type | P1 | Switch entre suggestions d'activités, d'itinéraire et de budget |
| E5-F5 | Ajout en un clic | P1 | Ajouter une suggestion directement à l'itinéraire ou au budget |

#### User Stories

- **US-E5-01 :** En tant qu'utilisateur, je veux recevoir des suggestions d'activités pertinentes afin de découvrir des lieux intéressants
- **US-E5-02 :** En tant qu'utilisateur, je veux que l'IA propose un itinéraire optimisé afin de gagner du temps de trajet
- **US-E5-03 :** En tant qu'utilisateur, je veux pouvoir ajouter une suggestion à mon planning en un clic afin de ne pas perdre de temps
- **US-E5-04 :** En tant qu'utilisateur, je veux poser des questions libres à l'IA afin d'obtenir des conseils personnalisés

---

### Epic 6 — ⚙️ Profil & Paramètres

**Description :** Gestion du compte, préférences, personnalisation. Fonction support pour l'ensemble de l'application.

#### Fonctionnalités

| ID | Fonctionnalité | Priorité | Description |
|----|---------------|----------|-------------|
| E6-F1 | Profil voyageur | P1 | Stats personnelles : voyages complétés, distance totale, pays visités |
| E6-F2 | Préférences | P0 | Devise, langue, unités de mesure |
| E6-F3 | Notifications | P1 | Toggles pour push, email, rappels de voyage |
| E6-F4 | Gestion des voyages | P1 | Liste des voyages actifs et archivés, option d'archivage |
| E6-F5 | Export de données | P2 | Export complet des données personnelles (conformité RGPD) |
| E6-F6 | Suppression de compte | P2 | Zone danger avec confirmation pour supprimer le compte |

#### User Stories

- **US-E6-01 :** En tant qu'utilisateur, je veux configurer ma devise et ma langue afin que l'app s'adapte à mes préférences
- **US-E6-02 :** En tant qu'utilisateur, je veux voir mes statistiques de voyage afin de suivre mon historique
- **US-E6-03 :** En tant qu'utilisateur, je veux exporter mes données afin d'exercer mon droit RGPD
- **US-E6-04 :** En tant qu'utilisateur, je veux archiver un voyage terminé afin de garder un dashboard propre

---

## 3. Contraintes techniques

### 3.1 Plateforme

| Aspect | Choix | Justification |
|--------|-------|---------------|
| Approche | Mobile-first | Planification en déplacement |
| Mobile | iOS + Android | Couverture maximale |
| Web | Version responsive | Édition confortable sur desktop |
| Viewport minimum | 375px | iPhone SE et équivalents |

### 3.2 Performance

- Temps de chargement initial < 3 secondes sur 4G
- Animations à 60fps (CSS natif, pas de librairie lourde)
- Mode hors ligne pour consultation de l'itinéraire et du budget

### 3.3 Design

- Design system cohérent (palette, typographie, spacing)
- Inspiré des apps natives iOS/Android pour les sections settings
- Navigation par tabs pour les sections principales
- Interactions tactiles (drag & drop, swipe, pinch-to-zoom sur carte)

### 3.4 Données et confidentialité

- Conformité RGPD (export de données, suppression de compte)
- Chiffrement des données sensibles (informations de voyage, budgets)
- Pas de monétisation par les données utilisateur (projet personnel)

### 3.5 Intégrations potentielles

- API de cartographie (Google Maps, Mapbox, ou OpenStreetMap)
- API de suggestions (lieux, restaurants, activités)
- Système de paiement pour le règlement des dettes (optionnel, V2)
- Import de réservations depuis email (optionnel, V2)

---

## 4. Découpage en Epics

| # | Epic | Type | Priorité | Dépendances |
|---|------|------|----------|-------------|
| 1 | 🏠 Accueil & Dashboard | Support | P0 | — |
| 2 | 🗺️ Itinéraire & Carte | Pilier | P0 | Epic 1 |
| 3 | 💰 Budget & Dépenses | Pilier | P0 | Epic 1 |
| 4 | 👥 Mode Groupe | Support | P1 | Epic 3 (partage de frais) |
| 5 | 🤖 Suggestions IA | Support | P1 | Epic 2 + Epic 3 |
| 6 | ⚙️ Profil & Paramètres | Support | P1 | Epic 1 |

### Ordre d'implémentation recommandé

1. **Phase 1 (MVP) :** Epic 1 (Dashboard) + Epic 2 (Itinéraire) + Epic 3 (Budget) + Epic 6 (Profil)
2. **Phase 2 :** Epic 4 (Groupe) — dépend du budget pour le partage de frais
3. **Phase 3 :** Epic 5 (Suggestions IA) — dépend de l'itinéraire et du budget pour les recommandations

---

## 5. Métriques de succès

| Métrique | Cible | Mesure |
|----------|-------|--------|
| Voyages créés par utilisateur | ≥ 2 | Analytics |
| Taux de complétion d'itinéraire | > 70% | % d'itinéraires avec ≥ 3 activités |
| Utilisation du budget | > 60% | % de voyages avec suivi budget activé |
| Adoption groupe | > 30% | % de voyages avec ≥ 2 participants |
| Satisfaction suggestions IA | > 50% | % de suggestions acceptées |

---

## 6. Références

- **Wanderlog** (https://wanderlog.com) — référence principale, itinéraire + carte + collaboration
- **Splitwise** (https://splitwise.com) — référence pour la gestion de dépenses partagées
- **TripIt** (https://www.tripit.com) — référence pour la gestion de réservations
- **Google Maps** — référence pour la cartographie et l'optimisation de trajets

---

## Annexes

### A. Mockups

Les 6 mockups HTML standalone sont disponibles dans le dossier `mockups/` :
1. `01-dashboard.html` — Accueil & Dashboard
2. `02-itineraire-carte.html` — Itinéraire & Carte
3. `03-budget-depenses.html` — Budget & Dépenses
4. `04-mode-groupe.html` — Mode Groupe
5. `05-suggestions-ia.html` — Suggestions IA
6. `06-profil-parametres.html` — Profil & Paramètres

### B. Glossaire

- **Mode hybride :** Combinaison de planification manuelle (contrôle utilisateur) et de suggestions IA optionnelles
- **Pilier :** Fonctionnalité centrale et structurante de l'application
- **Epic :** Ensemble fonctionnel autonome correspondant à une section de l'application
- **MVP :** Minimum Viable Product — première version fonctionnelle
