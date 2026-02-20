# PRD — ScholarScope (fred2)

**Version :** 1.0
**Date :** 20 février 2026
**Auteur :** Frederick Benaben (concept) + Pipeline Office (compilation)

---

## 1. Vision produit

### Concept
**ScholarScope** est un dashboard web interactif permettant d'explorer le profil académique d'un chercheur. L'utilisateur entre un nom ou un identifiant, et obtient une vue synthétique et visuelle couvrant publications, citations, thématiques, évolution chronologique, collaborations et établissements.

### Positionnement
ScholarScope se positionne comme le **premier dashboard chercheur interactif gratuit** combinant :
- Des visualisations interconnectées (cross-filtering de type BI)
- Un accès ouvert par défaut, enrichi par des données institutionnelles optionnelles
- Une navigation de profil en profil via le réseau de co-auteurs

### Audience cible
- **Primaire :** Chercheurs académiques souhaitant explorer leur propre profil ou celui de collaborateurs potentiels
- **Secondaire :** Évaluateurs, comités de recrutement, journalistes scientifiques, étudiants en recherche

### Niche gap
Aucun outil gratuit ne propose un dashboard interactif lié centré sur un chercheur individuel. Les outils existants sont soit gratuits mais basiques (Google Scholar, ORCID), soit riches mais payants et institutionnels (Dimensions AI, Scopus).

---

## 2. Contraintes techniques

### Plateforme
- **Application web** (responsive, 375px+ viewport minimum)
- Fonctionne sur navigateurs modernes (Chrome, Firefox, Safari, Edge)

### Sources de données — Mode dégradé gracieux
| Niveau | APIs | Accès | Données |
|--------|------|-------|---------|
| **Base (anonyme)** | OpenAlex, Semantic Scholar, CrossRef | Gratuit, sans clé | Publications, citations, co-auteurs, abstracts, keywords |
| **Premium (compte)** | + Scopus, Web of Science | Clé institutionnelle | Impact factor, h-index normalisé, subject areas détaillées, métriques avancées |

### Authentification
- **Mode anonyme par défaut** — pas de compte requis, APIs ouvertes
- **Compte optionnel** — pour persister les clés API institutionnelles (Scopus, WoS)
- Type d'auth à définir (OAuth institutionnel ou email/password)
- Stockage sécurisé des clés API côté serveur

### APIs et services tiers
| Service | Usage | Obligatoire |
|---------|-------|-------------|
| OpenAlex | Publications, auteurs, institutions | Oui |
| Semantic Scholar | Citations, graphe d'influence, abstracts | Oui |
| CrossRef | DOI, métadonnées publications | Oui |
| Scopus API | Métriques avancées, subject areas | Non (premium) |
| Web of Science API | Impact factor, citations normalisées | Non (premium) |
| Mistral API | Analyse IA des jalons de carrière | Non (clé utilisateur) |

### Performance
- Système de cache/queue pour la première charge d'un profil (200+ publications possible)
- Algorithme de layout force-directed côté client pour le réseau de co-auteurs (50+ nœuds)
- NLP/Topic modeling : service backend (Python + BERTopic) ou API externe

### Hébergement
- Nécessite un serveur Node.js (le PDF export requiert Puppeteer/headless browser)
- Pas compatible avec un hébergement purement statique (Vercel, Netlify)

---

## 3. Spécifications fonctionnelles par section

### 3.1 🔍 Recherche (Page d'accueil)

**Description :** Point d'entrée de l'application. Barre de recherche centrale pour identifier un chercheur.

**Comportements :**
- Barre de recherche avec autocomplétion par nom
- Désambiguïsation par institution et domaine de recherche quand plusieurs résultats
- Détection automatique du format d'entrée :
  - Texte libre → recherche par nom
  - Format `0000-xxxx-xxxx-xxxx` → ORCID
  - Nombre → Scopus Author ID
  - URL contenant `scholar.google` → Google Scholar profile
