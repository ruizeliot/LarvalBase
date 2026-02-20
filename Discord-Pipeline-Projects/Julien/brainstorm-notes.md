# NeuralForge — Brainstorm Notes (Compilation complète)

> **Projet :** NeuralForge — Éditeur visuel de réseaux de neurones pour forecasting de timeseries
> **Utilisateur :** Julien Lesbegueries
> **Date :** 2026-02-20
> **Profil :** Technique (niveau 3)
> **Type :** Nouveau projet (Path A)
> **Langue :** Français

---

## 1. Concept & Positionnement

### Vision
Application desktop pour construire **visuellement** des architectures de réseaux de neurones spécialisés en **forecasting de timeseries**. L'utilisateur assemble des blocs (layers) dans un éditeur node-based, entraîne le modèle sur des données CSV, puis visualise les prédictions avec zones de confiance.

### Stack technique
| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Shell** | Tauri v2 | App desktop cross-platform, bundle léger |
| **Frontend** | React + TypeScript | Écosystème mature, reactflow disponible |
| **Éditeur** | ReactFlow | Lib node-based editor standard, style clean |
| **Charts** | echarts + echarts-for-react | Performant pour timeseries, zones de confiance |
| **Backend** | Rust | Performance native, intégration Tauri |
| **ML Framework** | Burn | Framework ML natif Rust, API layer-based |
| **GPU Backend** | Wgpu (WebGPU/Vulkan) | Cross-platform sans CUDA, zéro friction install |
| **Thème** | Dark mode | Choix de Julien — interface technique ML |

### Pitch original de Julien
> "Je veux bâtir une application en Rust avec Tauri et un frontend en React. Le but est d'utiliser la librairie Burn côté backend pour bâtir des modèles de réseaux de neurones. Côté frontend je veux utiliser la librairie reactflow pour bâtir un éditeur de réseau de neurones (Layer, Dropout, Transformer, etc.) dont la configuration sera envoyée côté backend pour construire un modèle que je pourrai utiliser ensuite pour s'entraîner sur des données en entrée (des CSV représentant des timeseries)."

---

## 2. Clarifications (Phase 1 — Stratégie Direct/Q&A)

### Q1 : Granularité de l'éditeur
**Question :** Quel niveau de granularité pour les blocs de l'éditeur ?

**Options considérées :**
- **A) Blocs haut niveau** — chaque nœud = un layer complet (Dense, Conv1D, LSTM…) avec paramètres dans un panneau latéral. Simple, rapide. *Recommandé par Manager pour itération rapide sur architectures timeseries.*
- **B) Blocs atomiques** — activation, normalisation, reshape sont des nœuds séparés. Maximum de flexibilité mais UX complexe.
- **C) Hybride** — blocs haut niveau par défaut, possibilité de "déplier" pour éditer les composants internes.

**Décision : C (Hybride)** — Julien : "dans l'idée on commence avec des blocs de haut niveau, mais un menu ou une boîte de dialogue en cliquant dessus permet de configurer le layer et ses paramètres". Combine rapidité quotidienne et flexibilité quand nécessaire.

### Q2 : Backend ML (Burn backend)
**Question :** Quel backend Burn viser en priorité ?

**Options considérées :**
- **A) Wgpu** — GPU via WebGPU/Vulkan, cross-platform natif, pas de CUDA requis. *Recommandé par Manager pour zéro friction.*
- **B) Tch (LibTorch)** — CUDA natif, perfs max, mais ~2GB de dépendances + CUDA requis. Rejeté : friction d'installation trop élevée.
- **C) NdArray** — CPU only, zéro dépendance. Rejeté : trop lent pour du training.
- **D) Configurable** — multi-backend. Rejeté : complexité de build excessive pour le MVP.

**Décision : A (Wgpu)** — Cross-platform sans friction d'installation. Burn le pousse comme backend principal.

### Q3 : Gestion des séries multiples
**Question :** Comment gérer les séries multiples dans un CSV ?

**Options considérées :**
- **A) Un modèle par série** — sélection d'un unique_id, modèle dédié. Rejeté comme trop limitant.
- **B) Un modèle global** — toutes les séries ensemble. Rejeté comme trop rigide.
- **C) Les deux** — l'utilisateur choisit. *Recommandé par Manager.*

