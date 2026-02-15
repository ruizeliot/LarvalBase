# PRD — Blind Test Party

**Project:** audit-test
**Version:** 1.0
**Date:** 2026-02-15
**Status:** Ready for implementation

---

## 1. Product Vision

### Concept
A multiplayer blind test party game where groups of friends gather in the same room. One shared screen (laptop/TV) runs the game as a web app. Each player connects their phone via a room code and uses it as a buzzer. Music plays from Spotify's free 30-second preview clips — no accounts needed. First to buzz answers verbally; the host validates manually. The app tracks scores automatically.

### Positioning
Casual party game for social gatherings. Combines the best of:
- **Kahoot** — room code lobby, real-time player joining, leaderboard animations
- **Jackbox** — phone as dumb controller, zero install, all spectacle on shared screen
- **Heardle** — progressive audio reveal (bonus mode), browser-only music quiz
- **SongPop** — music trivia playlists organized by genre/decade

The browser-based music quiz format is wide open since Heardle's shutdown in 2023.

---

## 2. Technical Constraints

| Constraint | Decision | Rationale |
|------------|----------|-----------|
| **Platform** | Web app (browser) | Shared screen on laptop/TV + phone browsers for buzzers |
| **Player connection** | Same room only (local) | Party game — no online multiplayer |
| **Phone connection** | Room code (Kahoot-style) | Simple, no QR scanning needed |
| **Music source** | Spotify 30s preview API | No auth required, free tier |
| **Auth** | None | No accounts, no login — players just enter a username |
| **Real-time** | WebSocket | Room code join, player presence, buzz events, host validation |
| **Offline** | Not required | Needs internet for Spotify previews |
| **Audio** | Browser Audio API | Play 30s preview clips from Spotify URLs |

---

## 3. Functional Specs per Section

### 3.1 Lobby / Home
The entry screen. Two paths: **Create** (host) or **Join** (player).

- Host clicks "Create Room" → app generates a unique alphanumeric code (e.g., `FUNK42`)
- Player enters the room code on their phone browser
- Both host and players enter a username and pick an avatar from a preset list
- No account or login required
- After joining, redirect to Waiting Room

### 3.2 Waiting Room
Pre-game configuration screen on the shared display.

- Real-time player list: avatars appear one by one as players join (Kahoot-style animation)
- Room code displayed prominently for latecomers
- **Host-only controls:**
  - Playlist selection (from built-in library or custom)
  - Genre filter (pop, rock, hip-hop, etc.)
  - Decade filter (80s, 90s, 2000s, etc.)
  - Difficulty level
  - Number of rounds
- "Start Game" button (host only, enabled when 2+ players connected)
- Phone view: shows "Waiting for host to start..." with player's avatar

### 3.3 Game Screen (Shared Display)
The main gameplay screen on the TV/laptop.

- Plays a Spotify 30-second preview clip
- Audio visualizer (waveform animation) while music plays
- Countdown timer per round
- When a player buzzes: their name + avatar appear on screen
- Host sees "Correct" / "Wrong" buttons to validate the verbal answer
- After validation: reveal correct answer with album art, artist name, track title
- **Bonus mode — Progressive reveal:** 1s → 2s → 4s clips (Heardle-style), configurable by host

### 3.4 Buzzer / Phone
The player's phone screen during gameplay.

- One big buzzer button — full-screen tap target
- Haptic feedback (vibration) on press
- Optional text input for answer (not required — verbal answers are primary)
- Status indicators: Waiting → Buzzed! → Correct/Wrong
- Minimal UI — all visual spectacle on shared screen

### 3.5 Leaderboard / Inter-round
Shown on the shared screen between rounds.

- Animated rank transitions (positions slide up/down with smooth animations)
- Cumulative score display per player
- Round-by-round point breakdown visible
- Speed bonus indicator (faster buzz = more points)
- Brief pause before next round auto-starts

### 3.6 End Screen
Final results after all rounds complete.

- Podium display: 1st, 2nd, 3rd place with visual emphasis
- Full ranking for all players below podium
- Per-player stats: correct answers, average buzz time, longest streak
- "Play Again" button — same players, new game (returns to Waiting Room)
- "New Game" button — back to Lobby

### 3.7 Playlist Management
Music selection system for the host.

