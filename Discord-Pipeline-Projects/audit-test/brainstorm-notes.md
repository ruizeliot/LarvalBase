# Brainstorm Notes — audit-test (Blind Test Party)

**Date:** 2026-02-15
**Language:** English
**Vibe:** Executive (fast, concise, bottom-line only)
**Path:** A (New project — idea from scratch)

---

## 1. Concept Summary & Positioning

**Product:** Multiplayer blind test party game.

**Setup:** Local same-room — one web app displayed on a shared screen (laptop/TV). Players join via their phone browser using a room code. No accounts, no installs.

**Music Source:** Spotify playlist previews — 30-second clips. No Spotify account or login required from anyone.

**Core Gameplay Loop:** Music plays → first player to buzz answers verbally → host manually validates right/wrong → points awarded automatically → next round.

**Positioning:** Casual party game for groups. Sits at the intersection of Kahoot (room code lobby), Jackbox (phone as dumb controller), Heardle (progressive audio reveal), and SongPop (music trivia playlists). Heardle's shutdown by Spotify in 2023 leaves the browser-based music quiz format wide open.

---

## 2. Visual Research — References Found & Retained

### 2.1 Kahoot! — [kahoot.com](https://kahoot.com/what-is-kahoot/)
- **Why retained:** Gold standard for room code + shared screen + phone buzzer UX
- **Key takeaways:** PIN-based room join, lobby with avatars joining in real-time, speed-based scoring creates tension, leaderboard animations between rounds
- **Applied to:** Lobby/Home (room code flow), Waiting Room (real-time player list), Leaderboard (animated rank transitions)

### 2.2 SongPop (FreshPlanet / Gameloft) — [Wikipedia](https://en.wikipedia.org/wiki/SongPop)
- **Why retained:** Music trivia at scale (100M+ downloads), proves the format works
- **Key takeaways:** Clip length and difficulty curves, genre/decade playlist organization, massive curated library
- **Applied to:** Playlist Management (library structure by genre/decade, difficulty control)

### 2.3 Heardle (defunct, acquired by Spotify 2022, shut down 2023) — [Wikipedia](https://en.wikipedia.org/wiki/Heardle_(game))
- **Why retained:** Progressive reveal mechanic (start with 1s, extend to 2s, 4s...) — browser-only, proved web music quiz works
- **Key takeaways:** Progressive snippets could be a bonus round mode, format is open since shutdown
- **Applied to:** Game Screen (progressive reveal mode as bonus feature)

### 2.4 Jackbox Games — [jackboxgames.com](https://www.jackboxgames.com)
- **Why retained:** THE reference for "shared screen + phones as controllers" party games
- **Key takeaways:** Zero-install via room code URL on any phone browser, minimal phone UI / all spectacle on big screen, polished lobby with funny waiting screens
- **Applied to:** Buzzer/Phone (dead-simple one-button interface), overall UX philosophy (phone = dumb controller)

### Research Recommendation (from Storm)
> Steal Kahoot's room code lobby + Jackbox's "phone = dumb controller" philosophy. Keep the phone screen to literally one big buzzer button. All the visual flair (song playing animation, leaderboard, host controls) lives on the shared screen.

---

## 3. Clarifications (Platform, Constraints, Decisions)

All decisions below were made by the user (anthonyhunt) via closed-choice questions:

| Question | Decision | Rejected Alternatives |
|----------|----------|----------------------|
| Player connection model | **A) Same room** — one screen, phones are buzzers | B) Fully online — everyone on own device; C) Both |
| Main screen platform | **A) Web app** (browser on laptop/TV) | B) Smart TV app; C) Desktop app |
| Phone connection method | **A) Room code** — players type a code on phone browser | B) QR code scan; C) Both QR + fallback code |
| Spotify integration | **B) 30s preview clips**, no login | A) Host Spotify Premium account streams; C) No streaming, host plays music separately |
| Answer method | **A) Just buzz** — verbal answer, host validates manually | B) Multiple choice on phone; C) Type answer on phone |

