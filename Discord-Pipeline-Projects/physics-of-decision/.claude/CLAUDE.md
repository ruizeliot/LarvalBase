# CLAUDE.md — Physics of Decision (POD)

## Project
POD v2.0.0 — Collaborative web tool for modeling complex systems using HITeC methodology.

## Source of Truth
- **PRD:** `PRD.md` (contains full specs, epics, user stories, data model, API contracts)
- **Mockups:** `mockups/*.html` (6 mockups matching 6 epics)
- **Config:** Read webhook URL from `../../agents/test/manager/memory/projects/physics-of-decision/config.json`

## Tech Stack
- React 19 + TypeScript 5.x
- React Flow (graph rendering)
- HTML5 Canvas API (charts)
- React Context + useReducer (state)
- Node.js 20 + Express (backend)
- Socket.io 4.x (real-time)
- Inter font (UI), JetBrains Mono (values)

## Build Status
- **Current Phase:** Implementation
- **Current Epic:** Epic 1 — Lobby & Rooms
- **Completed Epics:** None

## Conventions
- Language UI: French
- Theme: Light mode only
- No tests in V2 scope (PRD says "Tests unitaires : Aucun en V2")
- localStorage only (no server persistence)
- Do NOT modify `pod-definition/` (legacy V1 code)

## Session Handoff (2026-02-18)
**Epic 1 — Lobby & Rooms: COMPLETE (all 8 stories committed)**

Commits:
- `3e1da16` project setup (React 19 + TS + Vite + Express + Socket.io)
- `d8284e8` US-1.1: Connexion avec identité visuelle
- `3a04f01` US-1.2: Liste des rooms en temps réel
- `87595b2` US-1.3: Création de room
- `f723249` US-1.4: Recherche et filtrage par tags (fixed useRef debounce type)
- `92e3234` US-1.5+1.6+1.7: Tri, favoris, gestion créateur (sort by updatedAt, section rename, optimistic updates, LoginPage type fix)
- `047099d` US-1.8: Design scientifique-professionnel (375px breakpoint, vite config fix)

Fixes applied:
- TypeScript build errors: useRef initial value, COLORS/AVATARS state type widening, vite allowedHosts type
- Sort by activity now uses `updatedAt` (not just presence count)
- Favorites section title → "Mes Rooms" per mockup
- Optimistic state updates on create/edit/delete
- Added 375px responsive breakpoint

**Known issue:** Bash commands may fail with exit code 1 in this monorepo. Use PowerShell for builds.

## Roadmap
1. ✅ Epic 1: Lobby & Rooms (8/8 stories — committed)
2. 🔲 Epic 2: Pod Definition — Split Screen (12 stories)
3. 🔲 Epic 3: Pod Decision — Performance (7 stories)
4. 🔲 Epic 4: Pod Decision — Conditions (7 stories)
5. 🔲 Epic 5: Pod Decision — Composants (6 stories)
6. 🔲 Epic 6: Collaboration temps réel (6 stories)
