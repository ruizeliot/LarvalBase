# Notes de Brainstorm — audit4

**Projet :** Application de planification de vacances
**Date :** 15 février 2026
**Langue :** Français
**Personnalité :** Professionnelle

---

## Vue d'ensemble

Application mobile-first pour organiser des vacances avec un mode hybride combinant planification manuelle et suggestions IA optionnelles. Les deux piliers centraux sont la gestion du budget (suivi des dépenses, partage des frais) et la planification d'itinéraire (planning jour par jour, carte interactive, optimisation des trajets).

---

## STEP R — Router (Type de projet)

**Décision :** Nouveau projet — idée from scratch
Le projet démarre sans codebase existante. Première itération, sans historique de brainstorm antérieur.

---

## STEP 1 — Concept & Research

### 1.1 Concept Initial

**Description originale :** Une app pour organiser des vacances
**Reformulation validée :** Application mobile pour planifier et organiser ses vacances — recherche de destination, itinéraire, budget, activités, et coordination entre voyageurs.

### 1.2 Clarifications

#### Niveau d'intelligence
**Choix :** Hybride — planification manuelle + suggestions IA optionnelles

**Justification :**
- L'utilisateur planifie manuellement pour garder le contrôle
- L'app propose des suggestions optionnelles (activités, itinéraires optimisés)
- Évite le mode 100% manuel (trop basique, pas de valeur ajoutée)
- Évite le mode 100% IA (trop opaque, utilisateur perd le contrôle)

**Alternatives écartées :**
- Organisateur pur : trop basique, pas de différenciation
- Assistant intelligent : trop passif
- Planificateur IA complet : manque de transparence et contrôle utilisateur

#### Cible utilisateurs
**Choix :** Solo par défaut, mode groupe optionnel

**Justification :**
- Couvre tous les cas d'usage sans complexifier l'onboarding
- Le mode solo reste simple et rapide à démarrer
- Le mode groupe est activable quand nécessaire
- Les besoins famille sont couverts par le mode groupe

**Alternatives écartées :**
- Solo uniquement : exclut un cas d'usage important
- Groupe uniquement : complexifie l'UX pour les voyageurs solo
- Famille dédiée : redondant avec le mode groupe

#### Cœur de valeur
**Choix :** Budget (suivi/partage des frais) + Itinéraire (planning jour par jour, carte interactive)

**Justification :**
- Deux piliers centraux identifiés comme essentiels
- Le budget répond au besoin de contrôle financier et de partage des dépenses
- L'itinéraire répond au besoin d'organisation temporelle et géographique
- Ces deux fonctions sont complémentaires et structurent l'expérience

**Alternatives écartées :**
- Documents : fonctionnalité secondaire
- Découverte : couvert partiellement par les suggestions IA
- Tout-en-un : risque de diluer le focus produit

#### Plateforme
**Choix :** Mobile-first (iOS/Android) + version web

**Justification :**
- Mobile-first car les vacances se planifient en déplacement
- Version web pour l'édition confortable sur grand écran
- Combo mobile + web maximise l'accessibilité

**Alternatives écartées :**
- Mobile natif uniquement : exclut les utilisateurs desktop
- Web app uniquement : expérience mobile dégradée
- PWA : compromis qui n'offre pas la meilleure expérience

#### Modèle économique
**Choix :** Gratuit — projet personnel

**Justification :** Pas de monétisation prévue, projet à titre personnel.

### 1.3 Recherche de références

**Stratégie :** Analyse comparative des apps similaires

#### Référence principale : Wanderlog
**URL :** https://wanderlog.com

**Points forts :**
- Planification d'itinéraire jour par jour
- Optimisation de route
- Vue carte
- Budgeting avec split des dépenses pour les groupes
- Collaboration en temps réel
- Checklists
- Suggestions IA pour activités/routes
- Import email pour réservations

**Plateformes :** iOS, Android, Web
**Modèle :** Freemium

**Analyse :** Wanderlog combine itinéraire + budgeting + collaboration. Leur budgeting reste secondaire. **Opportunité** : positionner Budget + Itinéraire comme deux piliers équivalents.

#### Autres références

**2. Splitwise** — https://splitwise.com
- Spécialisé dans le split de dépenses (qui a payé quoi, division égale/custom, 100+ devises)
- Purement budget — pas d'itinéraire, carte ou planification d'activités
- **Gap :** Excellent sur le budget mais ne touche pas à la planification

**3. TripIt** — https://www.tripit.com
- Gestion de réservations importées depuis emails
- Vue itinéraire basique, pas de suivi de budget ni collaboration
- **Gap :** Utile pour tracker les réservations mais pas pour planifier

**4. Google Maps** — https://www.google.com/maps
- Optimisation de route gratuite, carte interactive
- Pas de structure d'itinéraire, budgeting ou collaboration
- **Gap :** Excellent pour les trajets mais ne structure pas le voyage