- Built-in library: curated playlists organized by genre and decade
- Genre categories: pop, rock, hip-hop, electronic, jazz, classical, etc.
- Decade filters: 80s, 90s, 2000s, 2010s, 2020s
- Custom playlist creation: host searches Spotify, adds individual tracks
- Difficulty control: popular tracks (easy) vs. obscure tracks (hard)
- All music via Spotify 30s preview API — no authentication required

### 3.8 Storyboard / User Flow
The complete game session from start to finish:

1. Host opens the app → creates a room → gets code `FUNK42`
2. Players enter code on phone browser → land in waiting room
3. Avatars appear one by one on shared screen
4. Host picks playlist + rounds → hits "Start Game"
5. Round: shared screen plays clip (progressive or full) → phones show buzzer
6. Player buzzes → answers verbally → shared screen shows who buzzed
7. Host validates → answer revealed → points awarded → animated leaderboard
8. Repeat for each round
9. Final screen: podium, stats, replay option

---

## 4. User Stories per Section

### 4.1 Lobby / Home
- As a **host**, I want to create a game room and get a code so that I can share it with my friends
- As a **player**, I want to enter a room code on my phone so that I can join a game without installing anything
- As a **player**, I want to pick a username and avatar so that I'm identifiable on the shared screen
- As a **host**, I want the room code to be short and memorable so that players can enter it quickly

### 4.2 Waiting Room
- As a **host**, I want to see players appear in real-time so that I know who has joined
- As a **host**, I want to select a playlist genre and decade so that I can tailor the music to my group
- As a **host**, I want to set the number of rounds so that the game fits the time I have
- As a **player**, I want to see the room code on the shared screen so that latecomers can join
- As a **host**, I want a "Start Game" button that activates when enough players join so that the game begins when I'm ready

### 4.3 Game Screen
- As a **player**, I want to hear a music clip play from the shared screen so that everyone listens together
- As a **host**, I want to see who buzzed first so that I know who to listen to
- As a **host**, I want Correct/Wrong buttons so that I can validate answers quickly
- As a **player**, I want to see the correct answer revealed with album art so that I learn what the song was
- As a **host**, I want to enable progressive reveal mode so that rounds are harder and more exciting

### 4.4 Buzzer / Phone
- As a **player**, I want one big button on my phone so that I can buzz as fast as possible
- As a **player**, I want haptic feedback when I buzz so that I know my input registered
- As a **player**, I want to see my status (waiting/buzzed/correct/wrong) so that I know what's happening

### 4.5 Leaderboard / Inter-round
- As a **player**, I want to see animated rankings between rounds so that the competition feels exciting
- As a **player**, I want to see my cumulative score so that I know where I stand
- As a **player**, I want to see speed bonus points so that I'm motivated to buzz faster

### 4.6 End Screen
- As a **player**, I want to see a podium with the top 3 so that the winner gets a moment of glory
- As a **player**, I want to see my personal stats so that I know how I performed
- As a **host**, I want a "Play Again" button so that we can immediately start another game
- As a **host**, I want a "New Game" button so that I can return to the lobby with a fresh room

### 4.7 Playlist Management
- As a **host**, I want to browse playlists by genre so that I can pick music my group likes
- As a **host**, I want to filter by decade so that I can target a specific era
- As a **host**, I want to create a custom playlist so that I can hand-pick specific songs
- As a **host**, I want difficulty control so that I can make it easier or harder for my group

### 4.8 Storyboard / User Flow
- As a **new user**, I want to understand the full game flow so that I know what to expect before playing

---

## 5. Epic Breakdown

Epics are ordered by dependency (foundational first). Each epic maps 1:1 to a brainstorm section.

### Epic 1: Real-Time Infrastructure
**Section:** Cross-cutting (supports all sections)
**Dependencies:** None (foundational)
**Complexity:** L

**Scope:**
- WebSocket server for real-time communication
- Room creation and management (code generation, player join/leave)
- Player state synchronization across shared screen and phones
- Session management (room lifecycle, cleanup on disconnect)

**User Stories:**
- All real-time user stories from Lobby, Waiting Room, Game Screen, and Buzzer

---

### Epic 2: Lobby / Home
**Section:** 1 — Lobby / Home
**Dependencies:** Epic 1 (Real-Time Infrastructure)
**Complexity:** S

**Scope:**
- Create Room flow (generate code, host enters room)
- Join Room flow (player enters code on phone)
- Username input + avatar picker (preset avatars)
- Route to Waiting Room on join

