# Brainstorm Notes — fred2 (ScholarScope)

**Date :** 19-20 février 2026
**Utilisateur :** Frederick Benaben (profil normal)
**Type de projet :** Nouveau projet (A)
**Langue :** Français

---

## 1. Concept & Positionnement

### Idée originale
Frederick souhaite une **application web** permettant de choisir un chercheur académique et d'obtenir une synthèse de son profil sur plusieurs aspects : publications, citations, impact factor, thématiques abordées, dynamique chronologique, établissements, réseau de co-auteurs. Le tout sous forme d'un **tableau de bord interactif**.

### Reformulation validée
**Un dashboard web interactif pour explorer le profil d'un chercheur académique.** On entre un nom, et on obtient une vue synthétique et visuelle de son activité : publications, citations, thématiques, évolution chronologique, collaborations, établissements. L'idée est d'aller au-delà des métriques classiques (h-index, citations) en ajoutant des visualisations riches : cartographie thématique, dynamique temporelle, réseau de co-auteurs.

### Nom de travail
**ScholarScope** (utilisé dans les mockups)

---

## 2. Clarifications — Décisions structurantes

### 2.1 Sources de données — Mode dégradé gracieux

**Décision :** Le dashboard fonctionne sur APIs ouvertes (OpenAlex, Semantic Scholar, CrossRef) par défaut. Si l'utilisateur fournit des clés institutionnelles (Scopus, WoS), les métriques premium s'ajoutent automatiquement.

**Options considérées :**
- **A) APIs ouvertes uniquement** — Gratuit, accès libre, bonne couverture mais parfois incomplète → Rejetée seule car trop limitante
- **B) APIs mixtes (ouvertes + institutionnelles)** — Plus complet mais nécessite accès institutionnel → Rejetée seule car exclut les non-universitaires
- **C) Scraping + APIs** — Maximise la couverture mais fragile et lent → Rejetée car instable
- **Choix final : A + B combinées** — Frederick a proposé de combiner les deux approches. Tout le monde accède aux données ouvertes, les universitaires avec accès institutionnel bénéficient d'un bonus. Accepté unanimement.

**Raisonnement :** Ne ferme aucune porte. Le public cible est mixte (chercheurs avec et sans accès institutionnel).

### 2.2 Visualisations — Interactives et liées

**Décision :** Toutes les vues (thématiques, timeline, co-auteurs, métriques) sont connectées : filtrer une thématique met à jour la liste des publications, la timeline, le réseau. Un vrai outil d'exploration de données de type « business intelligence ».

**Options considérées :**
- **A) Statique enrichi** — Graphiques générés côté serveur, non-manipulables → Rejeté car manque d'exploration
- **B) Interactif** — Filtres, zoom, survol avec détails → Rejeté car manque de connexion entre vues
- **C) Interactif + lié (cross-filtering)** — Tout réagit ensemble → **Choisi** (C)

**Ajout spontané de Frederick :** Export PDF pour générer un rapport statique partageable. Intégré comme fonctionnalité complémentaire.

### 2.3 Extraction thématique — Hybride

**Décision :** Keywords existants (auteurs, subject areas des bases) comme base, enrichis par du NLP (topic modeling) quand les keywords sont absents ou trop génériques.

**Options considérées :**
- **A) Mots-clés existants** — Rapide, structuré, mais souvent incomplet/incohérent → Rejeté seul
- **B) NLP / Topic modeling** — Plus riche mais plus lourd, parfois moins lisible → Rejeté seul
- **C) Hybride (A + B)** — Meilleur compromis fiabilité/finesse → **Choisi**

**Raisonnement :** Les mots-clés seuls sont trop hétérogènes entre bases de données, et le NLP seul peut produire des clusters opaques.

### 2.4 Réseau de co-auteurs — Niveau 1 navigable

**Décision :** On affiche les co-auteurs directs du chercheur. Cliquer sur un co-auteur ouvre son dashboard complet — exploration de proche en proche, sans limite de profondeur, sans graphe illisible.

**Options considérées :**
- **A) Niveau 1** — Co-auteurs directs, graphe simple → Rejeté car trop basique
- **B) Niveau 2** — Co-auteurs + co-auteurs des co-auteurs → Rejeté car risque graphe spaghetti
- **C) Niveau 1 + navigation** — Niveau 1 visuellement, mais chaque nœud est une porte d'entrée → **Choisi**

**Raisonnement :** Reste lisible visuellement tout en permettant une exploration en profondeur illimitée. Colle avec la logique de dashboard interactif lié.

### 2.5 Entrée utilisateur — Flexible

**Décision :** Recherche par nom avec désambiguïsation (institution, domaine) OU identifiant direct (ORCID, Scopus ID, URL Google Scholar). Le système détecte automatiquement le format.

