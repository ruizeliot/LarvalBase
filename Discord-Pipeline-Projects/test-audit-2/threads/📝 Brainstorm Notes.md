<!-- mid:1472608602190647388 -->
[2026-02-15 15:00:50] Manager V1.1 [BOT]: <@1468975440306634936> <@1468975917308317854> — Notes thread ready.
<!-- mid:1472611070840541194 -->
[2026-02-15 15:10:39] NoteBot V1.1 [BOT]: **Step 1 — Concept & Research**

**Concept :** Appli web de pub quiz multijoueur temps réel, style Kahoot.

**Décisions :**
- **Mode de jeu :** Multijoueur temps réel — un quizmaster lance les questions, les joueurs répondent en même temps
- **Connexion :** Code PIN pour rejoindre une partie
- **Source des questions :** Créées manuellement par le quizmaster OU importées via API (type Open Trivia DB)
- **Formats de questions :** QCM (4 choix) + Vrai/Faux
- **Scoring :** Deux modes au choix du quizmaster — points basés sur la vitesse de réponse OU points fixes (bonne/mauvaise)
- **Rôles :** Quizmaster (crée/gère la session) + Joueurs (rejoignent et répondent)
- **Plateforme :** Web uniquement
<!-- mid:1472612335008092294 -->
[2026-02-15 15:15:40] NoteBot V1.1 [BOT]: **Step 2A — Section Breakdown**

6 sections validées :
1. 🏠 Accueil → <#1472612198206541969>
2. 🎛️ Création de quiz → <#1472612204485284033>
3. ⏳ Lobby → <#1472612205982650570>
4. 🎮 Écran de jeu (Joueur) → <#1472612206821642435>
5. 📺 Écran de jeu (Quizmaster) → <#1472612208813932604>
6. 🏆 Résultats / Leaderboard → <#1472612209883484392>
<!-- mid:1472614299594920127 -->
[2026-02-15 15:23:28] NoteBot V1.1 [BOT]: **Step 2B — Deep-Dive (Demo Mode)**

6 sections mockupées par Storm en batch, toutes validées sans modifications.

**Sections :**
1. 🏠 Accueil → <#1472612198206541969> — Landing page, PIN input, bouton créer quiz. Dark theme pub.
2. 🎛️ Création de quiz → <#1472612204485284033> — Éditeur de questions QCM/vrai-faux, import API, choix scoring.
3. ⏳ Lobby → <#1472612205982650570> — Salle d'attente, code PIN affiché, liste joueurs en temps réel, bouton Start.
4. 🎮 Écran de jeu (Joueur) → <#1472612206821642435> — Vue joueur : timer, question, 4 boutons couleur, feedback.
5. 📺 Écran de jeu (Quizmaster) → <#1472612208813932604> — Vue host projetée : question, compteur réponses, timer, contrôle Next.
6. 🏆 Résultats / Leaderboard → <#1472612209883484392> — Leaderboard animé, podium top 3, scores individuels.

**Décisions :**
Aucune modification demandée — mockups validés tels quels en première passe.
