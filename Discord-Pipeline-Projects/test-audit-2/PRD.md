# PRD — QuizPub

> **Projet :** test-audit-2
> **Date :** 2026-02-15
> **Pitch Deck :** [pitch-deck.html](pitch-deck.html)

---

## 1. Vision & Concept

**QuizPub** est une application web de pub quiz multijoueur en temps réel, inspirée de Kahoot. Un quizmaster crée et lance un quiz, les joueurs rejoignent via un code PIN et répondent aux questions en temps réel depuis leur navigateur.

### Proposition de valeur
- **Simple :** Pas d'installation, pas de compte — un PIN et c'est parti
- **Flexible :** Scoring vitesse ou fixe, questions custom ou importées via API
- **Fun :** Ambiance pub/bar avec une UI moderne et des animations engageantes

### Références clés
| Référence | Rôle | URL |
|-----------|------|-----|
| **Kahoot!** | Flow principal (PIN → lobby → sync) | https://kahoot.com |
| **TriviaNerd** | Vibe pub quiz | https://trivianerd.com |
| **AhaSlides** | UI moderne et clean | https://ahaslides.com |
| **Mentimeter** | Modèle écran partagé | https://mentimeter.com |

### Différenciateur
Scoring flexible au choix du quizmaster (vitesse OU points fixes) + import gratuit via Open Trivia DB — deux features que Kahoot réserve à ses plans payants.

---

## 2. Contraintes techniques