**Options considérées :**
- **A) Recherche par nom uniquement** → Rejeté car les identifiants sont un raccourci précieux
- **B) Par identifiant uniquement** → Rejeté car pas assez accessible
- **C) Les deux** → **Choisi**

### 2.6 Système de comptes — Anonyme par défaut + compte optionnel

**Décision (ajoutée en Phase 2) :** Mode anonyme par défaut + compte utilisateur optionnel pour persister les accès institutionnels (clés API Scopus/WoS).

**Options considérées :**
- **A) Comptes utilisateur** — Login, stockage clés API en profil → Rejeté seul car trop contraignant
- **B) Saisie ponctuelle** — Pas de compte, clé en session → Rejeté seul car non persistant
- **C) Les deux** — Mode anonyme + compte optionnel → **Choisi**

**Implications notées :** Authentification légère à définir (OAuth institutionnel ? email/password ?), stockage sécurisé des clés API, distinction visuelle données publiques vs enrichies.

---

## 3. Recherche concurrentielle

### Produits analysés
6 produits comparés : Semantic Scholar, Dimensions AI, Pure, Google Scholar, ORCID, Scopus/Web of Science.

### Conclusions
- **Aucun outil gratuit** ne propose un dashboard interactif lié centré sur un chercheur individuel
- Google Scholar et ORCID sont trop basiques, zéro visualisation interactive
- Dimensions AI et Scopus sont riches mais payants et institutionnels
- **L'évolution thématique dans le temps** — aucun produit ne visualise comment les sujets d'un chercheur migrent au fil des années

### Niche gap identifié
Le créneau "dashboard chercheur interactif gratuit" est vide. Pas de concurrence directe.

### Visualisations empruntées aux concurrents
- **De Dimensions AI :** Landscape visualization (carte 2D de proximité thématique / carte de chaleur)
- **De Scopus :** Citation par subject area (radar/sunburst), collaboration map géographique
- **De Semantic Scholar :** Graphe d'influence (centralité dans le réseau de citations)

