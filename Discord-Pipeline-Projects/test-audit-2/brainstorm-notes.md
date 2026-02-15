# Brainstorm Notes — QuizPub (test-audit-2)

## Configuration
- **Langue :** Français
- **Style :** Décontracté 😄
- **Phase :** Brainstorm
- **Date :** 2026-02-15
- **Projet :** Nouveau (Path A — from scratch)

---

## Step R — Router

**Type de projet :** Nouveau projet (Path A — from scratch)

Aucun projet existant, aucune itération. Brainstorm complet depuis zéro.

---

## Step 1 — Concept & Research

### 1.1 Concept validé

**QuizPub** — Appli web de pub quiz multijoueur temps réel, style Kahoot. Un quizmaster crée un quiz, les joueurs rejoignent via code PIN et répondent aux questions en temps réel depuis leur navigateur.

### 1.2 Décisions prises

| # | Décision | Choix retenu | Alternatives considérées | Raisonnement |
|---|----------|-------------|--------------------------|--------------|
| 1 | **Mode de jeu** | Multijoueur temps réel — un quizmaster lance les questions, les joueurs répondent en même temps | **Solo** (chaque joueur à son rythme, style Trivia Crack) — rejeté : pas l'esprit pub quiz. **Les deux** — rejeté : complexité inutile pour MVP | Le pub quiz est fondamentalement social et synchrone. Le mode temps réel avec quizmaster est le cœur de l'expérience. |
| 2 | **Connexion des joueurs** | Code PIN pour rejoindre une partie | **Lien partageable** — rejeté : le PIN est plus simple et universel (modèle Kahoot éprouvé). **Les deux** — non proposé | Le PIN est le standard du genre (Kahoot, Mentimeter). Facile à dicter à l'oral dans un bar/pub. |
| 3 | **Source des questions** | Créées manuellement par le quizmaster OU importées via API (Open Trivia DB) | **Manuelles uniquement** — rejeté : l'import API ajoute de la flexibilité. **API uniquement** — rejeté : le quizmaster veut du custom | La double source est un différenciateur vs Kahoot (qui réserve l'import aux plans payants). |
| 4 | **Formats de questions** | QCM (4 choix) + Vrai/Faux | **QCM + Vrai/Faux + Réponse libre** — rejeté : la réponse libre est complexe à évaluer automatiquement en temps réel | Deux formats suffisent pour un MVP. Le vrai/faux ajoute de la variété sans complexité. |
| 5 | **Scoring** | Deux modes au choix du quizmaster : points basés sur la vitesse de réponse OU points fixes (bonne/mauvaise) | **Vitesse uniquement** — rejeté : certains préfèrent le mode classique sans pression temps. **Points fixes uniquement** — rejeté : le mode vitesse ajoute du fun et de la tension | La flexibilité scoring est un différenciateur. Le quizmaster adapte selon l'ambiance (compétitif vs détendu). |
| 6 | **Rôles** | Quizmaster (crée/gère la session) + Joueurs (rejoignent et répondent) | **Rôle unique** — rejeté : le pub quiz nécessite un host qui gère le rythme | Le split host/joueur est le standard du genre. |
| 7 | **Plateforme** | Web uniquement | **Mobile natif** — rejeté : le web suffit et est accessible partout sans installation. **Web + mobile** — non proposé | Le web mobile-first couvre tous les devices. Pas de friction d'installation — ouvrir un navigateur suffit. |

### 1.3 Recherche de références

Storm a identifié 4 références clés :

| # | Référence | URL | Points clés | Pertinence pour QuizPub |
|---|-----------|-----|-------------|------------------------|
| 1 | **Kahoot!** | https://kahoot.com | Flow PIN → lobby → sync, UX ultra simple, écran partagé host + mobile, bibliothèque communautaire, freemium | **Référence principale** — le flow à reproduire (PIN, lobby, questions synchronisées, leaderboard). Standard du genre. |
| 2 | **TriviaNerd** | https://trivianerd.com | Orienté pub quiz spécifiquement, hosting de soirées trivia en live, création de quiz custom + sessions multijoueur | **Vibe pub** — plus niche que Kahoot, focalisé sur l'expérience bar. Inspiration pour le ton et l'ambiance. |
| 3 | **AhaSlides** | https://ahaslides.com | Alternative Kahoot plus abordable, leaderboard temps réel, QCM + vrai/faux, rejoindre par code, interface clean et moderne | **Inspiration UI** — interface plus moderne et clean que Kahoot. Bon modèle pour le design. |
| 4 | **Mentimeter** | https://mentimeter.com | Quiz temps réel intégré dans un outil de présentation interactive, résultats live sur écran du host (leaderboard animé) | **Écran partagé** — bon modèle pour l'aspect projection/écran partagé. |