### Plateforme
- **Web uniquement** — pas d'app native
- **Responsive mobile-first** pour les joueurs (l'écran joueur est conçu pour mobile)
- **Écran quizmaster optimisé projection** (grands textes, lisible de loin)

### Stack recommandée
| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | React, Vue ou Svelte | Framework web moderne avec composants réactifs |
| **Backend** | Node.js avec WebSocket | Temps réel natif, écosystème npm |
| **Base de données** | PostgreSQL ou MongoDB | Stockage quiz/questions/scores |
| **Communication** | WebSocket (Socket.IO ou ws) | Sync temps réel < 200ms |
| **API externe** | Open Trivia Database | Import questions gratuit, pas de clé API |

### Contraintes non-fonctionnelles
- **Latence :** < 200ms pour la synchronisation questions/réponses
- **Concurrence :** 50+ joueurs par partie minimum
- **Pas de compte obligatoire :** Les joueurs rejoignent avec juste un pseudo + PIN
- **Offline-ready :** Pas de dépendance réseau après chargement initial (les assets doivent être bundlés)

### Sécurité
- Rate limiting sur la création de parties (anti-spam)
- Validation côté serveur des réponses (anti-triche — pas de modification client)
- PIN à usage unique et expiration après fin de partie
- Pas de stockage de données personnelles (RGPD simplifié — pseudo seulement, pas d'email/mot de passe)

---

## 3. Specs fonctionnelles par section

### 3.1 Accueil

**Description :** Landing page principale. Point d'entrée pour les joueurs (rejoindre via PIN) et les quizmasters (créer un quiz).

**Mockup :** `mockups/mockup-1-accueil.html`

**Fonctionnalités :**
- Champ de saisie PIN 6 chiffres avec auto-focus sur le chiffre suivant
- Bouton "Rejoindre la partie" — valide le PIN et redirige vers le lobby
- Bouton "Créer un quiz" — redirige vers l'éditeur de quiz
- Branding QuizPub avec logo animé (gradient rouge/orange)

**Specs UI :**
- Dark theme (#1a1a2e)
- Particules flottantes décoratives (cercles colorés flous)
- Emojis bière/cerveau/cible en animation montante
- Police : Fredoka One (titres) + Inter (corps)

**Règles métier :**
- Le PIN doit être exactement 6 chiffres
- Si le PIN est invalide ou expiré → message d'erreur inline
- Le bouton "Créer un quiz" ne nécessite pas d'authentification

---

### 3.2 Création de quiz

**Description :** Interface d'édition pour le quizmaster. Permet de créer, modifier et organiser les questions du quiz.

**Mockup :** `mockups/mockup-2-creation-quiz.html`

**Fonctionnalités :**
- **Sidebar :** Liste ordonnée des questions avec numéro, aperçu texte, type et timer
- **Éditeur principal :**
  - Champ question (texte libre)
  - Toggle type : QCM (4 choix) / Vrai-Faux
  - Grille de réponses colorées (A rouge, B bleu, C orange, D vert)
  - Marqueur réponse correcte (checkbox par réponse)
  - Paramètres par question : timer (10/20/30/60s), mode scoring (rapidité/fixe), points
- **Import API :** Bouton import via Open Trivia Database (catégorie, difficulté, nombre)
- **Actions :** Sauvegarder, supprimer, preview, lancer le quiz
- **Header sticky :** Navigation retour + boutons preview/lancer

**Règles métier :**
- Minimum 1 question pour lancer un quiz
- QCM : exactement 4 choix, exactement 1 réponse correcte obligatoire
- Vrai/Faux : exactement 2 choix, exactement 1 réponse correcte obligatoire
- Timer par défaut : 20s
- Scoring par défaut : rapidité
- Points par défaut : 1000
- Les questions importées via API sont éditables après import

---

### 3.3 Lobby

**Description :** Salle d'attente après création du quiz. Les joueurs rejoignent, le quizmaster voit qui est connecté et lance quand prêt.

**Mockup :** `mockups/mockup-3-lobby.html`

**Fonctionnalités :**
- **PIN affiché en gros** — visible pour que les joueurs le tapent (affiché dans la top bar)
- **Compteur joueurs** en temps réel (nombre + texte "X joueurs connectés")
- **Grille de joueurs :** Pseudo + avatar emoji aléatoire, animation pop-in à l'arrivée
- **Infos quiz :** Nombre de questions, timer par question, mode scoring
- **Bouton "Lancer la partie"** — visible uniquement par le quizmaster, style vert avec effet shine
- **Indicateur d'attente** — 3 dots animés qui pulsent

**Règles métier :**
- Minimum 1 joueur pour lancer (recommandé : 2+)
- Le quizmaster voit tous les joueurs connectés en temps réel
- Les joueurs voient la salle d'attente + infos quiz (pas le bouton lancer)
- Le PIN reste affiché tant que la partie n'a pas démarré
- Un joueur qui se déconnecte disparaît de la grille
- Le quizmaster peut lancer à tout moment (pas de timer de lobby)

---

### 3.4 Écran de jeu (Joueur)

**Description :** Vue mobile-first pour les joueurs pendant le quiz. Affiche la question et les choix de réponse.

**Mockup :** `mockups/mockup-4-jeu-joueur.html`

**Fonctionnalités :**
- **Top bar :** Compteur questions (X/total) + score cumulé
- **Barre de progression timer** (linéaire, change de couleur vert→orange quand le temps diminue)
- **Timer circulaire** avec secondes restantes + animation spinner
- **Carte question** centrée avec texte
- **Grille 2x2 réponses** : 4 boutons colorés (A rouge/B bleu/C orange/D vert) avec lettre + texte
- **Sélection :** Animation pulse + checkmark, une seule réponse possible
- **Streak indicator :** Compteur de bonnes réponses consécutives ("🔥 X bonnes réponses d'affilée !")

**Règles métier :**
- Une seule réponse par question (sélection exclusive)
- Réponse verrouillée après sélection (pas de changement)
- Timer à 0 = pas de réponse = 0 points
- **Score vitesse :** Plus rapide = plus de points. Max 1000 pts, décroît linéairement avec le temps écoulé. Formule : `points = max_points * (temps_restant / temps_total)`
- **Score fixe :** Bonne réponse = 1000 pts, mauvaise = 0
- Le feedback (bonne/mauvaise) s'affiche après que le quizmaster révèle la réponse (pas immédiatement)

---

### 3.5 Écran de jeu (Quizmaster)

**Description :** Vue host optimisée pour projection sur grand écran. Affiche la question, le timer, les statistiques de réponse en temps réel.

**Mockup :** `mockups/mockup-5-jeu-quizmaster.html`

**Fonctionnalités :**
- **Host bar :** Logo + badge "Quizmaster" + progression questions (X/total)
- **Timer strip** coloré (gradient vert → orange → rouge)
- **Gros timer** (taille 6rem) bien visible de loin
- **Question** en gros texte (2.2rem)
- **4 blocs réponse** avec compteur de votes live (nombre de joueurs ayant choisi chaque réponse)
- **Badge LIVE** avec indicateur animé (point rouge clignotant) + nombre de joueurs connectés
- **Barre de contrôles :**
  - Stats : joueurs connectés, réponses reçues (X/total), % bonnes réponses
  - Bouton "Passer" (skip question — passe sans compter de points)
  - Bouton "Révéler la réponse" (affiche la bonne réponse sur tous les écrans)

**Règles métier :**
- Seul le quizmaster voit cette vue (URL séparée ou vérification de rôle)
- Les compteurs de votes se mettent à jour en temps réel (WebSocket)
- "Révéler" montre la bonne réponse sur l'écran partagé ET sur les écrans joueurs simultanément
- Après révélation : le quizmaster clique "Question suivante" pour avancer (pas d'auto-advance)
- "Passer" une question = 0 points pour tout le monde, passage direct à la suivante

---

### 3.6 Résultats / Leaderboard

**Description :** Écran de fin de quiz avec classement final, podium animé et scores détaillés.

**Mockup :** `mockups/mockup-6-leaderboard.html`

**Fonctionnalités :**
- **Confettis animés** célébratoires (éléments colorés qui tombent en boucle)
- **Podium top 3 :** Disposition 2e-1er-3e avec avatars emoji, noms, scores
  - 1er : couronne animée 👑, bordure dorée, barre la plus haute (140px)
  - 2e : argent, barre moyenne (100px)
  - 3e : bronze, barre plus petite (80px)
- **Leaderboard complet :** Rang, avatar, nom, bonnes réponses (X/total), score
- **Highlight joueur :** Le joueur courant est mis en évidence ("← Toi") avec fond coloré
- **Actions :** "Rejouer" (même quiz, nouveau lobby) + "Accueil" (retour landing)

**Règles métier :**
- Le podium montre les 3 premiers uniquement
- Le leaderboard montre tous les joueurs (4e et au-delà)
- Le score final = somme des points sur toutes les questions
- **Départage en cas d'égalité :** 1) nombre de bonnes réponses, 2) temps total de réponse le plus court
- "Rejouer" crée un nouveau lobby avec les mêmes questions et un nouveau PIN
- Le leaderboard est visible par tous (joueurs + quizmaster)

---

## 4. User Stories

### Epic 1 : Accueil
| ID | User Story | Priorité |
|----|-----------|----------|
| US-1.1 | En tant que **joueur**, je veux saisir un code PIN à 6 chiffres pour rejoindre une partie existante | P0 |
| US-1.2 | En tant que **quizmaster**, je veux accéder à la création de quiz depuis la page d'accueil | P0 |
| US-1.3 | En tant que **visiteur**, je veux comprendre le concept de l'app en arrivant sur la landing page | P1 |

### Epic 2 : Création de quiz
| ID | User Story | Priorité |
|----|-----------|----------|
| US-2.1 | En tant que **quizmaster**, je veux créer des questions QCM avec 4 choix de réponse et marquer la bonne | P0 |
| US-2.2 | En tant que **quizmaster**, je veux créer des questions Vrai/Faux | P0 |
| US-2.3 | En tant que **quizmaster**, je veux définir le timer par question (10/20/30/60s) | P0 |
| US-2.4 | En tant que **quizmaster**, je veux choisir le mode de scoring (vitesse ou fixe) par question | P0 |
| US-2.5 | En tant que **quizmaster**, je veux importer des questions depuis l'API Open Trivia Database | P1 |
| US-2.6 | En tant que **quizmaster**, je veux réorganiser l'ordre de mes questions par drag & drop | P1 |
| US-2.7 | En tant que **quizmaster**, je veux prévisualiser mon quiz avant de le lancer | P2 |

### Epic 3 : Lobby
| ID | User Story | Priorité |
|----|-----------|----------|
| US-3.1 | En tant que **quizmaster**, je veux voir le PIN de la partie affiché en grand pour le partager | P0 |
| US-3.2 | En tant que **quizmaster**, je veux voir les joueurs arriver en temps réel dans le lobby | P0 |
| US-3.3 | En tant que **quizmaster**, je veux lancer la partie quand je suis prêt (bouton Start) | P0 |
| US-3.4 | En tant que **joueur**, je veux voir les autres joueurs dans la salle d'attente | P0 |
| US-3.5 | En tant que **joueur**, je veux voir les infos du quiz (nombre de questions, timer, scoring) | P1 |

### Epic 4 : Écran de jeu (Joueur)
| ID | User Story | Priorité |
|----|-----------|----------|
| US-4.1 | En tant que **joueur**, je veux voir la question et les choix de réponse clairement sur mobile | P0 |
| US-4.2 | En tant que **joueur**, je veux sélectionner ma réponse en tapant sur un bouton coloré | P0 |
| US-4.3 | En tant que **joueur**, je veux voir le timer (circulaire + barre) pour savoir combien de temps il me reste | P0 |
| US-4.4 | En tant que **joueur**, je veux voir mon score cumulé en temps réel | P0 |
| US-4.5 | En tant que **joueur**, je veux voir mon streak de bonnes réponses consécutives | P1 |
| US-4.6 | En tant que **joueur**, je veux voir le feedback (bonne/mauvaise réponse + points gagnés) après révélation | P0 |

### Epic 5 : Écran de jeu (Quizmaster)
| ID | User Story | Priorité |
|----|-----------|----------|
| US-5.1 | En tant que **quizmaster**, je veux voir la question affichée en gros pour la projeter | P0 |
| US-5.2 | En tant que **quizmaster**, je veux voir combien de joueurs ont répondu en temps réel | P0 |
| US-5.3 | En tant que **quizmaster**, je veux révéler la bonne réponse quand je le décide | P0 |
| US-5.4 | En tant que **quizmaster**, je veux passer/skip une question si nécessaire | P1 |
| US-5.5 | En tant que **quizmaster**, je veux voir le % de bonnes réponses après révélation | P1 |

### Epic 6 : Résultats / Leaderboard
| ID | User Story | Priorité |
|----|-----------|----------|
| US-6.1 | En tant que **joueur**, je veux voir le podium des 3 premiers avec animation | P0 |
| US-6.2 | En tant que **joueur**, je veux voir mon classement et mon score final | P0 |
| US-6.3 | En tant que **joueur**, je veux pouvoir rejouer le même quiz | P1 |
| US-6.4 | En tant que **joueur**, je veux retourner à l'accueil après le quiz | P0 |

---

## 5. Epic Breakdown & Ordre de développement

### Vue d'ensemble

| Epic | Section | Dépendances | Complexité | Priorité |
|------|---------|-------------|------------|----------|
| **Infra** | Transverse | Aucune | M | P0 — Pré-requis |
| **Epic 2** | Création de quiz | Infra | M | P0 — Le contenu doit exister avant le reste |
| **Epic 1** | Accueil | Infra | S | P0 — Point d'entrée |
| **Epic 3** | Lobby | Infra, Epic 2 | M | P0 — Connexion PIN + temps réel |
| **Epic 4** | Écran de jeu (Joueur) | Infra, Epic 3 | L | P0 — Cœur du gameplay |
| **Epic 5** | Écran de jeu (Quizmaster) | Infra, Epic 3 | L | P0 — Cœur du gameplay |
| **Epic 6** | Résultats / Leaderboard | Epic 4, Epic 5 | M | P0 — Fin du flow |

### Ordre de développement recommandé

#### Phase 0 : Infrastructure transverse (pré-requis)
- Setup projet (framework frontend + backend Node.js)
- Serveur WebSocket + gestion des rooms (une room = une partie)
- Système de génération/validation PIN (6 chiffres, unique, expiration)
- Modèle de données : Quiz (titre, questions[]), Question (texte, type, choix[], correcte, timer, scoring, points), Partie (PIN, quizId, joueurs[], état), Joueur (pseudo, avatar, score)
- API REST basique : CRUD quiz, créer/rejoindre partie

**Complexité : M** — Fondation technique, pas de UI

#### Phase 1 : Epic 2 — Création de quiz
- Page éditeur avec sidebar + éditeur principal
- CRUD questions (ajouter, éditer, supprimer, réorganiser)
- Toggle QCM/Vrai-Faux avec validation
- Paramètres par question (timer, scoring, points)
- Import OpenTrivia (appel API, mapping des données, insertion)
- Bouton Lancer → crée une partie + génère un PIN → redirige vers le Lobby

**Complexité : M** — Principalement du CRUD UI, l'import API ajoute un peu de complexité

#### Phase 2 : Epic 1 — Accueil
- Landing page responsive
- Champ PIN 6 chiffres avec auto-focus
- Validation PIN → appel API → redirection vers Lobby (ou erreur)
- Bouton "Créer un quiz" → redirection vers l'éditeur
- Animations et branding (particules, emojis, gradient)

**Complexité : S** — Page simple, peu de logique

#### Phase 3 : Epic 3 — Lobby
- Page lobby avec PIN affiché
- WebSocket : événements join/leave en temps réel
- Grille de joueurs avec animation pop-in
- Bouton "Lancer" (quizmaster uniquement) → signal WebSocket → tous redirigés vers le jeu

**Complexité : M** — Premier usage du WebSocket temps réel

#### Phase 4 : Epic 4 + Epic 5 — Écrans de jeu (en parallèle)
Ces deux écrans partagent la même logique backend (sync question, timer, réponses) :
- **Backend commun :** Timer synchronisé, broadcast question, réception réponses, calcul scores, révélation
- **Joueur :** Vue mobile, sélection réponse, timer, feedback, streak
- **Quizmaster :** Vue projection, compteurs de votes, contrôles (révéler, passer, suivante)

**Complexité : L** — Cœur de l'application, sync temps réel complexe

#### Phase 5 : Epic 6 — Résultats / Leaderboard
- Calcul du classement final (score, puis bonnes réponses, puis temps)
- Podium top 3 avec animations
- Leaderboard complet
- Highlight joueur courant
- Boutons rejouer / accueil

**Complexité : M** — Principalement de l'affichage, le calcul de score est déjà fait

---

## 6. Références visuelles

| Section | Mockup | Description |
|---------|--------|-------------|
| 🏠 Accueil | `mockups/mockup-1-accueil.html` | Landing page dark, PIN 6 chiffres, bouton créer quiz, particules |
| 🎛️ Création de quiz | `mockups/mockup-2-creation-quiz.html` | Sidebar questions + éditeur QCM/Vrai-Faux, import API |
| ⏳ Lobby | `mockups/mockup-3-lobby.html` | PIN visible, grille joueurs animée, bouton lancer |
| 🎮 Écran joueur | `mockups/mockup-4-jeu-joueur.html` | Timer circulaire, 4 boutons colorés, streak, mobile-first |
| 📺 Écran quizmaster | `mockups/mockup-5-jeu-quizmaster.html` | Gros timer, compteurs votes, badge LIVE, contrôles |
| 🏆 Résultats | `mockups/mockup-6-leaderboard.html` | Confettis, podium top 3, leaderboard complet |

**Pitch Deck :** [pitch-deck.html](pitch-deck.html) — Présentation standalone avec tous les mockups embarqués