### Avantage unique de ScholarScope
- Gratuit par défaut, enrichi sur option (le seul combinant accessibilité et profondeur analytique)
- Navigation de profil en profil via le réseau de co-auteurs (expérience d'exploration unique)

---

## 4. Sections — Découpage validé

7 sections définies et validées pour le dashboard :

| # | Section | Description courte |
|---|---------|-------------------|
| 1 | 🔍 Recherche | Page d'accueil, barre de recherche, désambiguïsation |
| 2 | 📊 Vue d'ensemble | Dashboard principal, métriques clés, mini-visualisations |
| 3 | 📚 Publications | Liste filtrable, détail par article, badges |
| 4 | 🗺️ Cartographie thématique | Clusters thématiques, drill-down, évolution temporelle |
| 5 | 📈 Timeline | Frise chronologique, citations, affiliations, jalons IA |
| 6 | 👥 Réseau de co-auteurs | Graphe interactif, liens thématiques, filtres de profondeur |
| 7 | 📄 Export PDF | Configuration et génération de rapport statique |

---

## 5. Décisions par section

### 5.1 🔍 Recherche

**Specs :**
- Page d'accueil avec barre de recherche centrale
- Autocomplétion par nom avec désambiguïsation (institution, domaine)
- Détection automatique du format d'entrée (nom, ORCID, Scopus ID, URL Scholar)
- Design épuré avec exemples de recherches possibles
- Raccourcis d'exemple sous le champ de saisie (pattern type Google/Perplexity) — pré-remplissent le champ au clic

**Feedback utilisateur :**
- Frederick a demandé à quoi servaient les boutons d'exemple → Manager a clarifié → Frederick a validé ("ok, clair")

**Mockup validé :** V1

### 5.2 📊 Vue d'ensemble

**Specs :**
- Dashboard principal du profil chercheur
- Métriques clés en header : h-index, citations totales, nombre de publications, années actives
- Résumé profil : nom, institution, domaines
- Mini-visualisations : sparklines citations/année, top thématiques en tags, dernières publications
- Navigation cross-filtrée vers les autres sections

**Modifications demandées par Frederick :**
1. **Tooltip au survol** — Afficher le nombre exact de citations quand on survole une barre du graphique Citations/an → Ajouté (V2)
2. **Sélecteur de période** — Pouvoir choisir une plage d'années au lieu d'afficher toutes les années → Ajouté (V2 : deux menus déroulants "De / à")

**Mockup validé :** V2

### 5.3 📚 Publications

**Specs :**
- Liste complète des publications avec filtres multiples (année, thématique, type de publication, journal)
- Tri par citations ou date
- Détail expandable par article (abstract, co-auteurs, citations)
- Badges visuels (open access, nombre de citations)
- Pagination

**Feedback utilisateur :** Frederick a validé directement ("ok")

**Mockup validé :** V1

### 5.4 🗺️ Cartographie thématique

**Specs :**
- Visualisation des clusters thématiques via bubble chart (taille = poids du thème)
- Évolution thématique dans le temps (stacked bars)
- Keywords + NLP/topic modeling combinés
- Clic sur un thème filtre publications et réseau (cross-filtering)
- Inspiré du landscape visualization de Dimensions AI

**Modifications demandées par Frederick (5 itérations) :**

1. **Drill-down sous-thèmes** — Cliquer sur un cluster ouvre les sous-topics (ex: "Interopérabilité" → Standards, Protocoles, Middleware…) → Ajouté (V2)
2. **Citations par cluster** — Volet citations par thème pour comparaison quantitative → Ajouté (V2)
3. **Bandeau ScholarScope** — Doit avoir le même bandeau de navigation que les autres vues → Ajouté (V3)
4. **Homogénéité du bandeau** — Onglets alignés à droite (pas centrés), suppression avatar/FB → Corrigé (V4, V5)

**Décisions :**
- Frederick pensait que les graphes de citations seraient dans cette vue → Manager a clarifié que les citations sont réparties sur Timeline, Publications et Vue d'ensemble, mais qu'on pouvait aussi les intégrer ici par cluster → Frederick a choisi d'ajouter les deux (sous-thèmes + citations par cluster)
- Le bandeau de navigation doit être **identique** sur toutes les vues (logo gradient ScholarScope, liens pill-style, fond #1a2332, pas d'avatar utilisateur)

**Mockup validé :** V5

### 5.5 📈 Timeline

**Specs :**
- Frise chronologique interactive des publications par année (barres)
- Courbe de citations (polyline SVG, axe Y secondaire jaune)
- Sélecteur de période : boutons rapides (5 ans / 10 ans / Tout) + double range slider
- Filtres par thématique (Interopérabilité, Gestion de crises, Supply chain)
- Section « Jalons de carrière » avec badge « Généré par IA (Mistral) » animé
- Cross-filtrée avec publications et cartographie thématique

**Timeline des affiliations institutionnelles (ajoutée en V3) :**
- Bande horizontale segmentée par couleur selon le statut (Doctorat → MCF → Professeur)
- Deux lignes par segment : nom de l'établissement (bold) + rôle/statut (sous-titre)
- Dates de transition visibles aux jonctions (2006, 2010, 2015, 2021, 2024)
- Overlay hachuré pour séjours temporaires (EPFL Visiting Researcher 2021)
- Tooltips enrichis au survol : 🏛️ Établissement, 📋 Rôle, 📅 Période, 📝 Articles de conférence, 📰 Articles de journaux, 📈 Citations cumulées
- Synchronisée avec le sélecteur de période

**Décision technique clé :** Utilisation de l'API **Mistral** (clé fournie par l'utilisateur) pour l'analyse et l'interprétation automatique des jalons de carrière. Si l'utilisateur n'a pas de clé, prévoir un fallback (jalons manuels ou désactivation gracieuse).

**Itérations (6 versions) :**
- V1 : manquait courbe de citations + granularité insuffisante
- V2 : courbe citations + range slider + badge IA → ✅ Validé utilisateur
- V3 : ajout timeline affiliations institutionnelles
- V3.1 : mise en évidence du nom d'établissement (deux lignes bold + sous-titre)
- V3.2 : dates de transition aux jonctions + tooltips enrichis
- V3.3 : dates pour segment EPFL + ventilation conférences/journaux dans tooltips
- V3.4 : fix `overflow: hidden` masquant les tooltips → `overflow: visible`
- V3.5 : fix positionnement overlay EPFL (invisible hors période, correctement ancré quand visible) → ✅ Validé utilisateur

**Mockup validé :** V3.5

### 5.6 👥 Réseau de co-auteurs

**Specs :**
- Graphe interactif niveau 1 des co-auteurs directs
- Nœuds dimensionnés par nombre de co-publications
- Clic sur un co-auteur → ouvre son dashboard complet (navigation de profil en profil)
- Collaboration map géographique (pays/institutions des co-auteurs)
- Inspiré du graphe d'influence de Semantic Scholar et collaboration map de Scopus

**Modifications demandées par Frederick (3 itérations) :**

1. **Sémantique des liens (V2) :**
   - Liens colorés par thématique de recherche : 🔵 Crisis management, 🟣 Interoperability, 🟢 Supply chain, 🟠 Digital twins
   - Épaisseur proportionnelle au nombre de co-publications sur cette thématique
   - Multi-thèmes sur un même lien = lignes parallèles décalées
   - Liens fins en pointillés entre co-auteurs = **ils publient ensemble indépendamment du chercheur central** (choix explicite de Frederick entre deux interprétations)

2. **Liens radiaux (V2) :**
   - Tracés précisément centre-à-centre de chaque nœud (rendu canvas)
   - Plus de décalages visuels disgracieux

3. **Tooltips + Filtres (V3) :**
   - **Tooltips nœuds :** nom complet, affiliation, détail par thématique, total co-publications
   - **Tooltips liens :** thématique, auteurs connectés, nb publications
   - Nœuds/liens non-concernés se dimment au survol
   - **Légende** déplacée dans la barre de contrôles au-dessus du graphe (plus de chevauchement)
   - **Filtres de profondeur :** slider « co-publications min » + slider « co-auteurs max affiché », mise à jour en temps réel du graphe

**Décisions :**
- Frederick a explicitement choisi que les cross-links entre co-auteurs signifient qu'ils publient ensemble **indépendamment** du chercheur central (pas simplement qu'ils sont tous deux co-auteurs du chercheur)
- Rendu canvas pour la précision des liens centre-à-centre