**Additional clarification (user-initiated):** User requested a Storyboard/User Flow section to show the full game walkthrough end-to-end. Added as Section 8.

---

## 4. Section Breakdown (Step 3)

8 sections validated:

1. **Lobby / Home** — Create/join room via code, username/avatar
2. **Waiting Room** — Players appearing real-time, host configures game
3. **Game Screen** — Progressive audio playback, timer, animations, answer reveals
4. **Buzzer / Phone** — Minimal UI: one big button + answer input
5. **Leaderboard / Inter-round** — Animated rankings, cumulative scores
6. **End Screen** — Final results, per-player stats, replay option
7. **Playlist Management** — Library by genre/decade, host custom playlists
8. **Storyboard / User Flow** — End-to-end game walkthrough (added at user request)

---

## 5. Section Deep-Dive (Step 4)

### 5.1 Lobby / Home

**Description:** Entry point for all players. Host creates a new game room and receives a unique code (e.g., `FUNK42`). Players enter the code on their phone browser to join. Simple username and avatar selection before entering the waiting room.

**Key Features:**
- Room creation with auto-generated code
- Room code input for joining players
- Username input + avatar picker
- No account/login required

**References:** Kahoot (PIN-based room join), Jackbox (roomcode URL, zero install)

**Mockup:** `mockups/lobby-home-v1.html` — Interactive mockup with create room, join with code, and avatar picker flows. Dark theme with purple/pink gradient accents, animated background. Mobile-first layout (max-width 420px).

**Mockup Validated:** Yes (included in pitch deck)

---

### 5.2 Waiting Room

**Description:** After joining, players see themselves appear on the shared screen in real-time. Host configures game settings: playlist genre/decade, difficulty level, number of rounds. Once all players are in and settings are locked, host starts the game.

**Key Features:**
- Real-time player list with avatars appearing as they join
- Host controls: genre, difficulty, round count
- Playlist selection (from library or custom)
- "Start Game" button (host only)

**References:** Kahoot (lobby with avatars joining in real-time, room code displayed prominently)

**Mockup:** `mockups/waiting-room-mockup.html` — Dual-view mockup (TV/shared screen view + phone view toggle). Shows player grid with animated avatar entries, host configuration panel, and room code display. Dark theme with purple/red/cyan gradient accents.

**Mockup Validated:** Yes (included in pitch deck)

---

### 5.3 Game Screen (Shared Display)

**Description:** Main shared display during gameplay. Plays a Spotify 30-second preview clip. Shows audio visualizer, countdown timer, and round info. When a player buzzes, their name appears on screen. After host validates, the correct answer is revealed with animations.

**Key Features:**
- Audio playback with visual feedback (waveform/visualizer)
- Countdown timer per round
- Buzz notification — shows who buzzed first
- Answer reveal with album art
- Progressive reveal mode (bonus): 1s → 2s → 4s clips (Heardle-style)

**References:** Heardle (progressive reveal mechanic), Kahoot (tension-building countdown)

**Mockup:** None produced during brainstorm.

---

### 5.4 Buzzer / Phone

**Description:** Player's phone screen during gameplay. Dead-simple interface — one enormous buzzer button. When pressed, phone vibrates and player can optionally type their answer. Phone is a "dumb controller" — all spectacle on the shared screen.

**Key Features:**
- One big buzzer button (full-screen tap target)
- Haptic feedback on buzz
- Optional text input for answer
- Status indicator (waiting / your turn / correct / wrong)

**References:** Jackbox (minimal phone UI, all visual on big screen)

**Mockup:** None produced during brainstorm.

---

### 5.5 Leaderboard / Inter-round

**Description:** Shown on shared screen between rounds. Animated ranking changes with cumulative scores. Creates excitement as positions shift.

**Key Features:**
- Animated rank transitions (positions sliding up/down)
- Cumulative score display
- Round-by-round point breakdown
- Speed bonus indicator

**References:** Kahoot (leaderboard animations between rounds)

**Mockup:** None produced during brainstorm.

---

### 5.6 End Screen

**Description:** Final screen after all rounds. Podium-style ranking with winner highlighted. Per-player stats visible. "Play Again" button for immediate rematch.

