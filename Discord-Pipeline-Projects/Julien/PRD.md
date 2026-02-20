# NeuralForge — Product Requirements Document (PRD)

> **Version :** 1.0
> **Date :** 2026-02-20
> **Auteur :** Pipeline Office (compilation brainstorm Julien Lesbegueries)
> **Statut :** Ready for implementation

---

## 1. Vision produit

### Concept
**NeuralForge** est une application desktop permettant de construire visuellement des architectures de réseaux de neurones spécialisés en forecasting de timeseries. L'utilisateur assemble des layers dans un éditeur node-based (style ReactFlow), entraîne le modèle sur des données CSV, puis visualise les prédictions avec zones de confiance.

### Positionnement
Outil de ML expérimental pour data scientists et développeurs qui veulent itérer rapidement sur des architectures de réseaux de neurones pour de la prédiction temporelle, sans écrire de code Burn/Rust à la main.

### Public cible
- Data scientists travaillant sur du forecasting de timeseries
- Développeurs Rust/ML familiers avec Burn
- Profil technique (niveau 3) — pas besoin de vulgarisation

### Proposition de valeur
- **Visuel** : construction d'architectures par drag & drop (pas de code)
- **Intégré** : de l'import CSV à la prédiction, tout dans une seule app
- **Cross-platform** : GPU via Wgpu, pas de CUDA requis
- **Desktop** : pas de cloud, données restent locales

---

## 2. Stack technique

| Composant | Technologie | Version min |
|-----------|-------------|-------------|
| Shell | Tauri v2 | 2.x |
| Frontend | React + TypeScript | React 18+ |
| Éditeur de réseau | ReactFlow | 11+ |
| Graphiques | echarts + echarts-for-react | 5.x |
| Backend | Rust | 1.75+ |
| ML Framework | Burn | latest |
| GPU Backend | Wgpu (WebGPU/Vulkan) | latest |
| Thème | Dark mode par défaut | - |

### Contraintes techniques
- **Offline-first** : aucune dépendance cloud. Tous les modèles et données restent en local.
- **GPU cross-platform** : Wgpu backend (Vulkan/Metal/DX12). CPU fallback obligatoire pour machines sans GPU compatible.
- **Communication async** : Rust → React via Tauri events/commands pour le dashboard training temps réel.
- **Sérialisation graphe → Burn** : le graphe ReactFlow (JSON) doit mapper directement sur l'API Burn. Format intermédiaire à définir en priorité.
- **Données CSV** : format `id, unique_id, ds, y`. Multi-séries par fichier.
- **Responsive** : 375px+ minimum (desktop-first mais mobile-friendly).

---

## 3. Spécifications fonctionnelles

### 3.1 🏠 Accueil / Projets

**Description :** Écran d'accueil au lancement de l'app. Liste des projets existants avec CRUD complet.

**Fonctionnalités :**
- Affichage en grille de cards de projets
- Chaque card : nom, date de dernière modification, nombre de datasets/architectures/runs
- Boutons par projet : Ouvrir, Supprimer
- Bouton "Créer un nouveau projet" en header
- Modale de création (champ nom du projet)
- Modale de confirmation de suppression
- Barre de recherche pour filtrer par nom
- Filtres et options de tri (par date, nom)
- Animations hover sur les cards
- Dark theme

**Interactions :**
- Clic sur card → ouvre le projet (navigation vers éditeur/données)
- Clic "Nouveau projet" → modale création
- Clic "Supprimer" → modale confirmation
- Saisie dans la barre de recherche → filtrage temps réel