**Décision : Sélection flexible** — Julien : "un modèle peut être entraîné sur une ou un sous-ensemble des multi-séries". L'utilisateur sélectionne les séries à inclure (une, plusieurs, ou toutes).

### Q4 : Feedback pendant le training
**Question :** Quel niveau de visibilité sur le training en cours ?

**Options considérées :**
- **A) Dashboard live** — courbe de loss temps réel, métriques par epoch, estimation temps restant.
- **B) Barre de progression simple** — epoch X/N + loss. Rejeté : insuffisant pour des trainings de plusieurs minutes.
- **C) Dashboard + early stopping auto** — comme A, mais arrêt automatique si loss stagne/diverge. *Recommandé par Manager.*

**Décision : C (Dashboard + early stopping)** — Julien : "oui très bien le C". Dashboard live quasi gratuit avec Burn (métriques par epoch exposées), early stopping évite gaspillage.

### Q5 : Organisation des projets
**Question :** Comment organiser le travail de l'utilisateur ?

**Options considérées :**
- **A) Projet = 1 dataset + N architectures** — focus comparaison de modèles. Rejeté comme trop rigide.
- **B) Projet = 1 architecture + N datasets** — focus généralisation. Rejeté comme trop spécifique.
- **C) Projet libre** — N datasets + N architectures + N runs, combinaison flexible. *Recommandé par Manager.*

**Décision : C (Projet libre)** — Julien : "C projet libre". Outil de ML expérimental nécessite flexibilité sans contrainte de structure.

### Recherche de références
**Décision : Passée (B)** — Julien a choisi de ne pas faire de recherche de références et d'aller directement aux sections.

---

## 3. Découpage en sections (Phase 2A)

**6 sections validées** par Julien sans modification. Chaque section = un écran principal de l'app :

1. 🏠 **Accueil / Projets** — liste des projets, création, ouverture, suppression
2. 🧠 **Éditeur de réseau** — canvas ReactFlow, palette de blocs Burn, configuration des layers
3. 📊 **Gestion des données** — import CSV, preview, sélection des séries pour training
4. ⚡ **Training** — lancement, dashboard live, early stopping, historique runs
5. 📈 **Prédictions** — graphique echarts, historique + prédiction + zone de confiance
6. ⚙️ **Paramètres** — config GPU, thème, données, training, export

**Mode d'exploration :** Full (A) pour les 3 premières sections, puis Quick (B) pour les 3 dernières (changement demandé par Julien après 3 sections).

---

## 4. Sections — Décisions détaillées

### 4.1 🏠 Accueil / Projets

**Statut :** ✅ Validée — Mode Fast (C), V1 approuvée sans itération
**Maquette :** `mockups/accueil-projets.html`

**Mode de travail :** Julien a choisi C (Rapide) — Storm génère directement, Julien valide.

**Spécifications validées :**
- **Cards de projets** affichant : nom, date de dernière modification, nombre de datasets/architectures/runs
- **Boutons par projet :** Ouvrir, Supprimer
- **Bouton créer nouveau projet** en header
- **Modale de création** de projet (champ nom)
- **Modale de confirmation de suppression** (protection contre suppression accidentelle)
- **Barre de recherche** pour filtrer les projets
- **Filtres et tri** (par date, nom, etc.)
- **Animations hover** sur les cards
- **Dark theme** cohérent avec l'interface technique ML
- **Responsive** 375px+

**Validation :** Julien : "c'est très bien" — aucune itération nécessaire.

**Feasibility :** Aucun problème. CRUD classique (liste, création, suppression de projets). Pas de dépendances externes, pas d'API tierce.

---

### 4.2 🧠 Éditeur de réseau

**Statut :** ✅ Validée — V2 validée (A) après 1 itération
**Maquette :** `mockups/network-editor.html`

**Mode de travail :** Fast (C) — "utilise reactflow"

**Itérations :**
1. **V1 — Rejetée (B)** : Storm a créé un éditeur générique (pipeline données → IA → API → sortie). Feedback de Julien : "pas besoin d'intégration, on est sur un nn simple composé de noeuds et layers connus (en tout cas ceux proposés par Burn, dropout, dense, transformer, etc.)"
2. **V2 — Validée (A)** : Palette Burn correcte, canvas réseau NN réaliste, inspecteur de propriétés.