- Raccourcis d'exemple sous le champ de saisie (pattern Google/Perplexity) — pré-remplissent le champ au clic
- Design épuré et accueillant

**Mockup :** `mockups/recherche.html` · [app-mockup.html#recherche](app-mockup.html)

---

### 3.2 📊 Vue d'ensemble (Dashboard principal)

**Description :** Vue synthétique du profil chercheur avec métriques clés et mini-visualisations.

**Comportements :**
- **Header métriques :** h-index, citations totales, nombre de publications, années actives
- **Résumé profil :** nom, institution actuelle, domaines de recherche
- **Mini-visualisations :**
  - Sparkline citations/année avec tooltip au survol (nombre exact de citations par année)
  - Top thématiques en tags
  - Dernières publications (liste condensée)
- **Sélecteur de période :** deux menus déroulants "De / à" pour filtrer la plage d'années — le graphique se re-rend dynamiquement
- Navigation vers les autres sections (cross-filtrée)
- Bandeau ScholarScope avec navigation globale

**Mockup :** `mockups/vue-densemble.html` · [app-mockup.html#vue-densemble](app-mockup.html)

---

### 3.3 📚 Publications

**Description :** Liste complète et filtrable des publications du chercheur.

**Comportements :**
- **Filtres multiples :** année, thématique, type de publication (conférence, journal, chapitre…), journal/venue
- **Tri :** par nombre de citations ou par date
- **Détail expandable** par article : abstract, liste des co-auteurs, nombre de citations, DOI
- **Badges visuels :** open access (vert), nombre de citations (badge numérique)
- **Pagination** (ou scroll infini)
- Cross-filtrée avec les autres vues (sélectionner une thématique dans Cartographie filtre cette liste)

**Mockup :** `mockups/publications.html` · [app-mockup.html#publications](app-mockup.html)

---

### 3.4 🗺️ Cartographie thématique

**Description :** Visualisation des clusters thématiques du chercheur, avec drill-down et analyse de citations.

**Comportements :**
- **Bubble chart principal :** chaque bulle = un cluster thématique, taille = poids du thème (nombre de publications)
- **Drill-down sous-thèmes :** cliquer sur un cluster ouvre les sous-topics (ex: "Interopérabilité" → Standards, Protocoles, Middleware…)
- **Citations par cluster :** volet montrant la répartition des citations par thème pour comparaison quantitative
- **Évolution thématique dans le temps :** graphique stacked bars montrant comment les sujets migrent au fil des années
- **Cross-filtering :** cliquer sur un thème filtre les publications et le réseau de co-auteurs
- Extraction hybride : keywords existants + NLP/topic modeling (BERTopic)
- Inspiré du landscape visualization de Dimensions AI
- Bandeau ScholarScope homogène (logo gradient, liens pill-style alignés à droite, fond `#1a2332`, pas d'avatar)

**Mockup :** `mockups/cartographie-thematique.html` · [app-mockup.html#cartographie](app-mockup.html)

---

### 3.5 📈 Timeline

**Description :** Frise chronologique interactive combinant publications, citations, affiliations institutionnelles et jalons de carrière.

**Comportements :**
- **Graphique principal :**
  - Barres = publications par année
  - Courbe SVG superposée = citations par année (axe Y secondaire, couleur jaune)
- **Sélecteur de période :**
  - Boutons rapides : 5 ans / 10 ans / Tout
  - Double range slider pour fenêtre temporelle libre
  - Le graphique, les jalons ET la timeline d'affiliations se mettent à jour dynamiquement
- **Filtres par thématique** (Interopérabilité, Gestion de crises, Supply chain…)
- **Timeline des affiliations institutionnelles :**
  - Bande horizontale segmentée par couleur selon le statut (Doctorat → MCF → Professeur)
  - Deux lignes par segment : nom de l'établissement (bold) + rôle/statut (sous-titre)
  - Dates de transition visibles aux jonctions
  - Overlay hachuré pour séjours temporaires (ex: visiting researcher)
  - Synchronisée avec le sélecteur de période
  - Tooltips enrichis au survol : 🏛️ Établissement, 📋 Rôle, 📅 Période, 📝 Articles de conférence, 📰 Articles de journaux, 📈 Citations cumulées
- **Jalons de carrière :**
  - Générés automatiquement par IA (Mistral API, clé fournie par l'utilisateur)
  - Badge « Généré par IA (Mistral) » animé
  - Faits marquants : pics de production, publication la plus citée, pivot thématique, nouveau domaine
  - Fallback si pas de clé Mistral : jalons manuels ou désactivation gracieuse
- **Cross-filtering** avec publications et cartographie thématique

**Mockup :** `mockups/timeline.html` · [app-mockup.html#timeline](app-mockup.html)

---

### 3.6 👥 Réseau de co-auteurs

**Description :** Graphe interactif des co-auteurs directs avec sémantique riche sur les liens et navigation de profil en profil.

**Comportements :**
- **Graphe interactif (canvas)** niveau 1 des co-auteurs directs
- **Nœuds :** dimensionnés par nombre de co-publications avec le chercheur central
- **Liens colorés par thématique :**
  - 🔵 Crisis management, 🟣 Interoperability, 🟢 Supply chain, 🟠 Digital twins (exemples)
  - Épaisseur proportionnelle au nombre de co-publications sur cette thématique
  - Multi-thèmes sur un même lien = lignes parallèles décalées
- **Cross-links entre co-auteurs :** liens fins en pointillés = ces deux co-auteurs publient ensemble **indépendamment** du chercheur central
- **Liens radiaux :** tracés centre-à-centre de chaque nœud (rendu canvas)
- **Tooltips au survol :**
  - Nœud : nom complet, affiliation, détail par thématique, total co-publications
  - Lien : thématique, auteurs connectés, nb publications
  - Dimming des nœuds/liens non-concernés au survol
- **Filtres de profondeur :**
  - Slider « co-publications min » (masque collaborateurs sous le seuil)
  - Slider « co-auteurs max affichés » (top N)
  - Mise à jour en temps réel du graphe
- **Légende** dans la barre de contrôles au-dessus du graphe (pas de chevauchement)
- **Navigation :** cliquer sur un co-auteur → ouvre son dashboard complet
- **Collaboration map géographique** (pays/institutions des co-auteurs)

**Mockup :** `mockups/reseau-co-auteurs.html` · [app-mockup.html#reseau](app-mockup.html)

---

### 3.7 📄 Export PDF

**Description :** Interface de configuration et génération d'un rapport PDF statique partageable.

**Comportements :**
- **Sélection des sections** à inclure (toggles/checkboxes)
- **Options de personnalisation :**
  - Nombre de publications à inclure
  - Visualisations à intégrer
  - Langue du rapport
  - Format (A4, Letter…)
  - Période à couvrir
  - Thématiques à filtrer
- **Aperçu live** du rendu du rapport
- **Génération côté client** (Puppeteer headless browser pour convertir visualisations en images)
- Bouton génération + téléchargement
- Format propre et partageable

**Mockup :** `mockups/export-pdf.html` · [app-mockup.html#export](app-mockup.html)

---

## 4. User Stories par section

### Epic 1 — Fondations & Recherche (🔍 Recherche)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-1.1 | En tant qu'utilisateur, je veux rechercher un chercheur par nom afin de trouver son profil | Haute |
| US-1.2 | En tant qu'utilisateur, je veux voir des suggestions auto-complétées avec institution et domaine afin de désambiguïser entre homonymes | Haute |
| US-1.3 | En tant qu'utilisateur, je veux coller un ORCID, Scopus ID ou URL Scholar afin d'accéder directement au bon profil | Haute |
| US-1.4 | En tant qu'utilisateur, je veux que le système détecte automatiquement le format de mon entrée afin de ne pas avoir à spécifier le type | Moyenne |
| US-1.5 | En tant qu'utilisateur, je veux voir des exemples de recherche afin de comprendre les formats acceptés | Basse |
| US-1.6 | En tant qu'utilisateur, je veux créer un compte optionnel afin de persister mes clés API institutionnelles | Moyenne |
| US-1.7 | En tant qu'utilisateur connecté, je veux saisir mes clés Scopus/WoS afin d'enrichir les données avec des métriques premium | Moyenne |

### Epic 2 — Vue d'ensemble (📊 Vue d'ensemble)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-2.1 | En tant qu'utilisateur, je veux voir les métriques clés (h-index, citations, publications, années) afin d'avoir une vue rapide du profil | Haute |
| US-2.2 | En tant qu'utilisateur, je veux voir un sparkline de citations/année avec tooltip au survol afin de visualiser la tendance | Haute |
| US-2.3 | En tant qu'utilisateur, je veux sélectionner une période (De/À) afin de filtrer les données affichées | Haute |
| US-2.4 | En tant qu'utilisateur, je veux voir les top thématiques en tags afin d'identifier rapidement les domaines du chercheur | Moyenne |
| US-2.5 | En tant qu'utilisateur, je veux naviguer vers les autres sections depuis la vue d'ensemble afin d'explorer en profondeur | Haute |

### Epic 3 — Publications (📚 Publications)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-3.1 | En tant qu'utilisateur, je veux voir la liste de toutes les publications afin de parcourir le corpus | Haute |
| US-3.2 | En tant qu'utilisateur, je veux filtrer par année, thématique, type et journal afin de trouver des articles spécifiques | Haute |
| US-3.3 | En tant qu'utilisateur, je veux trier par citations ou date afin de voir les plus impactantes ou les plus récentes | Haute |
| US-3.4 | En tant qu'utilisateur, je veux expandre un article pour voir l'abstract, co-auteurs et citations afin d'évaluer sa pertinence | Moyenne |
| US-3.5 | En tant qu'utilisateur, je veux voir des badges open access et citations afin d'identifier rapidement les articles clés | Basse |

### Epic 4 — Cartographie thématique (🗺️ Cartographie thématique)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-4.1 | En tant qu'utilisateur, je veux voir une carte de clusters thématiques (bubble chart) afin de visualiser les domaines de recherche | Haute |
| US-4.2 | En tant qu'utilisateur, je veux cliquer sur un cluster pour voir les sous-thèmes afin d'explorer en profondeur | Haute |
| US-4.3 | En tant qu'utilisateur, je veux voir les citations par cluster afin de comparer l'impact par thématique | Moyenne |
| US-4.4 | En tant qu'utilisateur, je veux voir l'évolution thématique dans le temps (stacked bars) afin de comprendre les migrations de sujets | Haute |
| US-4.5 | En tant qu'utilisateur, je veux que cliquer sur un thème filtre les publications et le réseau afin d'explorer par thématique | Haute |

### Epic 5 — Timeline (📈 Timeline)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-5.1 | En tant qu'utilisateur, je veux voir les publications par année en barres avec courbe de citations superposée afin de visualiser productivité et impact | Haute |
| US-5.2 | En tant qu'utilisateur, je veux sélectionner une période (boutons + slider) afin de zoomer sur une fenêtre temporelle | Haute |
| US-5.3 | En tant qu'utilisateur, je veux voir la timeline des affiliations institutionnelles afin de comprendre le parcours du chercheur | Haute |
| US-5.4 | En tant qu'utilisateur, je veux survoler un segment d'affiliation pour voir établissement, rôle, période, publications (conf/journaux) et citations afin d'analyser chaque phase | Moyenne |
| US-5.5 | En tant qu'utilisateur, je veux voir les jalons de carrière générés par IA (Mistral) afin d'identifier automatiquement les faits marquants | Moyenne |
| US-5.6 | En tant qu'utilisateur, je veux filtrer la timeline par thématique afin de voir la dynamique par domaine | Moyenne |

### Epic 6 — Réseau de co-auteurs (👥 Réseau de co-auteurs)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-6.1 | En tant qu'utilisateur, je veux voir le graphe des co-auteurs directs avec nœuds dimensionnés afin de visualiser les collaborations | Haute |
| US-6.2 | En tant qu'utilisateur, je veux voir les liens colorés par thématique avec épaisseur proportionnelle afin de comprendre la nature des collaborations | Haute |
| US-6.3 | En tant qu'utilisateur, je veux voir les cross-links entre co-auteurs afin de savoir qui publie ensemble indépendamment | Moyenne |
| US-6.4 | En tant qu'utilisateur, je veux survoler un nœud/lien pour voir les détails afin d'analyser les collaborations | Haute |
| US-6.5 | En tant qu'utilisateur, je veux filtrer par co-publications min et co-auteurs max afin de simplifier le graphe | Moyenne |
| US-6.6 | En tant qu'utilisateur, je veux cliquer sur un co-auteur pour ouvrir son dashboard complet afin d'explorer le réseau de proche en proche | Haute |
| US-6.7 | En tant qu'utilisateur, je veux voir une collaboration map géographique afin de visualiser la répartition géographique | Basse |

### Epic 7 — Export PDF (📄 Export PDF)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-7.1 | En tant qu'utilisateur, je veux sélectionner les sections à inclure dans le PDF afin de personnaliser le rapport | Haute |
| US-7.2 | En tant qu'utilisateur, je veux choisir la période et les thématiques à couvrir afin de cibler le rapport | Moyenne |
| US-7.3 | En tant qu'utilisateur, je veux voir un aperçu live du rapport afin de vérifier avant de générer | Moyenne |
| US-7.4 | En tant qu'utilisateur, je veux générer et télécharger le PDF afin de partager le profil | Haute |

---

## 5. Epic Breakdown

### Ordre de dépendance

```
Epic 1 (Fondations & Recherche)
  ├── Epic 2 (Vue d'ensemble)
  ├── Epic 3 (Publications)
  │     └── Epic 4 (Cartographie thématique) — dépend des publications pour le clustering
  │     └── Epic 5 (Timeline) — dépend des publications pour le graphique
  ├── Epic 6 (Réseau de co-auteurs) — peut démarrer après Epic 1
  └── Epic 7 (Export PDF) — dépend de toutes les vues pour les capturer
```

### Détail des epics

| Epic | Section source | User Stories | Dépendances | Complexité |
|------|---------------|-------------|-------------|------------|
| **Epic 1 — Fondations & Recherche** | 🔍 Recherche | US-1.1 à US-1.7 | Aucune | **L** |
| **Epic 2 — Vue d'ensemble** | 📊 Vue d'ensemble | US-2.1 à US-2.5 | Epic 1 | **M** |
| **Epic 3 — Publications** | 📚 Publications | US-3.1 à US-3.5 | Epic 1 | **M** |
| **Epic 4 — Cartographie thématique** | 🗺️ Cartographie | US-4.1 à US-4.5 | Epic 1, Epic 3 | **L** |
| **Epic 5 — Timeline** | 📈 Timeline | US-5.1 à US-5.6 | Epic 1, Epic 3 | **L** |
| **Epic 6 — Réseau de co-auteurs** | 👥 Réseau | US-6.1 à US-6.7 | Epic 1 | **L** |
| **Epic 7 — Export PDF** | 📄 Export PDF | US-7.1 à US-7.4 | Epic 2-6 | **M** |

### Epic 1 — Fondations & Recherche (L)
**Scope :** Architecture, setup projet, intégration APIs (OpenAlex, Semantic Scholar, CrossRef), page de recherche, système de cache, authentification optionnelle, routing, design system (dark theme, composants réutilisables).

**Pourquoi en premier :** Toutes les autres sections dépendent de la couche données et du shell applicatif.

### Epic 2 — Vue d'ensemble (M)
**Scope :** Dashboard principal, métriques agrégées, sparklines, sélecteur de période, navigation inter-sections.

**Dépendances :** Epic 1 (APIs + routing + design system).

### Epic 3 — Publications (M)
**Scope :** Liste publications, filtres multiples, tri, détail expandable, badges, pagination.

**Dépendances :** Epic 1 (APIs + données publications).

### Epic 4 — Cartographie thématique (L)
**Scope :** Pipeline NLP/topic modeling, bubble chart, drill-down sous-thèmes, citations par cluster, évolution temporelle stacked bars, cross-filtering.

**Dépendances :** Epic 1 (APIs), Epic 3 (publications comme input pour le clustering). Composant le plus coûteux en développement (NLP backend).

### Epic 5 — Timeline (L)
**Scope :** Frise chronologique, courbe citations SVG, sélecteur de période, timeline affiliations institutionnelles, tooltips enrichis, intégration Mistral API pour jalons, cross-filtering.

**Dépendances :** Epic 1 (APIs), Epic 3 (données publications pour le graphique).

### Epic 6 — Réseau de co-auteurs (L)
**Scope :** Graphe canvas, layout force-directed, liens thématiques colorés, cross-links, tooltips, filtres de profondeur, navigation profil-en-profil, collaboration map géographique.

**Dépendances :** Epic 1 (APIs + données co-auteurs). Peut démarrer en parallèle de Epic 2-3.

### Epic 7 — Export PDF (M)
**Scope :** Interface de configuration, aperçu live, génération PDF via headless browser (Puppeteer), capture des visualisations en images.

**Dépendances :** Epic 2 à 6 (toutes les vues doivent exister pour être capturées).

---

## 6. Exigences non-fonctionnelles

### Performance
- Première charge d'un profil : < 10s (avec cache pour les rechargements)
- Cross-filtering : réponse < 200ms
- Graphe co-auteurs : fluide jusqu'à 100 nœuds
- Cache côté client pour éviter les re-fetch

### Accessibilité
- Contraste suffisant sur le dark theme
- Navigation clavier sur les filtres et la liste de publications
- Alt text sur les visualisations
- ARIA labels sur les contrôles interactifs

### Responsive
- Breakpoint minimum : 375px (mobile)
- Visualisations adaptatives (graphes simplifiés sur mobile)
- Navigation responsive (menu hamburger sur petit écran)

### Sécurité
- Stockage sécurisé des clés API (chiffrement côté serveur si compte)
- Pas de stockage de données personnelles en mode anonyme
- HTTPS obligatoire

---

## 7. Références visuelles

### Design system
- **Fond principal :** `#0f1729`
- **Navbar :** `#1a2332` avec bordure `#1e293b`
- **Bleu accent :** `#60a5fa`
- **Violet accent :** `#a78bfa`
- **Jaune citations :** `#f59e0b`
- **Logo :** "ScholarScope" en gradient (`#60a5fa` → `#a78bfa`), font-weight 800
- **Navigation :** liens pill-style avec background `rgba(96,165,250,0.15)` sur actif

### Mockups
| Section | Fichier | Version validée |
|---------|---------|----------------|
| 🔍 Recherche | `mockups/recherche.html` | V1 |
| 📊 Vue d'ensemble | `mockups/vue-densemble.html` | V2 |
| 📚 Publications | `mockups/publications.html` | V1 |
| 🗺️ Cartographie | `mockups/cartographie-thematique.html` | V5 |
| 📈 Timeline | `mockups/timeline.html` | V3.5 |
| 👥 Réseau | `mockups/reseau-co-auteurs.html` | V3 |
| 📄 Export PDF | `mockups/export-pdf.html` | V1 |

**Compilation navigable :** [app-mockup.html](app-mockup.html)

> **Note :** Les fichiers mockup HTML n'ont pas été téléchargés depuis Discord dans cette session. Ils sont disponibles en tant que pièces jointes dans les threads Discord correspondants du canal fred2.