**Mockup validé :** V3

### 5.7 📄 Export PDF

**Specs :**
- Interface de configuration du rapport PDF
- Sélection des sections à inclure (toggles/checkboxes)
- Options : nombre de publications à inclure, visualisations, langue, format
- Aperçu live du rendu
- Génération côté client (pas d'envoi serveur)
- Bouton génération + téléchargement
- Format propre et partageable

**Feedback utilisateur :** Frederick a validé directement ("ça me semble très bien")

**Mockup validé :** V1

---

## 6. Vérification de faisabilité

### Points d'attention identifiés

1. **APIs multiples + rate limits** — OpenAlex + Semantic Scholar + CrossRef combinés peuvent ralentir la première charge d'un profil (200+ publications). Prévoir un système de cache/queue.

2. **Mistral API (Timeline)** — Dépend d'une clé utilisateur. Prévoir un fallback (jalons manuels ou désactivation gracieuse).

3. **Canvas + interactivité (Réseau)** — Le graphe canvas avec tooltips, filtres et liens thématiques est ambitieux mais faisable. Pour 50+ co-auteurs, prévoir un algorithme de layout force-directed côté client.

4. **NLP/Topic modeling (Cartographie)** — Nécessite soit un service backend (Python + sklearn/BERTopic), soit une API externe. Composant le plus coûteux en développement.

5. **Export PDF** — Générer un PDF avec des visualisations converties en images statiques nécessite un headless browser (Puppeteer). Hébergement léger type Vercel ne suffira pas — prévoir un serveur avec Node.js.

### Verdict : Pas de showstoppers. Projet réaliste pour un développeur full-stack (4-6 semaines estimées).

---

## 7. Cross-section — Impacts et dépendances

### Cross-filtering global
Toutes les vues sont interconnectées :
- Cliquer sur une **thématique** (Cartographie) → filtre Publications, Timeline, Réseau
- Sélectionner une **période** (Timeline) → met à jour jalons, affiliations, publications visibles
- Cliquer sur un **co-auteur** (Réseau) → ouvre son dashboard complet (nouvelle instance)
- Cliquer sur un **thème dans le réseau** → filtre les liens par thématique

### Design system cohérent
- Dark theme : `#0f1729` (fond), `#1a2332` (navbar), `#60a5fa` (bleu accent), `#a78bfa` (violet), `#f59e0b` (jaune citations)
- Bandeau ScholarScope identique sur toutes les vues : logo gradient, liens pill-style, fond `#1a2332`, pas d'avatar
- Animations CSS (hover, transitions, loading states)
- Responsive 375px+

### Authentification
- Mode anonyme = APIs ouvertes uniquement
- Mode connecté (compte optionnel) = APIs ouvertes + clés institutionnelles persistées
- Distinction visuelle données publiques vs enrichies à prévoir

---

## 8. Questions ouvertes / Décisions différées

1. **Type d'authentification** pour le mode compte optionnel (OAuth institutionnel ? email/password ?) — à définir en phase d'implémentation
2. **Stockage sécurisé des clés API** Scopus/WoS — mécanisme à choisir
3. **Backend NLP** — Python + BERTopic local ou API externe ? À trancher selon l'hébergement
4. **Hébergement** — Pas discuté. Le PDF export nécessite un serveur Node.js (Puppeteer), donc pas un simple hébergement statique
5. **Fallback Mistral** — Mécanisme exact pour les utilisateurs sans clé Mistral