#### Conclusion de la recherche
**Référence retenue :** Wanderlog
**Positionnement différenciant :** Budget ET Itinéraire comme piliers égaux, mode hybride (moins IA-heavy, plus de contrôle utilisateur)
**Opportunité de marché :** Gap entre Splitwise (budget-only) et Wanderlog (itinéraire-first)

---

## STEP 2A — Découpage des sections

### Sections validées (6)

#### 1. 🏠 Accueil & Dashboard
Vue d'ensemble des voyages, accès rapide au prochain trip, résumé budget/itinéraire. Point d'entrée de l'app.

#### 2. 🗺️ Itinéraire & Carte
Planning jour par jour, carte interactive, optimisation de trajets. Un des deux piliers centraux.

#### 3. 💰 Budget & Dépenses
Suivi des dépenses, partage des frais, alertes budget. Le second pilier central.

#### 4. 👥 Mode Groupe
Invitation, collaboration, partage de frais entre participants. Fonction support optionnelle.

#### 5. 🤖 Suggestions IA
Recommandations optionnelles d'activités et d'itinéraires. Le côté "suggestions optionnelles" du mode hybride.

#### 6. ⚙️ Profil & Paramètres
Compte, préférences, gestion des voyages. Fonction support.

### Logique du découpage
- Les 2 piliers : Itinéraire (section 2) + Budget (section 3)
- Fonctions support : Dashboard (1), Groupe (4), IA (5), Profil (6)

---

## STEP 2B — Demo Mode (Deep-Dive)

**Mode choisi :** Demo mode — génération de tous les mockups d'un coup, validation globale ensuite

### Mockups générés

Tous les mockups sont standalone HTML, mobile-responsive (375px+), avec animations CSS, navigation clickable, données réalistes (Lisbonne), et design system cohérent.

#### 1. 🏠 Accueil & Dashboard (01-dashboard.html)
- Hero card du prochain voyage avec countdown
- Actions rapides en grid (ajouter dépense, voir carte, partager)
- Liste des trips avec tags visuels (budget, groupe/solo, terminé)
- Animations slide-up au chargement, hover effects sur les cards

#### 2. 🗺️ Itinéraire & Carte (02-itineraire-carte.html)
- 3 vues switchables : Carte (pins + optimisation IA), Timeline (jour par jour, drag & drop, tags par type), Liste (résumé compact)
- Données réalistes Lisbonne J1-J3
- Statistiques de trajet (distance totale, temps de déplacement)

#### 3. 💰 Budget & Dépenses (03-budget-depenses.html)
- Hero avec progression visuelle (budget utilisé vs total)
- Catégories en grid (resto, hébergement, transport, activités) avec montants
- Fil de dépenses filtrable par type
- Alerte budget intégrée

#### 4. 👥 Mode Groupe (04-mode-groupe.html)
- 3 onglets : Membres (statut online, rôles), Partage des frais (qui doit quoi, simplification automatique), Activité (feed temps réel)
- Modal d'invitation avec lien + partage social
- Liste des participants avec avatars et soldes

#### 5. 🤖 Suggestions IA (05-suggestions-ia.html)
- Cards de suggestions contextuelles (% match, prix, distance, notation)
- Optimisation d'itinéraire avec stats d'économie
- Chat IA intégré pour questions libres
- Toggle activités / itinéraire / budget

#### 6. ⚙️ Profil & Paramètres (06-profil-parametres.html)
- Profil avec stats voyageur (voyages, distance, pays)
- Préférences : devise, langue, unités
- Toggles notifications, export données (RGPD), zone danger

### Validation globale
**Décision :** Toutes les sections validées sans modification.

---

## STEP 3A — Revue du Brainstorm

**Décision :** Validation globale sans correction.

---

## Résumé des décisions clés

| Dimension | Décision | Justification |
|-----------|----------|---------------|
| Type de projet | Nouveau projet (from scratch) | Pas de codebase existante |
| Concept | App vacances hybride (manuel + IA) | Équilibre contrôle et assistance |
| Cible | Solo + groupe optionnel | Couvre tous les cas |
| Piliers | Budget + Itinéraire | Deux fonctions centrales |
| Plateforme | Mobile-first + web | Accessibilité maximale |
| Modèle éco | Gratuit (personnel) | Pas de monétisation |
| Référence | Wanderlog | Concurrent le plus proche |
| Sections | 6 sections | Découpage logique complet |
| Mode deep-dive | Demo mode | Vision globale rapide |

---

## Différenciation produit

**Positionnement unique :**
- Wanderlog : itinéraire-first, budget en add-on, IA agressive
- audit4 : Budget ET Itinéraire comme piliers égaux, mode hybride (contrôle utilisateur)

**Avantages compétitifs :**
1. Focus équilibré budget/itinéraire
2. Suggestions IA optionnelles, pas imposées
3. Flexibilité solo/groupe
4. Mobile + web pour tous les contextes