**Clarification intermédiaire :** Quels types de nœuds dans la palette ?
- **A) Layers Burn classiques uniquement** — Dense, Dropout, Transformer, Conv, LSTM, Activation, BatchNorm
- **B) Layers Burn + utilitaires** (Input, Output, Reshape, Concat, Split) ← **Choisi par Julien**
- **C) Autre liste**

**Spécifications validées :**

**Palette de nœuds (sidebar) :**
- **Layers Burn :** Dense, Dropout, Transformer, Conv, LSTM, Activation, BatchNorm
- **Utilitaires :** Input, Output, Reshape, Concat, Split
- Drag & drop depuis sidebar vers canvas

**Canvas :**
- Réseau NN réaliste pré-chargé (Input → Dense → Activation → Dropout → Dense → Output)
- Connexions bézier animées entre nœuds
- Nœuds draggables et repositionnables

**Inspecteur de propriétés (au clic sur un nœud) :**
- Dense → units, activation
- Dropout → rate
- Conv → filters, kernel_size
- LSTM → units, return_sequences
- Transformer → heads, d_model
- BatchNorm → momentum, epsilon

**Toolbar :**
- Zoom in/out
- Undo/redo
- Train (lancer le training)
- Export (sauvegarder l'architecture)

**Autres :**
- Minimap en bas à droite
- Responsive mobile (375px+) — sidebar/inspecteur en overlay sur mobile
- Dark theme cohérent

**Décision clé :** Pas d'intégration externe. Focus exclusif sur les layers/nœuds proposés par Burn. Réseau de neurones simple, pas un pipeline de données générique.

**Feasibility :** Réaliste. Burn expose bien tous les layers listés. Pattern UI classique avec ReactFlow (lib mature). **Point d'attention critique :** la sérialisation du graphe visuel → config Burn compilable sera le vrai défi technique. Le format de sortie (JSON du graphe) doit mapper directement sur l'API Burn.

---

### 4.3 📊 Gestion des données

**Statut :** ✅ Validée — Mode Fast (C), V1 approuvée sans itération
**Maquette :** `mockups/gestion-donnees.html`

**Spécifications validées :**

**Vue principale — Liste des datasets :**
- Cards de datasets affichant : nombre de séries, points par série, séries sélectionnées
- Badges d'état : Prêt / Partiel
- Tabs de filtrage : Tous, Prêts, Partiels
- Actions par card : Voir détail, Supprimer
- Bouton import CSV en header

**Import CSV :**
- Modal avec zone drag & drop
- Barre de progression animée pendant l'import
- Format attendu : `id, unique_id, ds, y` (multi-séries par fichier)

**Vue détail (3 onglets) :**
- 📋 **Aperçu** : table scrollable des données brutes
- 📈 **Graphique** : visualisation SVG des séries temporelles (multi-séries, légende par couleur)
- 🎯 **Séries** : sélection des séries pour le training
  - Checkboxes par série
  - Stats par série : nb points, date range, min/max, moyenne
  - Tout sélectionner / tout désélectionner

**Design :** Dark theme cohérent, responsive 375px+, animations hover, transitions CSS.

**Validation :** Julien a approuvé directement en mode Fast — aucune itération nécessaire.

**Feasibility :** RAS. Écran CRUD/visualisation classique. Parsing CSV côté Rust est trivial.

---

### 4.4 ⚡ Training

**Statut :** ✅ Validée — Mode Quick (batch), pas de review individuelle
**Maquette :** `mockups/training-dashboard.html`

**Spécifications validées :**

**Dashboard training temps réel :**
- **Courbe de loss animée** : train loss + validation loss (graphique echarts)
- **Métriques par epoch** : loss, MAE, RMSE dans table scrollable
- **Barre de progression** avec estimation du temps restant
- **Early stopping** : indicateur visuel si le training s'arrête automatiquement (loss stagne/diverge)

**Contrôles :**
- Pause / Resume
- Stop (arrêt manuel)
- Sauvegarder le modèle

**Sidebar hyperparamètres :**
- Learning rate
- Batch size
- Nombre d'epochs
- Optimizer

**Historique des runs :**
- Liste cliquable des runs précédents
- Comparaison possible entre runs

**Design :** Dark theme cohérent, palette accent violet, responsive 375px+.

**Feasibility :** Communication async Rust → React via Tauri events/commands. Pattern Tauri classique mais à architecturer dès le début. Burn expose les métriques par epoch nativement.

---

### 4.5 📈 Prédictions

**Statut :** ✅ Validée — Mode Quick (batch), pas de review individuelle
**Maquette :** `mockups/predictions-dashboard.html`

**Spécifications validées :**

**Graphique principal (echarts) :**
- Timeseries historique (ligne bleue)
- Prédiction (ligne orange)
- Zone de confiance (bande semi-transparente)

**Sélecteurs :**
- Dropdown série (unique_id du dataset)
- Dropdown modèle entraîné (runs disponibles)
- Slider horizon de prédiction (nombre de pas futurs)

**Cards métriques :**
- MAE (Mean Absolute Error)
- RMSE (Root Mean Square Error)
- MAPE (Mean Absolute Percentage Error)

**Actions :**
- Export CSV des prédictions
- Comparaison : superposition de 2 modèles sur le même graphique

**Design :** Dark theme cohérent, palette accent violet, responsive 375px+.

**Feasibility :** Superposer 2 runs sur un même graphique echarts est faisable mais nécessite de stocker les prédictions de chaque run. Prévoir un format de stockage des résultats d'inférence.

---

### 4.6 ⚙️ Paramètres

**Statut :** ✅ Validée — Mode Quick (batch), pas de review individuelle
**Maquette :** `mockups/settings-page.html`

**Spécifications validées :**

**Section GPU :**
- Détection automatique du backend Wgpu (Vulkan / Metal / DX12)
- Affichage du GPU détecté
- Option CPU fallback (essentiel : certains GPU intégrés ne supporteront pas les gros modèles)

**Section Thème :**
- Toggle Dark / Light (dark par défaut)

**Section Données :**
- Chemin par défaut d'import/export
- Séparateur CSV (configurable)

**Section Training :**
- Valeurs par défaut : learning rate, batch size, epochs, early stopping patience

**Section Export :**
- Format de sauvegarde des modèles
- Chemin par défaut

**Actions :**
- Bouton "Réinitialiser les paramètres par défaut"
- Toast de confirmation à chaque sauvegarde

**Design :** Dark theme cohérent, palette accent violet, responsive 375px+.

**Feasibility :** RAS. Configuration persistée en local (Tauri store ou fichier JSON).

---

## 5. Analyses de faisabilité (Cross-section)

### Pipeline critique
**Éditeur → Training → Prédictions** : le pipeline principal est construire l'architecture → entraîner → visualiser. La **sérialisation du graphe ReactFlow → config Burn** est le point d'intégration le plus complexe et doit être définie en priorité.

### GPU / Wgpu
Burn + Wgpu fonctionne cross-platform sans CUDA, mais les performances varient selon le backend (Vulkan > DX12 > Metal). Le CPU fallback dans Paramètres est **essentiel**. Prévoir un avertissement mémoire GPU.

### Communication async Rust ↔ React
Le training temps réel nécessite une communication async via Tauri events/commands. Pattern classique mais à architecturer dès le début.

### Stockage des résultats
La comparaison de modèles dans Prédictions nécessite un format de stockage des résultats d'inférence par run.

---

## 6. Données d'entrée — Format CSV

```csv
id,unique_id,ds,y
0,productA,2020-01-01,840.0
1,productA,2020-02-01,630.0
2,productA,2020-03-01,666.0
...
```

- **id** : index de la ligne
- **unique_id** : identifiant de la série (peut y avoir plusieurs séries par fichier)
- **ds** : date (timestamp)
- **y** : valeur numérique

---

## 7. Questions ouvertes / Décisions différées

- **Format de sérialisation du graphe** : JSON du graphe ReactFlow → config Burn. Le format exact reste à définir lors de l'implémentation.
- **Stockage des résultats d'inférence** : format à définir pour supporter la comparaison entre runs.
- **Avertissement mémoire GPU** : seuil et message à définir.
- **Sections Training, Prédictions, Paramètres** : validées en mode Quick sans review individuelle par Julien (batch approval). Les specs sont basées sur les descriptions de Manager, pas sur un feedback détaillé de Julien section par section.