**Différenciateur QuizPub :** Scoring flexible (vitesse OU fixe au choix du quizmaster) + import gratuit via Open Trivia DB — deux features que Kahoot réserve à ses plans payants.

**Orientation retenue :** S'inspirer du flow Kahoot (PIN → lobby → questions synchronisées → leaderboard) avec une UI plus moderne (AhaSlides) et la vibe pub (TriviaNerd).

### 1.4 Recherches additionnelles (Storm — section Joueur)

Pour l'écran de jeu joueur, Storm a trouvé des références complémentaires :

| Référence | Points clés |
|-----------|-------------|
| **Kahoot! (écran joueur)** | Question plein écran + 4 choix colorés avec icônes, timer circulaire, feedback immédiat vert/rouge |
| **HQ Trivia** | Timer 10s avec barre de progression, design épuré mobile-first, fond sombre + couleurs vives |
| **Trivia Crack** | Roue de catégories, 4 réponses texte, feedback animé |
| **QuizUp** | Vue duel avec avatars, question centrée + 4 choix, score temps réel |

**Recommandation retenue :** Modèle Kahoot — question lisible en haut, 4 blocs colorés (gros boutons tactiles), timer circulaire animé. Le code couleur par réponse rend l'écran intuitif.

### 1.5 Recherches additionnelles (Storm — section Quizmaster)

Pour l'écran host/projection :

| Référence | Points clés |
|-----------|-------------|
| **Kahoot! (host screen)** | Question + 4 réponses couleur, host contrôle le flow, timer visible, animation résultats avec barres |
| **Crowdpurr** | "Presentation View" dédiée projection (TV/stream), QR code + URL, classement temps réel, dashboard séparé |
| **Jackbox Games** | Host stream son écran, joueurs sur mobile, flow automatique (pas de contrôle granulaire host) |

**Recommandation retenue :** Modèle Kahoot/Crowdpurr — écran partagé avec question + timer + classement, host dashboard séparé pour contrôler le rythme (next question, pause, reveal answers).

---

## Step 2A — Section Breakdown

### Sections validées (6)

Les 6 sections ont été proposées par le Manager et acceptées en première proposition, sans modification :

| # | Section | Description | Thread Discord |
|---|---------|-------------|----------------|
| 1 | 🏠 **Accueil** | Landing page, rejoindre une partie (PIN) ou en créer une | `1472612198206541969` |
| 2 | 🎛️ **Création de quiz** | Le quizmaster crée ses questions (QCM, vrai/faux) ou importe via API | `1472612204485284033` |
| 3 | ⏳ **Lobby** | Salle d'attente après le PIN, les joueurs arrivent, le quizmaster lance | `1472612205982650570` |
| 4 | 🎮 **Écran de jeu (Joueur)** | Question, choix de réponse, timer — vue mobile-first | `1472612206821642435` |
| 5 | 📺 **Écran de jeu (Quizmaster)** | Vue host, écran partagé pour projection, contrôle du flow | `1472612208813932604` |
| 6 | 🏆 **Résultats / Leaderboard** | Scores temps réel, classement final, podium | `1472612209883484392` |

**Note :** Aucune section ajoutée, supprimée ou modifiée. L'utilisateur a validé la proposition initiale telle quelle.

---

## Step 2B — Deep-Dive (Demo Mode)

**Mode choisi :** Demo mode — Storm génère tous les 6 mockups en batch, validation rapide sans itérations.

**Résultat :** Les 6 mockups ont été validés tels quels en première passe, sans aucune modification demandée.