**User Stories:** See Section 4.1

---

### Epic 3: Waiting Room
**Section:** 2 — Waiting Room
**Dependencies:** Epic 1, Epic 2
**Complexity:** M

**Scope:**
- Shared screen: real-time player list with avatar animations
- Room code display
- Host controls: playlist selection, genre/decade filter, difficulty, round count
- "Start Game" button (host only, requires 2+ players)
- Phone view: waiting state with player avatar

**User Stories:** See Section 4.2

---

### Epic 4: Playlist Management
**Section:** 7 — Playlist Management
**Dependencies:** None (can be built independently, consumed by Waiting Room)
**Complexity:** M

**Scope:**
- Built-in playlist library (genre + decade organization)
- Spotify 30s preview API integration (search, fetch preview URLs)
- Custom playlist builder (search + add tracks)
- Difficulty tagging (popular vs. obscure)
- Playlist data model and storage

**User Stories:** See Section 4.7

---

### Epic 5: Game Screen (Shared Display)
**Section:** 3 — Game Screen
**Dependencies:** Epic 1, Epic 4
**Complexity:** L

**Scope:**
- Audio playback engine (Spotify 30s preview clips via browser Audio API)
- Audio visualizer animation
- Countdown timer
- Buzz notification display (player name + avatar)
- Host validation UI (Correct / Wrong buttons)
- Answer reveal with album art
- Progressive reveal bonus mode (1s → 2s → 4s)
- Round state machine (playing → buzzed → validating → revealed → next)

**User Stories:** See Section 4.3

---

### Epic 6: Buzzer / Phone
**Section:** 4 — Buzzer / Phone
**Dependencies:** Epic 1, Epic 5
**Complexity:** S

**Scope:**
- Full-screen buzzer button
- Haptic feedback (Vibration API)
- Optional text input
- Status indicators (waiting / buzzed / correct / wrong)
- WebSocket integration for buzz event transmission

**User Stories:** See Section 4.4

---

### Epic 7: Leaderboard / Inter-round
**Section:** 5 — Leaderboard / Inter-round
**Dependencies:** Epic 5 (scoring system)
**Complexity:** M

**Scope:**
- Animated rank transitions (CSS/JS animations)
- Cumulative score tracking
- Round-by-round point breakdown
- Speed bonus calculation and display
- Auto-advance to next round after pause

**User Stories:** See Section 4.5

---

### Epic 8: End Screen
**Section:** 6 — End Screen
**Dependencies:** Epic 5, Epic 7
**Complexity:** S

**Scope:**
- Podium display (1st/2nd/3rd)
- Full player ranking
- Per-player stats aggregation (correct answers, avg buzz time, streaks)
- "Play Again" → return to Waiting Room with same players
- "New Game" → return to Lobby

**User Stories:** See Section 4.6

---

## 6. Visual References & Mockup Files

| Section | Mockup File | Status |
|---------|-------------|--------|
| Lobby / Home | `mockups/lobby-home-v1.html` | Produced & validated |
| Waiting Room | `mockups/waiting-room-mockup.html` | Produced & validated |
| Game Screen | — | No mockup |
| Buzzer / Phone | — | No mockup |
| Leaderboard | — | No mockup |
| End Screen | — | No mockup |
| Playlist Management | — | No mockup |
| Storyboard | — | No mockup |

**Pitch Deck:** [`pitch-deck.html`](pitch-deck.html) — Interactive 12-page HTML document with all sections, embedded mockups, and keyboard navigation.

---

## 7. Dependency Graph

```
Epic 1: Real-Time Infrastructure (L)
  └── Epic 2: Lobby / Home (S)
       └── Epic 3: Waiting Room (M)

Epic 4: Playlist Management (M)  ← independent, can parallelize

Epic 5: Game Screen (L)  ← depends on Epic 1 + Epic 4
  └── Epic 6: Buzzer / Phone (S)
  └── Epic 7: Leaderboard (M)
       └── Epic 8: End Screen (S)
```

**Recommended build order:**
1. Epic 1 (Real-Time Infrastructure) + Epic 4 (Playlist Management) — in parallel
2. Epic 2 (Lobby) → Epic 3 (Waiting Room)
3. Epic 5 (Game Screen) → Epic 6 (Buzzer) + Epic 7 (Leaderboard) — in parallel
4. Epic 8 (End Screen)

**Total complexity estimate:** 2L + 3M + 3S