**Maquette :** `mockups/accueil-projets.html` | [app-mockup.html#accueil-projets](app-mockup.html)

---

### 3.2 🧠 Éditeur de réseau

**Description :** Éditeur visuel de réseaux de neurones, style ReactFlow. Spécifiquement pour les layers du framework Burn — pas un pipeline de données générique.

**Fonctionnalités :**

*Palette de nœuds (sidebar) :*
- **Layers Burn :** Dense, Dropout, Transformer, Conv, LSTM, Activation, BatchNorm
- **Utilitaires :** Input, Output, Reshape, Concat, Split
- Drag & drop depuis la sidebar vers le canvas

*Canvas :*
- Nœuds draggables et repositionnables
- Connexions bézier animées entre nœuds
- Réseau NN pré-chargé à l'ouverture (ex : Input → Dense → Activation → Dropout → Dense → Output)
- Minimap en bas à droite pour navigation

*Inspecteur de propriétés (au clic sur un nœud) :*
| Layer | Paramètres |
|-------|-----------|
| Dense | units, activation |
| Dropout | rate |
| Conv | filters, kernel_size |
| LSTM | units, return_sequences |
| Transformer | heads, d_model |
| BatchNorm | momentum, epsilon |
| Activation | function (ReLU, Sigmoid, Tanh, etc.) |

*Toolbar :*
- Zoom in / out
- Undo / redo
- Train (lancer le training avec l'architecture courante)
- Export (sauvegarder l'architecture JSON)

**Interactions :**
- Drag nœud depuis palette → drop sur canvas = ajout du layer
- Clic sur nœud → inspecteur de propriétés s'ouvre
- Drag entre ports de nœuds → crée une connexion
- Clic sur connexion → suppression
- Mode hybride : blocs haut niveau par défaut, possibilité de "déplier" un bloc pour composants internes

**Maquette :** `mockups/network-editor.html` | [app-mockup.html#editeur-reseau](app-mockup.html)

---

### 3.3 📊 Gestion des données

**Description :** Import, visualisation et sélection des datasets CSV pour le training.

**Fonctionnalités :**

*Vue principale — Liste des datasets :*
- Cards de datasets : nombre de séries, points par série, séries sélectionnées
- Badges d'état : Prêt / Partiel
- Tabs de filtrage : Tous, Prêts, Partiels
- Actions par card : Voir détail, Supprimer
- Bouton import CSV en header

*Import CSV :*
- Modal avec zone drag & drop
- Barre de progression animée
- Validation du format (id, unique_id, ds, y)
- Support multi-séries par fichier

*Vue détail (3 onglets) :*
- **📋 Aperçu** : table scrollable des données brutes
- **📈 Graphique** : visualisation SVG/echarts des séries temporelles (multi-séries, légende couleur)
- **🎯 Séries** : sélection des séries pour le training
  - Checkboxes individuelles par série
  - Stats par série : nb points, date range, min/max, moyenne
  - Boutons tout sélectionner / tout désélectionner

**Format CSV attendu :**
```csv
id,unique_id,ds,y
0,productA,2020-01-01,840.0
1,productA,2020-02-01,630.0
```

**Maquette :** `mockups/gestion-donnees.html` | [app-mockup.html#gestion-donnees](app-mockup.html)

---

### 3.4 ⚡ Training

**Description :** Dashboard de training en temps réel avec courbe de loss, métriques, early stopping et historique des runs.

**Fonctionnalités :**

*Dashboard temps réel :*
- Courbe de loss animée (train loss + validation loss) via echarts
- Métriques par epoch dans table scrollable : loss, MAE, RMSE
- Barre de progression avec estimation du temps restant
- Indicateur visuel early stopping (si loss stagne ou diverge)

*Contrôles :*
- Pause / Resume
- Stop (arrêt manuel)
- Sauvegarder le modèle

*Sidebar hyperparamètres :*
- Learning rate
- Batch size
- Nombre d'epochs
- Optimizer (SGD, Adam, AdamW...)
- Early stopping patience

*Historique :*
- Liste cliquable des runs précédents
- Métriques de chaque run (loss finale, MAE, RMSE)

**Maquette :** `mockups/training-dashboard.html` | [app-mockup.html#training](app-mockup.html)

---

### 3.5 📈 Prédictions

**Description :** Visualisation des prédictions post-training avec comparaison de modèles.

**Fonctionnalités :**

*Graphique principal (echarts) :*
- Timeseries historique (ligne bleue)
- Prédiction (ligne orange)
- Zone de confiance (bande semi-transparente autour de la prédiction)

*Sélecteurs :*
- Dropdown série (unique_id du dataset)
- Dropdown modèle entraîné (runs disponibles)
- Slider horizon de prédiction (nombre de pas futurs à prédire)

*Cards métriques :*
- MAE (Mean Absolute Error)
- RMSE (Root Mean Square Error)
- MAPE (Mean Absolute Percentage Error)

*Actions :*
- Export CSV des prédictions
- Mode comparaison : superposition de 2 modèles sur le même graphique

**Maquette :** `mockups/predictions-dashboard.html` | [app-mockup.html#predictions](app-mockup.html)

---

### 3.6 ⚙️ Paramètres

**Description :** Page de configuration globale de l'application.

**Fonctionnalités :**

| Section | Paramètres |
|---------|-----------|
| **GPU** | Détection auto Wgpu (Vulkan/Metal/DX12), affichage GPU détecté, option CPU fallback |
| **Thème** | Toggle Dark / Light (dark par défaut) |
| **Données** | Chemin import/export par défaut, séparateur CSV |
| **Training** | Valeurs par défaut : learning rate, batch size, epochs, early stopping patience |
| **Export** | Format sauvegarde modèles, chemin par défaut |

*Actions :*
- Bouton "Réinitialiser les paramètres par défaut"
- Toast de confirmation à chaque sauvegarde
- Persistance locale (Tauri store ou JSON)

**Maquette :** `mockups/settings-page.html` | [app-mockup.html#parametres](app-mockup.html)

---

## 4. User Stories

### 4.1 🏠 Accueil / Projets
- **US-P1 :** En tant qu'utilisateur, je veux voir la liste de mes projets au lancement de l'app pour choisir lequel ouvrir.
- **US-P2 :** En tant qu'utilisateur, je veux créer un nouveau projet avec un nom pour organiser mon travail.
- **US-P3 :** En tant qu'utilisateur, je veux supprimer un projet avec confirmation pour éviter les suppressions accidentelles.
- **US-P4 :** En tant qu'utilisateur, je veux rechercher et filtrer mes projets pour retrouver rapidement celui que je cherche.
- **US-P5 :** En tant qu'utilisateur, je veux voir le nombre de datasets, architectures et runs par projet pour avoir une vue d'ensemble.

### 4.2 🧠 Éditeur de réseau
- **US-E1 :** En tant qu'utilisateur, je veux glisser-déposer des layers depuis une palette vers un canvas pour construire mon architecture visuellement.
- **US-E2 :** En tant qu'utilisateur, je veux connecter des nœuds entre eux via des liens bézier pour définir le flux du réseau.
- **US-E3 :** En tant qu'utilisateur, je veux cliquer sur un nœud pour configurer ses paramètres (units, rate, activation...) dans un inspecteur.
- **US-E4 :** En tant qu'utilisateur, je veux undo/redo mes actions pour corriger mes erreurs.
- **US-E5 :** En tant qu'utilisateur, je veux exporter mon architecture en JSON pour la réutiliser ou la partager.
- **US-E6 :** En tant qu'utilisateur, je veux lancer le training directement depuis l'éditeur pour tester mon architecture.
- **US-E7 :** En tant qu'utilisateur, je veux voir une minimap pour naviguer dans des architectures complexes.

### 4.3 📊 Gestion des données
- **US-D1 :** En tant qu'utilisateur, je veux importer un fichier CSV par drag & drop pour charger mes données de timeseries.
- **US-D2 :** En tant qu'utilisateur, je veux voir un aperçu en table de mes données brutes pour vérifier l'import.
- **US-D3 :** En tant qu'utilisateur, je veux visualiser mes séries temporelles sur un graphique pour repérer les patterns.
- **US-D4 :** En tant qu'utilisateur, je veux sélectionner quelles séries (unique_id) inclure dans le training pour cibler mon entraînement.
- **US-D5 :** En tant qu'utilisateur, je veux voir les stats de chaque série (nb points, date range, min/max, moyenne) pour comprendre mes données.
- **US-D6 :** En tant qu'utilisateur, je veux supprimer un dataset du projet pour faire du ménage.

### 4.4 ⚡ Training
- **US-T1 :** En tant qu'utilisateur, je veux voir la courbe de loss en temps réel pendant le training pour suivre la convergence.
- **US-T2 :** En tant qu'utilisateur, je veux voir les métriques par epoch (loss, MAE, RMSE) pour évaluer la qualité.
- **US-T3 :** En tant qu'utilisateur, je veux une barre de progression avec estimation du temps restant pour planifier mon temps.
- **US-T4 :** En tant qu'utilisateur, je veux que le training s'arrête automatiquement (early stopping) si la loss stagne ou diverge.
- **US-T5 :** En tant qu'utilisateur, je veux pouvoir mettre en pause, reprendre et arrêter le training manuellement.
- **US-T6 :** En tant qu'utilisateur, je veux configurer les hyperparamètres (learning rate, batch size, epochs, optimizer) avant de lancer.
- **US-T7 :** En tant qu'utilisateur, je veux voir l'historique de mes runs précédents pour comparer les résultats.
- **US-T8 :** En tant qu'utilisateur, je veux sauvegarder un modèle entraîné pour l'utiliser ensuite pour des prédictions.

### 4.5 📈 Prédictions
- **US-R1 :** En tant qu'utilisateur, je veux voir un graphique avec la timeseries historique, la prédiction et la zone de confiance pour évaluer mon modèle.
- **US-R2 :** En tant qu'utilisateur, je veux sélectionner quelle série et quel modèle utiliser pour la prédiction.
- **US-R3 :** En tant qu'utilisateur, je veux ajuster l'horizon de prédiction via un slider pour explorer différentes profondeurs.
- **US-R4 :** En tant qu'utilisateur, je veux voir les métriques MAE, RMSE, MAPE pour évaluer quantitativement mon modèle.
- **US-R5 :** En tant qu'utilisateur, je veux exporter les prédictions en CSV pour les utiliser ailleurs.
- **US-R6 :** En tant qu'utilisateur, je veux comparer 2 modèles sur le même graphique pour choisir le meilleur.

### 4.6 ⚙️ Paramètres
- **US-S1 :** En tant qu'utilisateur, je veux voir quel GPU est détecté et basculer en CPU si nécessaire.
- **US-S2 :** En tant qu'utilisateur, je veux switcher entre dark et light theme selon ma préférence.
- **US-S3 :** En tant qu'utilisateur, je veux configurer les chemins et séparateurs par défaut pour les imports/exports.
- **US-S4 :** En tant qu'utilisateur, je veux définir des valeurs par défaut pour les hyperparamètres de training.
- **US-S5 :** En tant qu'utilisateur, je veux réinitialiser tous les paramètres à leurs valeurs par défaut.

---

## 5. Epic Breakdown

Les epics sont ordonnés par dépendance (fondations en premier). Chaque epic correspond à une section du brainstorm.

### Epic 1 — Fondations & Accueil (🏠 Accueil / Projets)
**Source :** Section 🏠 Accueil / Projets
**User stories :** US-P1, US-P2, US-P3, US-P4, US-P5
**Complexité :** M
**Dépendances :** Aucune (fondation)

**Scope :**
- Setup projet Tauri v2 + React + TypeScript
- Routing (react-router ou équivalent)
- Système de projets (CRUD) avec persistance locale (Tauri fs/store)
- Écran d'accueil avec cards, recherche, filtres
- Modales création/suppression
- Dark theme global (CSS variables ou Tailwind)
- Structure de données projet (datasets, architectures, runs)

**Inclut les fondations partagées :**
- Initialisation Tauri v2
- Configuration React + TypeScript + build
- Système de thème Dark/Light
- Layout principal + navigation entre sections
- Système de persistance locale (Tauri store pour config, fs pour projets)

---

### Epic 2 — Éditeur de réseau (🧠 Éditeur de réseau)
**Source :** Section 🧠 Éditeur de réseau
**User stories :** US-E1, US-E2, US-E3, US-E4, US-E5, US-E7
**Complexité :** L
**Dépendances :** Epic 1 (routing, thème, structure projet)

**Scope :**
- Intégration ReactFlow dans le frontend
- Palette de nœuds (sidebar) avec drag & drop
- Nœuds custom pour chaque layer Burn (Dense, Dropout, Conv, LSTM, Transformer, Activation, BatchNorm) + utilitaires (Input, Output, Reshape, Concat, Split)
- Inspecteur de propriétés contextuel
- Connexions bézier entre nœuds
- Toolbar (zoom, undo/redo, export)
- Minimap
- Sérialisation du graphe en JSON
- Sauvegarde/chargement d'architectures dans un projet

**Point critique :** Définir le format JSON du graphe qui mappe sur l'API Burn.

---

### Epic 3 — Gestion des données (📊 Gestion des données)
**Source :** Section 📊 Gestion des données
**User stories :** US-D1, US-D2, US-D3, US-D4, US-D5, US-D6
**Complexité :** M
**Dépendances :** Epic 1 (routing, thème, structure projet)

**Scope :**
- Import CSV avec drag & drop (frontend) + parsing Rust (backend via Tauri command)
- Validation du format (id, unique_id, ds, y)
- Liste des datasets avec cards et badges
- Vue détail 3 onglets : Aperçu (table), Graphique (echarts timeseries), Séries (sélection)
- Stats par série (nb points, date range, min/max, moyenne)
- Sélection des séries pour training (checkboxes, tout sélectionner/désélectionner)
- Suppression de datasets

**Note :** Peut être développé en parallèle de l'Epic 2 (pas de dépendance directe).

---

### Epic 4 — Training (⚡ Training)
**Source :** Section ⚡ Training
**User stories :** US-T1, US-T2, US-T3, US-T4, US-T5, US-T6, US-T7, US-T8, US-E6
**Complexité :** L
**Dépendances :** Epic 2 (architecture réseau) + Epic 3 (données sélectionnées)

**Scope :**
- Intégration Burn backend : construction du modèle à partir du JSON d'architecture
- Backend Wgpu : détection GPU, fallback CPU
- Boucle de training avec métriques par epoch
- Communication async Rust → React via Tauri events (loss, métriques, progression)
- Dashboard frontend : courbe de loss echarts, table métriques, barre progression
- Early stopping (détection stagnation/divergence)
- Contrôles : pause/resume, stop, sauvegarder le modèle
- Configuration hyperparamètres (learning rate, batch size, epochs, optimizer)
- Historique des runs avec persistance
- Bouton "Train" dans l'éditeur (US-E6) → navigation vers Training

**Point critique :** Sérialisation JSON → modèle Burn compilable. Communication temps réel Rust → React.

---

### Epic 5 — Prédictions (📈 Prédictions)
**Source :** Section 📈 Prédictions
**User stories :** US-R1, US-R2, US-R3, US-R4, US-R5, US-R6
**Complexité :** M
**Dépendances :** Epic 4 (modèle entraîné)

**Scope :**
- Chargement d'un modèle entraîné (run sélectionné)
- Inférence Burn : prédiction sur N pas futurs
- Calcul de la zone de confiance
- Graphique echarts : historique + prédiction + zone de confiance
- Sélecteurs : série, modèle/run, horizon de prédiction
- Métriques : MAE, RMSE, MAPE
- Export CSV des prédictions
- Mode comparaison : 2 modèles superposés

---

### Epic 6 — Paramètres (⚙️ Paramètres)
**Source :** Section ⚙️ Paramètres
**User stories :** US-S1, US-S2, US-S3, US-S4, US-S5
**Complexité :** S
**Dépendances :** Epic 1 (thème, persistance) + Epic 4 (valeurs par défaut training)

**Scope :**
- Détection GPU Wgpu + affichage info
- Toggle thème Dark/Light avec persistance
- Configuration chemins import/export
- Configuration séparateur CSV
- Valeurs par défaut training (learning rate, batch size, epochs, patience)
- Format et chemin export modèles
- Bouton réinitialiser
- Toast de confirmation

**Note :** Peut être développé progressivement — la section GPU est utile dès l'Epic 4, le reste est non-bloquant.

---

## 6. Diagramme de dépendances

```
Epic 1 (Fondations & Accueil)
├── Epic 2 (Éditeur de réseau)
│   └── Epic 4 (Training) ──→ Epic 5 (Prédictions)
├── Epic 3 (Gestion des données)
│   └── Epic 4 (Training)
└── Epic 6 (Paramètres) ← aussi dépend de Epic 4 pour defaults training
```

**Parallélisable :** Epic 2 et Epic 3 peuvent être développés en parallèle après Epic 1.

---

## 7. Exigences non-fonctionnelles

### Performance
- Le parsing CSV de fichiers de 100K+ lignes ne doit pas bloquer l'UI (traitement côté Rust async)
- Le dashboard training doit se mettre à jour à chaque epoch sans lag visible
- L'éditeur ReactFlow doit rester fluide avec 50+ nœuds

### Accessibilité
- Contraste suffisant pour le dark theme (WCAG AA minimum)
- Navigation clavier dans les modales et formulaires
- Labels sur les contrôles interactifs

### Responsive
- Layout fonctionnel de 375px à 4K
- Desktop-first : les écrans sont optimisés pour 1280px+
- Mobile : sidebar/inspecteur en overlay, pas de perte de fonctionnalité

### Sécurité
- Pas de données envoyées vers l'extérieur (app 100% locale)
- Validation du contenu CSV avant parsing (protection contre injection)

### Persistence
- Projets sauvegardés sur le filesystem local via Tauri fs API
- Paramètres utilisateur via Tauri store (key-value persistant)
- Modèles entraînés sauvegardés dans le dossier projet

---

## 8. Maquettes visuelles

| Section | Fichier mockup | Navigation |
|---------|---------------|------------|
| 🏠 Accueil / Projets | `mockups/accueil-projets.html` | [app-mockup.html](app-mockup.html) |
| 🧠 Éditeur de réseau | `mockups/network-editor.html` | [app-mockup.html](app-mockup.html) |
| 📊 Gestion des données | `mockups/gestion-donnees.html` | [app-mockup.html](app-mockup.html) |
| ⚡ Training | `mockups/training-dashboard.html` | [app-mockup.html](app-mockup.html) |
| 📈 Prédictions | `mockups/predictions-dashboard.html` | [app-mockup.html](app-mockup.html) |
| ⚙️ Paramètres | `mockups/settings-page.html` | [app-mockup.html](app-mockup.html) |

> **Note :** Les mockup HTML ont été générés par Storm pendant le brainstorm mais n'ont pas pu être récupérés lors de la compilation (API Discord indisponible). Ils sont référencés ci-dessus pour traçabilité.