### Section 1 : 🏠 Accueil
- **Mockup :** `mockups/mockup-1-accueil.html`
- **Éléments clés :**
  - Logo QuizPub avec gradient animé (rouge/orange) en police Fredoka One
  - Champ PIN 6 chiffres avec auto-focus sur le chiffre suivant (JavaScript)
  - Bouton "Rejoindre la partie" (gradient rouge, box-shadow)
  - Séparateur "ou"
  - Bouton "Créer un quiz" (orange, style outline)
  - Dark theme (#1a1a2e) avec particules flottantes et emojis bière/cerveau/cible qui montent en animation
  - Background avec radial-gradient et cercles colorés flous
  - Footer "QuizPub v1.0 — Fait pour les soirées entre potes"
- **Validation :** Accepté sans modifications

### Section 2 : 🎛️ Création de quiz
- **Mockup :** `mockups/mockup-2-creation-quiz.html`
- **Éléments clés :**
  - Layout sidebar (300px) + main : sidebar liste des questions numérotées, main éditeur
  - Header sticky avec logo, bouton retour, boutons Preview et Lancer
  - Éditeur : champ question texte, toggle QCM (4 choix) / Vrai-Faux
  - Grille 2x2 de 4 réponses colorées (A rouge #e94560, B bleu #2d9cdb, C orange #f5a623, D vert #27ae60) avec checkbox correcte
  - Paramètres par question : timer (select 10/20/30/60s), scoring (rapidité/fixe), points (1000)
  - Actions : supprimer / sauvegarder
  - Section import API OpenTrivia en bas de sidebar (bouton avec icône 📥)
  - 5 questions exemples pré-remplies dans la sidebar
- **Validation :** Accepté sans modifications

### Section 3 : ⏳ Lobby
- **Mockup :** `mockups/mockup-3-lobby.html`
- **Éléments clés :**
  - Top bar avec logo QuizPub + PIN code bien visible (gros, orange #f5a623, police Fredoka One, "420 691")
  - Texte "En attente de joueurs..." + compteur "8 joueurs connectés" en gros
  - Grille flex de joueurs avec avatars emoji + noms (8 joueurs exemples : DJ Bière, BrainMaster, QuizKiller, etc.)
  - Animation pop-in (cubic-bezier) à l'arrivée de chaque joueur
  - Dots d'attente animés (3 points qui pulsent)
  - Bouton "Lancer la partie !" vert (#27ae60) avec effet shine (bande lumineuse qui passe)
  - Infos quiz en bas : 10 questions, 20s par question, scoring rapidité
  - Background glows (rouge et bleu) en cercles flous
- **Validation :** Accepté sans modifications

### Section 4 : 🎮 Écran de jeu (Joueur)
- **Mockup :** `mockups/mockup-4-jeu-joueur.html`
- **Éléments clés :**
  - Top bar : compteur questions (3/10) + score cumulé (2,450 pts en Fredoka One)
  - Barre de progression timer (linéaire, gradient vert→orange)
  - Timer circulaire animé (13s) avec spinner (border-top qui tourne)
  - Carte question centrée avec texte (1.4rem, fond semi-transparent)
  - Grille 2x2 de boutons réponse colorés (A/B/C/D) avec lettre + texte, min-height 80px
  - Animation sélection : classe `.selected` avec pulse + checkmark ✓
  - Indicateur streak en bas ("🔥 3 bonnes réponses d'affilée !")
  - Vue mobile-first (max-width 600px, margin auto)
  - Interactif : click pour sélectionner une réponse (JavaScript)
- **Validation :** Accepté sans modifications

### Section 5 : 📺 Écran de jeu (Quizmaster)
- **Mockup :** `mockups/mockup-5-jeu-quizmaster.html`
- **Éléments clés :**
  - Host bar : logo + badge "Quizmaster" (rouge, uppercase) + progression questions (3/10)
  - Timer strip coloré (gradient vert → orange → rouge)
  - Affichage principal : gros timer (6rem, Fredoka One, text-shadow doré), question bien lisible (2.2rem)
  - 4 blocs réponse avec compteur de votes live (nombre de joueurs par réponse, ex: "3 👤", "4 👤")
  - Badge LIVE animé (point rouge clignotant + "LIVE — 8 joueurs") en position fixe top-right
  - Barre de contrôles en bas : stats joueurs (nombre, réponses, % bonnes rép.) + boutons "Passer" et "Révéler la réponse"
  - Vue optimisée pour projection (gros texte, lisible de loin, background très sombre #0d0d1a)
- **Validation :** Accepté sans modifications

### Section 6 : 🏆 Résultats / Leaderboard
- **Mockup :** `mockups/mockup-6-leaderboard.html`
- **Éléments clés :**
  - Confettis animés (9 éléments colorés qui tombent en boucle)
  - Header : logo + titre "🏆 Résultats finaux" (gradient Fredoka One) + sous-titre quiz
  - Podium top 3 : disposition 2e (argent, gauche) — 1er (or, centre, couronne 👑 animée bounce) — 3e (bronze, droite)
  - Barres podium de hauteurs différentes (140px/100px/80px) avec gradients métalliques
  - Leaderboard complet (4e et au-delà) : rang, avatar emoji, nom, bonnes réponses (X/10), score
  - Highlight du joueur courant (5e : "HotAnswer ← Toi") avec fond rouge subtil
  - 8 joueurs au total dans le classement
  - Boutons : "Rejouer" (rouge gradient) + "Accueil" (gris outline)
- **Validation :** Accepté sans modifications

---

## Résumé des décisions transverses

### Design system (issu des mockups)
- **Palette :** Dark theme #1a1a2e (principal) / #0d0d1a (quizmaster), rouge #e94560, orange #f5a623, bleu #2d9cdb, vert #27ae60
- **Typographie :** Fredoka One (titres, logo, scores, timer) + Inter (corps, boutons, labels)
- **Couleurs réponses :** A = rouge, B = bleu, C = orange, D = vert — cohérent sur tous les écrans
- **Coins arrondis :** 10-20px selon les éléments
- **Effets :** Backdrop-filter blur, box-shadow colorés, gradients animés, particules flottantes

### Architecture implicite (déduite des mockups)
- **Flow utilisateur :** Accueil → [Créer quiz / Rejoindre via PIN] → Lobby → Jeu → Résultats
- **Communication :** WebSocket nécessaire pour sync temps réel (lobby, questions, timer, réponses, scores)
- **Deux vues simultanées pendant le jeu :** Joueur (mobile) + Quizmaster (projection)
- **Pas de compte utilisateur :** Juste un pseudo pour les joueurs, le quizmaster accède directement à l'éditeur

---

## Impacts cross-sections

| Impact | Sections concernées | Détail |
|--------|-------------------|--------|
| **Code PIN** | Accueil → Lobby | Le PIN saisi en Accueil doit correspondre à celui affiché dans le Lobby |
| **Mode scoring** | Création → Jeu (Joueur) → Résultats | Le choix rapidité/fixe dans l'éditeur impacte le calcul de score en jeu et l'affichage final |
| **Timer** | Création → Jeu (Joueur) → Jeu (Quizmaster) | Le timer par question défini dans l'éditeur s'affiche sur les deux écrans de jeu |
| **Nombre de joueurs** | Lobby → Jeu (Quizmaster) → Résultats | Le compteur de joueurs est présent partout, doit être synchronisé en temps réel |
| **Questions** | Création → Jeu (les deux écrans) | Les questions créées dans l'éditeur sont affichées identiquement sur les deux écrans |
| **Scores** | Jeu (Joueur) → Résultats | Le score cumulé du joueur est affiché en temps réel pendant le jeu et récapitulé dans le leaderboard |
| **Palette couleurs** | Toutes | Les 4 couleurs de réponse (ABCD) sont cohérentes sur l'éditeur, l'écran joueur et l'écran quizmaster |

---

## Feedback utilisateur (notes méta-workflow)

L'utilisateur a noté plusieurs points d'amélioration du workflow lui-même (pas du projet QuizPub) :

1. **Bandeau de step** — devrait être plus visible (séparateurs visuels type `═══════`)
2. **Recherche "visuelle"** — devrait s'appeler "recherche de références" (plus exact)
3. **Post-recherche** — devrait demander quelle référence privilégier avant d'avancer
4. **Transitions automatiques** — entre steps devraient envoyer un message d'introduction automatique
5. **Pitch deck** — ne devrait pas être construit progressivement, il est compilé à la fin (Step 3) par Claude Code
6. **Thread Pitch Deck** — jugé inutile, chaque mockup est déjà dans son thread section
7. **Template CC** — le template de compilation Claude Code devrait être pré-défini
8. **Questions multiples** — plus de choix dans les questions (ex: sélection multiple de features)
9. **Indicateur de progression** — devrait indiquer dans quel sous-état on se trouve (Phase > Step > Sub-step)
10. **Webhook CC** — Claude Code devrait poster dans le channel du projet (pas seulement #général)
11. **Kill CC** — le manager ne devrait tuer que l'instance CC spécifique au channel, pas toute instance CC existante

Ces notes sont des retours sur le pipeline, pas sur QuizPub lui-même.
