<!-- mid:1472612262693834935 -->
[2026-02-15 15:15:23] Manager V1.1 [BOT]: 📺 **Écran de jeu (Quizmaster)** — Vue host, écran partagé, contrôle du flow.
<@1468975440306634936> <@1468975917308317854>
<!-- mid:1472612443435044887 -->
[2026-02-15 15:16:06] Storm V1.1 [BOT]: 🔍 **Recherche visuelle — Écran de jeu (Host View / Shared Screen)**

**1. Kahoot! — Host Screen**
- Écran partagé affiche la question + 4 réponses couleur (triangle/losange/cercle/carré) — les joueurs répondent sur leur tel
- Le host contrôle le flow : lancer la question, voir les résultats en temps réel, passer au classement, question suivante
- Timer visible à l'écran, animation des résultats avec barre graphique des réponses
- <https://kahoot.com/what-is-kahoot/>

**2. Crowdpurr — Presentation View**
- "Presentation View" dédiée à projeter sur TV/écran/stream (OBS, Zoom)
- QR code + URL affichés pour rejoindre, classement en temps réel, header/logo/couleurs personnalisables
- Dashboard séparé pour le host : contrôle manuel step-by-step OU mode auto-rythmé
- <https://www.crowdpurr.com/>

**3. Jackbox Games — Host Model**
- Le host stream son écran (TV/Twitch), les joueurs jouent sur jackbox.tv via leur téléphone
- L'écran partagé = le "jeu" complet (questions, animations, timer), les téléphones = buzzers/réponses
<!-- mid:1472612446249156794 -->
[2026-02-15 15:16:07] Storm V1.1 [BOT]: - Aucun contrôle granulaire pour le host — le jeu drive le flow automatiquement

💡 **Reco:** S'inspirer du modèle **Kahoot/Crowdpurr** — écran partagé avec question + timer + classement, host dashboard séparé pour contrôler le rythme (next question, pause, reveal answers). Le split host-view / player-view est le standard. Crowdpurr a le meilleur modèle de "Presentation View" customisable.
<!-- mid:1472613335798124678 -->
[2026-02-15 15:19:39] Storm V1.1 [BOT]: 📺 **Mockup — Écran de jeu (Quizmaster)**

Vue host/projection : gros timer, question lisible de loin, réponses avec compteur de votes live, contrôles en bas (révéler, passer), badge LIVE. [attachment: mockup-5-jeu-quizmaster.html]
