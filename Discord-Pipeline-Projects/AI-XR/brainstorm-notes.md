# AI-XR — Brainstorm Notes (COMPLETE)

**Project**: Assistant IA en realite mixte (XR) pour Meta Quest 3
**Engine**: Unity 6 + URP 17 + Meta OpenXR 2.0.1
**User Profile**: Developer
**Strategy**: Direct (A) — no exploratory divergence, straight to validated specs
**Layout Mode**: Mix (C) — 3D spatial panels for visual user stories, flat panels for technical user stories
**Mockup Style**: 14 navigable sections (US-1 through US-9 + EC-1 through EC-5), one visual per user story

---

## 1. Project Concept

Assistant IA en realite mixte (XR) pour Meta Quest 3, construit dans Unity. Interaction vocale temps reel via pipeline configurable STT (Speech-to-Text) vers LLM (Large Language Model) vers TTS (Text-to-Speech). Trois modes d'incarnation de l'assistant: avatar 3D (Ready Player Me), orbe lumineux, ou invisible.

### Base Technique

Fork cible du projet **PodGab** existant (projet recherche Mines d'Albi). PodGab dispose deja d'un pipeline complet avec STT/LLM/TTS/Vision/RAG cables. Les composants reutilises depuis PodGab sont:

- **AIManager** — Orchestration du pipeline IA
- **AIEntity** — Representation de l'entite IA dans la scene
- **SmartObjects** — Objets interactifs conscients du contexte
- **CameraFeedDisplay** — Affichage du flux camera
- **MicrophoneRecorder** — Capture audio microphone
- **LocalLLMRequestHandler** — Gestion des requetes LLM locales

Ce fork cible signifie qu'on ne prend pas tout PodGab, mais uniquement les briques necessaires au pipeline vocal et vision.

---

## 2. Key Decisions

### 2.1 Architecture Communication

- **Decision**: Hybride — MCP (unity-mcp) en dev/editeur + API custom en runtime XR sur casque
- **Reasoning**: MCP est parfait pour iterer rapidement dans l'editeur Unity (acces a la hierarchie, commandes, build pipeline), mais il est trop lourd pour un runtime standalone sur Quest 3. En production sur le casque, on utilise des appels API custom directs (HTTP/REST).
- **Implication**: Deux chemins de communication distincts a maintenir, mais le code applicatif reste identique grace aux interfaces provider abstraites.

### 2.2 Providers STT/LLM/TTS

- **Decision**: 3 slots par brique — Cloud principal, Cloud backup, Local — selectionnes manuellement dans les settings
- **PAS de fallback automatique entre providers** — l'utilisateur choisit et active manuellement le provider qu'il souhaite utiliser
- **Retry automatique optionnel** (configurable dans settings) sur le provider actif uniquement
- **Interfaces provider abstraites**: `ISTTProvider`, `ILLMProvider`, `ITTSProvider`, `IVisionProvider`
- **Reasoning**: Le fallback automatique ajoute de la complexite (quel ordre? quels criteres?) et masque les problemes. Mieux vaut que le developpeur controle explicitement son provider actif et configure le retry a sa convenance.

#### Options rejetees
- Fallback automatique en cascade (Cloud principal -> Cloud backup -> Local) — rejete car trop complexe pour V1, masque les erreurs, et le developpeur prefere le controle explicite
- Provider unique sans backup — rejete car trop fragile pour le developpement iteratif

### 2.3 Incarnation

- **Decision**: 3 modes — Avatar RPM, Orbe, Invisible — switch manuel dans settings
- **Pas de switch contextuel automatique** (pas de changement de mode selon le contexte ou l'activite)
- **Cosmetique uniquement** — aucun impact sur le pipeline AI. Le mode d'incarnation ne change que la representation visuelle, pas le comportement du STT/LLM/TTS/Vision.
- **Reasoning**: Garder la complexite basse en V1. Le switch automatique necessiterait des heuristiques (quand passer en invisible? quand afficher l'avatar?) qui ne sont pas matures.

### 2.4 Perception (Vision)

- **Decision**: V1 = Vision on-demand uniquement
- Pipeline: Screenshot via `WebCamTexture` envoye au VLM (Vision Language Model) qui retourne une reponse contextuelle
- Image envoyee **telle quelle** au VLM — pas de quality check cote client (pas de detection de flou, luminosite, etc.)
- **OUT OF SCOPE V1**:
  - Memoire visuelle passive (l'IA ne "se souvient" pas de ce qu'elle a vu)
  - RAG temporel (pas d'indexation temporelle des captures visuelles)
  - Resume progressif des observations visuelles
  - Passthrough MR composite (pas de fusion entre flux camera et contenu virtuel pour le VLM)
  - Eye tracking (pas d'utilisation du regard pour guider la capture)

### 2.5 Interaction Vocale

- **Decision**: V1 = Push-to-talk (bouton controller ou hand gesture)
- **OUT OF SCOPE V1**:
  - VAD (Voice Activity Detection) — detection automatique de la parole
  - Wake word (mot declencheur type "Hey assistant")
- **Reasoning**: PTT est fiable et predictible. VAD introduit des faux positifs/negatifs qui degradent l'experience.

### 2.6 Pipeline Audio

- **Decision**: V1 = Reponse complete (LLM full generation puis TTS full conversion puis lecture audio)
- Le LLM genere sa reponse en entier, puis le TTS convertit le texte complet en audio, puis l'audio est lu
- **OUT OF SCOPE V1**:
  - Streaming chunked (decoupe de la reponse LLM en morceaux envoyes au TTS au fur et a mesure)
  - Full streaming TTS (lecture audio en temps reel pendant la generation)
- **Implication latence**: Cycle complet sans streaming = 5-15 secondes de latence percue. Mitigation: thinking bubbles + timer visuel pour feedback utilisateur.

### 2.7 Contexte Conversationnel

- **Decision**: Fenetre glissante de N derniers messages
- Pas de persistance entre sessions (quand l'app redamarre, le contexte est vide)
- N est configurable dans les settings
- **Reasoning**: Simple, predictible, pas de stockage a gerer. La persistance entre sessions necessiterait du stockage local + gestion de la taille du contexte, trop complexe pour V1.

### 2.8 Agentivite MR

- **Decision**: Approche progressive
- V1 = observe + overlay (l'IA peut observer l'environnement et afficher des informations en overlay, mais ne peut pas agir dans le monde)
- Full agent en V2+ (manipulation d'objets, navigation autonome, etc.)
- **Reasoning**: L'agentivite complete en MR est un sujet de recherche ouvert. V1 se concentre sur le pipeline de communication fiable.

### 2.9 Hardware

- **Decision**: Meta Quest 3 et Quest 3S uniquement en V1
- Pas de support Quest 2, Quest Pro, ou autres casques XR
- **Reasoning**: Quest 3/3S partagent le meme chipset (Snapdragon XR2 Gen 2), meme SDK, meme capacites MR (passthrough couleur, hand tracking). Cibler un seul hardware simplifie le test et l'optimisation.

---

## 3. Sections (Epics)

### 3.1 Epic 1 — Core Architecture & Provider System

**Status**: VALIDATED

**User Stories**:

#### US-1: Provider Config
Interface abstraite pour les 4 briques du pipeline AI:
- `ISTTProvider` — Interface Speech-to-Text
- `ILLMProvider` — Interface Large Language Model
- `ITTSProvider` — Interface Text-to-Speech
- `IVisionProvider` — Interface Vision Language Model

Chaque interface definit: `Initialize()`, `Process()`, `Dispose()`, `IsAvailable()`, `GetStatus()`.

Settings UI spatiale avec 4 briques x 3 slots chacune:
- Slot 1: Cloud principal (ex: OpenAI Whisper, GPT-4, ElevenLabs, GPT-4V)
- Slot 2: Cloud backup (ex: Deepgram, Claude, Azure TTS, Claude Vision)
- Slot 3: Local (ex: Whisper.cpp, Ollama, Piper TTS, LLaVA local)

Selection manuelle par l'utilisateur — pas de fallback automatique.

#### US-2: Error & Retry
- Notifications UI avec code erreur (HTTP status, timeout, provider-specific)
- Boutons Retry/Dismiss sur chaque notification
- Retry optionnel configurable par provider dans les settings (nombre de tentatives, delai entre tentatives)
- Le retry ne s'applique que sur le provider actuellement actif

#### US-3: Degradation par brique
Chaque brique a un comportement de degradation independant quand son provider actif est indisponible:
- **STT indisponible** → Fallback vers clavier virtuel (saisie texte)
- **LLM indisponible** → Message pre-enregistre joue via TTS (reponse generique)
- **TTS indisponible** → Texte affiche sur HUD (lecture visuelle)
- **Vision indisponible** → Feature desactivee (bouton grise, aucune fallback visuelle)

La degradation est **automatique par brique** — si le STT echoue, seul le STT bascule en mode degrade, les autres briques continuent de fonctionner normalement.

**Mockup**: Valide — 3 panneaux spatiaux: Architecture (vue pipeline), Provider Settings (grille 4x3), Error & Degradation (notifications + fallbacks)

---

### 3.2 Epic 2 — Voice Pipeline STT -> LLM -> TTS

**Status**: VALIDATED

**User Stories**:

#### US-4: PTT Voice (Push-to-Talk)
- V1: Push-to-talk uniquement
- Declenchement par bouton controller (trigger) ou hand gesture
- Pas de VAD (Voice Activity Detection)
- Pas de wake word
- **Bouton PTT desactive pendant le traitement** (anti-spam, voir EC-4)
- Pipeline complet: STT full → LLM full → TTS full → lecture audio (pas de streaming)

#### US-5: Sliding Window Context
- Fenetre glissante des N derniers messages (N configurable)
- Pas de persistance entre sessions
- Le contexte inclut les messages utilisateur ET les reponses de l'IA
- Format: liste de paires (role, content) envoyee au LLM

**Feedback Pattern** (herite de PodGab):
5 etats de feedback visuels:
1. **Ready** — L'assistant attend une interaction
2. **Recording** (ring pulse) — L'utilisateur parle, animation de pulse sur l'indicateur
3. **Transcribing** — Le STT traite l'audio
4. **Thinking** (dots animees) — Le LLM genere sa reponse
5. **Talking** (sound wave) — Le TTS lit la reponse audio

- Thinking bubbles animees pendant l'attente
- Timer visible pour indiquer le temps ecoule
- Status text pour indiquer l'etape courante
- **Pas de timeout** — on attend la reponse aussi longtemps que necessaire (pattern PodGab)

**Mockup**: Valide — 3 panneaux: Voice Pipeline (flux STT→LLM→TTS), Context Window (historique glissant), Feedback States (5 etats visuels)

---

### 3.3 Epic 3 — AI Incarnation System

**Status**: VALIDATED

**User Story**:

#### US-6: Incarnation Switch
3 modes selectionnables, switch manuel dans settings:

**Mode 1: Avatar RPM (Ready Player Me)**
- Modele 3D charge depuis Ready Player Me
- Lip sync via visemes (synchronisation labiale avec l'audio TTS)
- Bras animes avec gestes de base (idle, talking, pointing)
- Ancrage spatial dans la piece (position fixe ou suiveur)

**Mode 2: Orbe**
- Glow volumetrique (sphere lumineuse avec effet de profondeur)
- 4 couleurs d'etat:
  - **Bleu** = Thinking (reflexion en cours)
  - **Vert** = Speaking (lecture audio)
  - **Orange** = Listening (enregistrement vocal)
  - **Gris** = Idle (attente)
- Particules ambiantes autour de l'orbe

**Mode 3: Invisible**
- Cercle dashed au sol (indicateur de position discret)
- HUD monospace avec transcript live (texte de la conversation en temps reel)
- Minimal footprint — quasi-invisible dans l'environnement MR

**Mecaniques**:
- Switch manuel dans Settings UI (pas de switch automatique contextuel)
- Cosmetique uniquement — aucun impact sur le pipeline AI
- Selecteur flottant spatial positionnable dans la room (panneau UI 3D deplacable)

**Mockup**: Valide — 4 panneaux: Avatar (RPM avec lip sync), Orbe actif (4 etats couleur), Invisible (cercle + HUD), Settings selecteur (UI de choix)

---

### 3.4 Epic 4 — Vision On-Demand

**Status**: VALIDATED

**User Story**:

#### US-7: Vision On-Demand
Screenshot `WebCamTexture` envoye au VLM, reponse vocale contextuelle.

**Pipeline Vision**:
1. User trigger (bouton controller A ou hand gesture) → Crosshair + corners verts en POV (indicateur de visee)
2. Screenshot capture → Flash visuel feedback (confirmation de capture)
3. `WebCamTexture` envoyee **telle quelle** au VLM (pas de preprocessing, pas de quality check)
4. Overlay: Thinking bubbles + timer pendant l'analyse VLM
5. Reponse flottante au-dessus de l'incarnation (texte + lecture TTS vocale)

**Edge Cases lies**:
- EC-2: Image degradee → Envoi tel quel au VLM (pas de quality check cote client)
- EC-3: Long VLM Wait → Thinking bubbles + timer (pattern PodGab), pas de timeout

**OUT OF SCOPE V1**:
- Memoire visuelle passive
- RAG temporel
- Passthrough MR composite / fusion visuelle
- Quality check / redaction client-side
- Eye tracking pour guider la capture

**Mockup**: Valide — 3 panneaux: Capture (crosshair + flash), VLM Analysis (overlay thinking), Vision Pipeline (flux complet)

---

### 3.5 Epic 5 — XR Integration & MR Setup

**Status**: VALIDATED

**User Stories**:

#### US-8: Unity MCP Editor
- unity-mcp pour dev/editeur uniquement (pas en runtime Quest)
- Acces a la hierarchie de scene Unity
- Commandes editeur (create, modify, delete GameObjects)
- Build pipeline integre (Editor → MCP Test → Android Build → APK Sign → Quest Deploy)

#### US-9: Spatial Anchor MR
- Passthrough MR actif (environnement reel visible a travers le casque)
- Avatar ancre avec spatial anchor (position fixe dans l'espace reel)
- Hand tracking avec 8 joints verts + ray (visualisation de la main tracquee)
- Controller mapping:
  - **Trigger** = PTT (Push-to-Talk)
  - **A** = Vision capture
  - **Grip/Pinch** = Grab (saisie d'objets UI)
  - **Index** = Point (pointage/interaction)

**Edge Cases lies**:
- EC-1: Total Provider Failure → degradation par brique automatique
- EC-4: Request Spam → PTT disabled pendant processing
- EC-5: Network Failure → notification erreur + retry optionnel, PAS de fallback automatique

**Build Pipeline**:
Editor → MCP Test → Android Build → APK Sign → Quest Deploy

**Mockup**: Valide — 2 panneaux: MR Scene (passthrough + avatar ancre + hand tracking), Unity Editor + MCP (vue editeur avec panneau MCP)

---

## 4. Edge Cases Summary

| ID | Scenario | Comportement |
|----|----------|-------------|
| EC-1 | Total Provider Failure | Degradation par brique automatique (chaque brique bascule independamment) |
| EC-2 | Image degradee (floue, sombre) | Envoi tel quel au VLM — pas de quality check cote client |
| EC-3 | Long VLM Wait | Thinking bubbles + timer (pattern PodGab), pas de timeout |
| EC-4 | Request Spam (appuis repetes PTT) | PTT desactive pendant le processing (bouton grise) |
| EC-5 | Network Failure | Notification erreur + retry optionnel, PAS de fallback auto entre providers |

---

## 5. Cross-Section Impacts

### Provider System (Epic 1) → All Epics
- Les interfaces `ISTTProvider`, `ILLMProvider`, `ITTSProvider`, `IVisionProvider` sont le socle utilise par tous les autres epics
- Le systeme de degradation par brique (US-3) impacte le comportement de tous les pipelines en aval

### Voice Pipeline (Epic 2) → Incarnation (Epic 3)
- Les 5 etats de feedback (Ready, Recording, Transcribing, Thinking, Talking) pilotent directement les animations de l'incarnation:
  - Avatar RPM: lip sync actif pendant Talking, idle pendant Ready
  - Orbe: couleur change selon l'etat (bleu/vert/orange/gris)
  - Invisible: transcript HUD mis a jour pendant Talking

### Vision (Epic 4) → Voice Pipeline (Epic 2)
- La reponse VLM est injectee dans le pipeline vocal (texte VLM → TTS → lecture audio)
- La capture vision utilise le meme systeme de feedback (thinking bubbles + timer)

### XR Integration (Epic 5) → All Epics
- Le passthrough MR et le spatial anchoring sont les fondations visuelles pour l'incarnation (Epic 3)
- Le controller mapping definit les interactions physiques pour le PTT (Epic 2) et la vision capture (Epic 4)
- Le MCP editor (US-8) facilite le developpement de tous les epics mais n'est pas present en runtime

### Degradation en cascade
Si le reseau tombe:
1. STT echoue → bascule clavier virtuel (l'utilisateur peut encore taper)
2. LLM echoue → message pre-enregistre joue via TTS
3. TTS echoue → texte affiche sur HUD
4. Vision echoue → feature desactivee

Chaque brique bascule **independamment** — il n'y a pas de "mode degrade global".

---

## 6. Feasibility Check

- **Verdict**: Projet faisable en V1
- **No showstoppers** identifies

### Heads-ups

1. **Latence percue**: Cycle complet sans streaming = 5-15 secondes. Mitigation: thinking bubbles + timer + status text. Le streaming est prevu pour V2.

2. **Memoire Quest 3**: 8 GB partages entre le rendu graphique (URP + passthrough) + 3 connexions HTTP simultanees (STT, LLM, TTS) + WebCamTexture pour la vision. **Action**: Profiler tot avec le Memory Profiler Unity pour identifier les goulots d'etranglement.

3. **Couts API cloud**: Pay-per-use pour chaque provider cloud (OpenAI, ElevenLabs, Deepgram, etc.). **Action**: Prevoir un budget de test et monitorer la consommation.

### Stack Technique Validee
- Unity 6 + URP 17 + Meta OpenXR 2.0.1 — stack mature et stable
- Ready Player Me SDK — integration Unity documentee
- Quest 3 passthrough — API Meta stable depuis le SDK 68+

---

## 7. Build Order & Dependencies

```
Epic 1 (Core Architecture & Provider System)
    |
    v
Epic 2 (Voice Pipeline STT → LLM → TTS)
    |
    +---> Epic 3 (Incarnation System)     [parallelisable]
    +---> Epic 4 (Vision On-Demand)        [parallelisable]
    +---> Epic 5 (XR Integration & MR)     [parallelisable]
```

- **Epic 1 est la fondation** — toutes les interfaces provider doivent exister avant de coder les pipelines
- **Epic 2 depend d'Epic 1** — le pipeline vocal utilise les providers STT/LLM/TTS
- **Epics 3, 4, 5 sont parallelisables** apres Epic 2 — ils consomment le pipeline sans le modifier

---

## 8. Mockup Files

| File | Epic | Content |
|------|------|---------|
| `mockups/mockup-core-architecture.html` | Epic 1 | 3 panneaux: Architecture, Provider Settings, Error & Degradation |
| `mockups/mockup-voice-pipeline.html` | Epic 2 | 3 panneaux: Voice Pipeline, Context Window, Feedback States |
| `mockups/mockup-incarnation.html` | Epic 3 | 4 panneaux: Avatar, Orbe actif, Invisible, Settings selecteur |
| `mockups/mockup-vision.html` | Epic 4 | 3 panneaux: Capture, VLM Analysis, Vision Pipeline |
| `mockups/mockup-xr-integration.html` | Epic 5 | 2 panneaux: MR Scene, Unity Editor + MCP |
| `mockups/mockup-ai-xr-immersive.html` | Combined | Mockup valide v2 avec 14 sections navigables (US-1→US-9 + EC-1→EC-5) |

---

## 9. Out of Scope (V1) — Consolidated

The following features are explicitly excluded from V1 and deferred to V2+:

| Feature | Reason |
|---------|--------|
| VAD (Voice Activity Detection) | Faux positifs/negatifs degradent l'experience |
| Wake word | Necessite un modele toujours actif, consommation batterie |
| Streaming audio (chunked ou full) | Complexite d'implementation, V1 = reponse complete |
| Memoire visuelle passive | Stockage + RAG necessaires, pas prioritaire |
| RAG temporel sur captures visuelles | Indexation temporelle complexe |
| Passthrough MR composite pour VLM | Fusion flux camera + virtuel non triviale |
| Eye tracking | API Quest 3 limitee, pas de cas d'usage clair en V1 |
| Persistance contexte entre sessions | Necessite stockage local + gestion taille contexte |
| Switch incarnation automatique/contextuel | Heuristiques non matures |
| Fallback automatique entre providers | Masque les erreurs, complexite excessive |
| Agent MR complet (manipulation, navigation) | Sujet de recherche ouvert |
| Support Quest 2 / Quest Pro / autres casques | Focus Quest 3/3S uniquement |
| Quality check image client-side | Le VLM gere les images degradees |

---

## 10. Open Questions

_None remaining — all decisions validated during brainstorm._

The brainstorm phase is **COMPLETE**. All 5 epics, 9 user stories, and 5 edge cases have been validated with mockups. The next step is PRD generation followed by user story decomposition.