**Key Features:**
- Podium display (1st, 2nd, 3rd)
- Full ranking for all players
- Per-player stats (correct answers, avg buzz time, streaks)
- "Play Again" / "New Game" options

**Mockup:** None produced during brainstorm.

---

### 5.7 Playlist Management

**Description:** Host selects music for the game. Built-in library organized by genre and decade with curated playlists. Host can also create custom playlists by searching Spotify and adding tracks. All using Spotify's 30-second preview API (no auth).

**Key Features:**
- Pre-built playlists by genre (pop, rock, hip-hop, etc.)
- Decade filters (80s, 90s, 2000s, etc.)
- Custom playlist creation
- Spotify search integration
- Difficulty control (obscure vs. popular tracks)

**References:** SongPop (curated library by genre/decade, difficulty curves)

**Mockup:** None produced during brainstorm.

---

### 5.8 Storyboard / User Flow

**Description:** End-to-end game walkthrough showing the full player journey. Added at user's request to visualize how a complete game session plays out.

**Full Game Flow:**
1. **Host opens the app** — Creates a room, receives a code (e.g., FUNK42)
2. **Players join** — Enter the code on their phone browser, arrive in waiting room
3. **Avatars appear** — Players show up one by one on shared screen (Kahoot style)
4. **Host configures** — Picks playlist (genre, decade, or custom) + number of rounds, then launches
5. **Round starts** — Shared screen plays an extract (progressive: 1s → 2s → 4s). Phones show the buzzer.
6. **Player buzzes** — Taps the buzzer, answers verbally. Shared screen shows who buzzed.
7. **Host validates** — Answer revealed, points awarded (speed bonus). Animated leaderboard.
8. **Repeat** — Steps 5-7 for each round
9. **Game ends** — Podium, stats, option to replay

**Mockup:** None produced. Deep-dive not completed for this section.

---

## 6. Pitch Deck

**File:** `pitch-deck.html` — Single-page interactive HTML document with 12 navigable sections (Overview, Concept, Research, Sections, and one page per section). Dark theme. Keyboard navigation supported (arrow keys). Includes embedded iframe mockups for Lobby and Waiting Room.

**Status:** Generated during Step 5, validated by user.

---

## 7. Cross-Section Impacts

| Feature | Sections Affected | Notes |
|---------|-------------------|-------|
| Room code system | Lobby, Waiting Room, Buzzer | Code generated in Lobby, displayed in Waiting Room, used for all phone connections |
| Spotify 30s previews | Game Screen, Playlist Management | Playlists feed into Game Screen; no auth required simplifies architecture |
| Host validation | Game Screen, Buzzer, Leaderboard | Host validates on shared screen → triggers score update → feeds leaderboard |
| Speed bonus scoring | Buzzer, Leaderboard, End Screen | Buzz timestamp determines bonus; shown in leaderboard and final stats |
| Progressive reveal (bonus mode) | Game Screen, Waiting Room (config) | Host enables in settings; changes clip playback from full 30s to progressive |
| Real-time WebSocket | Lobby (join), Waiting Room (presence), Game Screen (buzz events), Buzzer (status) | All real-time features share same connection layer |

---

## 8. Brainstorm Process Notes (Audit Observations)

The user (anthonyhunt) was auditing the brainstorm pipeline. Several issues were flagged with `>>` prefix (feedback markers):

1. **Language switching:** Manager defaulted to French despite English being selected. Flagged multiple times.
2. **Personality/vibe not applied:** Executive mode selected but Manager's personality didn't change. IDENTITY.md was blank.
3. **NoteBot posting location:** NoteBot posted in main channel instead of the Brainstorm Notes thread.
4. **Layout/formatting:** Missing banners between steps, messy message layout, options displayed inline instead of on separate lines.
5. **Missing wait messages:** User suggested webhook-based "agent is preparing..." messages during processing delays.
6. **Banner formatting:** User requested official banner messages for step summaries.

These are pipeline UX issues, not product decisions — included here for completeness since this was an audit brainstorm.
