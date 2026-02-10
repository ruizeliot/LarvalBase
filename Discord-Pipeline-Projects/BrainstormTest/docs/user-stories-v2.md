# User Stories: CascadeSim V2

**Source:** `brainstorm-notes-v2.md` (Finalized 2026-02-10)
**Generated:** 2026-02-10
**Stack:** Web (Desktop browser target)
**Base:** V1 complete (Epics 1-6, 122 E2E tests passing)
**New Epics:** 4 | **New Stories:** 21

---

## Summary Table

| # | Epic | Stories | Priority | Depends On |
|---|------|---------|----------|------------|
| E7 | Scenario Library | 5 | P1 | E1-E6 (V1) |
| E8 | Tutorial System & UI Polish | 7 | P2 | E7 |
| E9 | Collaboration Core | 4 | P0 | E1-E6 (V1) |
| E10 | Collaboration UI | 5 | P0 | E9 |

**Priority key:** P0 = headline feature (collaboration), P1 = high value (content library), P2 = polish (onboarding)

**Parallelization:** E7 and E9 have no cross-dependency and can be built concurrently. E8 waits for E7. E10 waits for E9.

---

## Dependency Graph

```
V1 (E1-E6) ─── Complete ───┐
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    E7 (Scenario Library)     E9 (Collab Core)
        │                         │
        ▼                         ▼
    E8 (Tutorial System)     E10 (Collab UI)
```

---

## New Libraries

| Package | Version | Purpose | Epic |
|---------|---------|---------|------|
| `yjs` | ^13 | CRDT engine for real-time sync | E9 |
| `y-websocket` | ^2 | WebSocket provider for Yjs rooms | E9 |
| `y-indexeddb` | ^9 | Optional offline persistence | E9 |
| `driver.js` | ^1 | Guided tour / spotlight walkthrough | E8 |
| `elkjs` | ^0.9 | ELK layered auto-layout algorithm for graph positioning | E8 |

---

## E7: Scenario Library

Pre-built example scenarios with difficulty ratings, mini-previews, and embedded info-card nodes. Gives new users immediate value and provides teaching material for the tutorial system.

**Depends on:** V1 (E1-E6)

---

### US-7.1: Scenario Library Panel

**As a** user,
**I want to** access a scenario library showing pre-built example simulations,
**so that** I can learn from curated examples without building from scratch.

**Acceptance Criteria:**
- [ ] A "Library" button is accessible from the main UI (e.g., toolbar or Scenarios tab)
- [ ] Clicking it opens a library panel/modal showing pre-built scenario cards in a grid
- [ ] The library contains exactly 6 pre-built scenarios
- [ ] Each card shows: title, short description, node count, and difficulty badge
- [ ] Library can be closed to return to the normal workspace

**E2E Test:** `epic7-scenario-library-panel.spec.ts` — Open library panel, verify 6 cards are visible with titles and difficulty badges, close panel.

---

### US-7.2: Difficulty Badges & Color Coding

**As a** user,
**I want to** see color-coded difficulty badges on each scenario card,
**so that** I can quickly identify scenarios matching my skill level.

**Acceptance Criteria:**
- [ ] Each scenario card displays a difficulty badge: Beginner, Intermediate, Advanced, or Expert
- [ ] Badges are color-coded: Beginner = green, Intermediate = blue, Advanced = orange, Expert = red
- [ ] Badge colors match the CascadeSim dark theme palette
- [ ] Scenarios are distributed: 2 Beginner, 1 Intermediate, 1 Advanced, 2 Expert

**Pre-built scenarios:**

| Scenario | Nodes | Difficulty | Color |
|----------|-------|------------|-------|
| Hello Cascade | 2 | Beginner | Green |
| Branching Paths | 4 | Beginner | Green |
| Supply Chain Disruption | 7 | Intermediate | Blue |
| Global Manufacturing Network | 12 | Advanced | Orange |
| Pandemic Stress Test | 17 | Expert | Red |
| Feedback Loop Chaos | 14 | Expert | Red |

**E2E Test:** `epic7-difficulty-badges.spec.ts` — Open library, verify each card has correct difficulty text and badge color class. Verify distribution (2 green, 1 blue, 1 orange, 2 red).

---

### US-7.3: Filter Scenarios by Difficulty

**As a** user,
**I want to** filter the scenario library by difficulty level,
**so that** I can find scenarios appropriate for my experience.

**Acceptance Criteria:**
- [ ] Filter chips are displayed above the scenario grid: All, Beginner, Intermediate, Advanced, Expert
- [ ] "All" is selected by default, showing all 6 scenarios
- [ ] Clicking a difficulty chip filters to only matching scenarios
- [ ] Active chip is visually highlighted
- [ ] Clicking "All" resets the filter

**E2E Test:** `epic7-filter-difficulty.spec.ts` — Open library, click "Beginner" chip, verify only 2 cards visible. Click "Expert", verify 2 cards. Click "All", verify 6 cards.

---

### US-7.4: Load Pre-Built Scenario

**As a** user,
**I want to** load a pre-built scenario into my workspace,
**so that** I can explore, run, and modify a working example.

**Acceptance Criteria:**
- [ ] Each scenario card has a "Load" button
- [ ] If the current workspace has unsaved components/chains, a confirmation dialog warns before overwriting
- [ ] Loading replaces the current model (components, chains) and creates a scenario with pre-configured forced events
- [ ] After loading, the canvas shows the scenario's components and chains with proper positioning
- [ ] The library panel closes after successful load
- [ ] The user is switched to Editor mode to explore the loaded model

**E2E Test:** `epic7-load-scenario.spec.ts` — Open library, click "Load" on "Hello Cascade", verify 2 components and at least 1 chain appear on canvas. Verify editor mode is active. Load a different scenario over existing, verify confirmation dialog appears.

---

### US-7.5: Info Card Nodes

**As a** user,
**I want to** see explanatory info-card nodes embedded in loaded scenarios,
**so that** I can understand what each part of the model represents and why.

**Acceptance Criteria:**
- [ ] Loaded scenarios include special "info card" annotation nodes on the canvas
- [ ] Info cards are visually distinct from components (e.g., different background color, book/lightbulb icon, dashed border)
- [ ] Each info card contains a short explanation relevant to its nearby component or chain
- [ ] Info cards are non-interactive (cannot be connected to chains, no parameters)
- [ ] Info cards can be dismissed (hidden) individually via a close button
- [ ] A "Show Info Cards" toggle re-shows dismissed cards
- [ ] Each scenario card in the library shows an info card count badge (e.g., "3 info cards")

**E2E Test:** `epic7-info-card-nodes.spec.ts` — Load "Supply Chain Disruption", verify info card nodes appear on canvas with distinct styling. Dismiss one info card, verify it disappears. Toggle "Show Info Cards", verify it reappears.

---

## E8: Tutorial System

Interactive onboarding walkthrough using Driver.js, contextual help hints, and a persistent help button. Guides first-time users through the core Define-Model-Simulate workflow.

**Depends on:** E7 (walkthrough references scenario library for "load an example" step)

---

### US-8.1: First-Visit Walkthrough Trigger

**As a** first-time user,
**I want to** be greeted with an interactive walkthrough when I first open CascadeSim,
**so that** I understand the core workflow without reading documentation.

**Acceptance Criteria:**
- [ ] On first visit (no `cascadesim-tutorial-complete` key in localStorage), the walkthrough auto-starts after a 1-second delay
- [ ] A welcome overlay appears with: app name, brief description, and "Start Tutorial" / "Skip" buttons
- [ ] Clicking "Start Tutorial" begins the guided tour (US-8.2)
- [ ] Clicking "Skip" dismisses the overlay and sets the localStorage flag
- [ ] Subsequent visits do not trigger the walkthrough automatically

**E2E Test:** `epic8-first-visit-trigger.spec.ts` — Load app with cleared localStorage, verify welcome overlay appears. Click "Skip", reload, verify overlay does NOT appear. Clear localStorage again, reload, verify it appears again.

---

### US-8.2: Guided Tour Steps

**As a** user,
**I want to** follow a step-by-step guided tour highlighting key UI elements,
**so that** I learn where everything is and how to use it.

**Acceptance Criteria:**
- [ ] Tour consists of 8 steps covering the core workflow:
  1. Canvas navigation (pan & zoom)
  2. Component palette (drag to create)
  3. Property editor (edit parameters)
  4. Causal chain builder (right-click to start)
  5. Scenario tab (switch modes)
  6. Forced events (timeline)
  7. Simulate tab (run simulation)
  8. Scenario library (load examples)
- [ ] Each step spotlights the target UI element with a dimmed backdrop (Driver.js highlight)
- [ ] Each step shows a popover with: step title, description, and step counter (e.g., "3 of 8")
- [ ] Progress dots below the popover show completed (filled) / current (active) / remaining (empty)
- [ ] "Next" and "Back" buttons navigate between steps
- [ ] "Esc" key dismisses the tour at any point
- [ ] Arrow keys (Left/Right) navigate between steps

**E2E Test:** `epic8-guided-tour-steps.spec.ts` — Start tutorial, verify step 1 spotlight appears on canvas area. Click "Next" through all 8 steps, verify each targets the correct element. Verify step counter updates. Press "Back", verify previous step shown.

---

### US-8.3: Action-Based Step Progression

**As a** user,
**I want to** perform actions during certain tutorial steps to advance,
**so that** I learn by doing rather than just reading.

**Acceptance Criteria:**
- [ ] At least 3 steps require user action to proceed (not just "Next"):
  - Step 2 (Component palette): user must drag a component onto the canvas
  - Step 3 (Property editor): user must change the component's name
  - Step 7 (Simulate): user must click the "Run" button
- [ ] Action-required steps show a visual prompt describing what to do (e.g., "Drag an Internal component onto the canvas")
- [ ] The "Next" button is disabled until the action is completed
- [ ] A "Skip" link is available as fallback for users who can't complete the action
- [ ] Completing the action shows a brief success animation (checkmark) before advancing

**E2E Test:** `epic8-action-progression.spec.ts` — Advance to step 2, verify "Next" is disabled. Drag a component onto canvas, verify "Next" enables and success indicator appears. Click "Skip" on step 3, verify it advances without performing the action.

---

### US-8.4: Replay Tutorial via Help Button

**As a** user,
**I want to** replay the tutorial at any time via a help button,
**so that** I can refresh my knowledge after my first session.

**Acceptance Criteria:**
- [ ] A floating "?" button is always visible in the bottom-right corner of the app
- [ ] Clicking the button opens a help menu with options: "Replay Tutorial", "Keyboard Shortcuts"
- [ ] Selecting "Replay Tutorial" starts the walkthrough from step 1 (same as US-8.2)
- [ ] The help button does not overlap with other UI elements (canvas controls, panels)
- [ ] Help menu closes when clicking outside it

**E2E Test:** `epic8-replay-tutorial.spec.ts` — Verify "?" button is visible. Click it, verify menu appears with "Replay Tutorial" option. Click "Replay Tutorial", verify step 1 of the walkthrough starts. Dismiss tour, verify normal app state restored.

---

### US-8.5: Contextual Hints on Complex Elements

**As a** user,
**I want to** see "?" hint icons on complex UI elements with explanatory tooltips,
**so that** I can get help on specific features without replaying the entire tutorial.

**Acceptance Criteria:**
- [ ] Small "?" icons appear next to complex elements: chain builder modal header, formula editor, simulation speed slider, consequence duration type selector
- [ ] Clicking a "?" icon shows a tooltip/popover with a 1-2 sentence explanation
- [ ] Tooltips match the dark theme styling
- [ ] Tooltips dismiss when clicking outside or pressing Esc
- [ ] First-time-use: when a user opens the chain builder for the first time, a contextual hint auto-appears (once only, tracked in localStorage)

**E2E Test:** `epic8-contextual-hints.spec.ts` — Open chain builder, verify "?" icon is visible near the header. Click it, verify tooltip appears with explanation text. Dismiss tooltip. Verify first-time hint appears on first chain builder open (clear localStorage), does not appear on second open.

---

### US-8.6: Simulation Results Side Panel

**As a** user,
**I want to** see simulation results in a docked, resizable right-side panel instead of an overlay,
**so that** I can view results while still interacting with the canvas.

**Acceptance Criteria:**
- [ ] Simulation results display in a docked right-side panel (replaces the current overlay)
- [ ] Default panel width is 350px
- [ ] Panel is resizable via a draggable divider, range 250px–500px
- [ ] A collapse/expand toggle button is visible on the panel edge
- [ ] When collapsed, the canvas reclaims the full width
- [ ] ReactFlow `fitView()` is called when the panel opens, closes, or is resized
- [ ] Canvas remains fully interactive (pan, zoom, select nodes) when panel is open
- [ ] Panel does not overlap canvas content — canvas viewport adjusts to available space

**E2E Test:** `epic8-results-side-panel.spec.ts` — Run simulation, verify results appear in docked right panel (not overlay). Resize panel via divider, verify canvas adjusts. Collapse panel, verify canvas reclaims width. Verify canvas click-through works with panel open.

---

### US-8.7: ELK.js Auto-Layout

**As a** user,
**I want to** components to be automatically arranged in a readable layout when loading a scenario from the library,
**so that** I can immediately understand the causal chain flow without manual repositioning.

**Acceptance Criteria:**
- [ ] `elkjs` dependency is added to the project
- [ ] When a scenario is loaded from the Scenario Library (E7), ELK layered algorithm auto-positions all component nodes
- [ ] Default layout direction is left-to-right (LR), following causal chain order
- [ ] A "Re-Layout" button is visible in the canvas toolbar
- [ ] Clicking "Re-Layout" opens a dropdown with layout direction options: LR (Left-to-Right), TB (Top-to-Bottom), Compact
- [ ] Selecting a direction re-applies the ELK layout algorithm with that direction
- [ ] Components maintain their relative causal chain ordering after layout
- [ ] Layout respects minimum node spacing to prevent overlap
- [ ] ReactFlow `fitView()` is called after layout completes

**E2E Test:** `epic8-elk-auto-layout.spec.ts` — Load scenario from library, verify components are positioned in LR order (no overlaps). Click "Re-Layout" > "TB", verify components rearrange vertically. Verify "Compact" mode reduces spacing.

---

## E9: Collaboration Core

Real-time multi-user editing via Yjs CRDTs and y-websocket. Room-based architecture with no accounts — share a link and anyone can join. Handles document sync, conflict resolution, and per-user undo/redo.

**Depends on:** V1 (E1-E6)

---

### US-9.1: Create Collaboration Room

**As a** user,
**I want to** create a collaboration room and get a shareable link,
**so that** I can invite others to edit the same simulation in real time.

**Acceptance Criteria:**
- [ ] A "Collaborate" button is visible in the app toolbar
- [ ] Clicking it creates a new Yjs room with a unique room ID
- [ ] The app connects to a y-websocket server and syncs the current model state into the Yjs document
- [ ] A shareable URL is generated containing the room ID (e.g., `?room=abc123`)
- [ ] The URL is displayed in a modal with a "Copy Link" button
- [ ] The user who creates the room is automatically connected as the first participant
- [ ] User is prompted for a display name on room creation

**E2E Test:** `epic9-create-room.spec.ts` — Click "Collaborate", enter display name, verify room modal appears with a shareable URL containing a room parameter. Verify URL can be copied. Verify user appears as connected participant.

---

### US-9.2: Join Room via Shared Link

**As a** user,
**I want to** join an existing collaboration room by opening a shared link,
**so that** I can edit the simulation together with others.

**Acceptance Criteria:**
- [ ] Opening a URL with a `?room=<id>` parameter automatically connects to the room
- [ ] The joining user is prompted for a display name before entering
- [ ] The full current model state (components, chains, scenarios) loads immediately on join
- [ ] Late joiners see the complete current state, not just changes since room creation
- [ ] If the room does not exist or the server is unreachable, an error message is shown with a "Work Offline" fallback

**E2E Test:** `epic9-join-room.spec.ts` — Open app with `?room=test-room` parameter, enter display name, verify model state from room loads on canvas. Verify error state when connecting to non-existent room.

---

### US-9.3: Real-Time Model Sync

**As a** collaborator,
**I want to** see changes made by other users appear on my canvas in real time,
**so that** we can work on the same simulation simultaneously.

**Acceptance Criteria:**
- [ ] Adding a component on one client appears on all other connected clients within 500ms
- [ ] Editing a component's name or parameters syncs to all clients
- [ ] Deleting a component (and its cascading chain removal) syncs to all clients
- [ ] Adding/editing/deleting causal chains syncs to all clients
- [ ] Scenario changes (create, edit forced events) sync to all clients
- [ ] Concurrent edits to different components merge without conflict (Yjs CRDT)
- [ ] Concurrent edits to the same component property use last-writer-wins resolution
- [ ] Component position changes (drag on canvas) sync to all clients

**E2E Test:** `epic9-realtime-sync.spec.ts` — Open two browser contexts in same room. In context A, add a component. Verify it appears in context B. In context B, rename the component. Verify the new name appears in context A. In context A, delete the component. Verify it disappears from context B.

---

### US-9.4: Per-User Undo/Redo

**As a** collaborator,
**I want to** undo and redo only my own changes,
**so that** I don't accidentally revert another user's work.

**Acceptance Criteria:**
- [ ] Each user has an independent undo/redo stack scoped via Yjs `UndoManager`
- [ ] Ctrl+Z undoes only the current user's last action
- [ ] Ctrl+Y (or Ctrl+Shift+Z) redoes only the current user's last undone action
- [ ] Undoing does not affect changes made by other users
- [ ] Undo stack persists during the session (survives brief disconnection/reconnection)
- [ ] Undo/redo buttons are visible in the toolbar with disabled state when stack is empty

**E2E Test:** `epic9-per-user-undo.spec.ts` — Open two browser contexts in same room. In context A, add a component. In context B, add a different component. In context A, press Ctrl+Z. Verify context A's component is removed but context B's component remains on both screens.

---

## E10: Collaboration UI

Visual indicators for multi-user presence: live cursors, presence bar, edit indicators, share modal, and activity feed. Makes collaboration visible and intuitive.

**Depends on:** E9 (Yjs awareness protocol required for all presence features)

---

### US-10.1: Live Cursors

**As a** collaborator,
**I want to** see other users' cursors moving on the canvas in real time,
**so that** I can see where others are looking and working.

**Acceptance Criteria:**
- [ ] Each connected user's cursor is rendered on the canvas as a colored arrow with their name label
- [ ] Each user is assigned a unique color (consistent across all UI elements for that user)
- [ ] Cursor position updates in real time via Yjs awareness protocol (< 100ms latency on LAN)
- [ ] Cursors are only shown on the canvas area, not in panels
- [ ] A user's cursor disappears within 5 seconds of disconnection
- [ ] The local user does not see their own remote cursor

**E2E Test:** `epic10-live-cursors.spec.ts` — Open two browser contexts in same room. Move mouse in context A's canvas area. Verify a colored cursor with context A's name appears in context B's canvas. Verify cursor position updates as mouse moves.

---

### US-10.2: Presence Bar

**As a** collaborator,
**I want to** see who is currently connected in a presence bar,
**so that** I know who I'm working with.

**Acceptance Criteria:**
- [ ] A presence bar appears in the top-right corner when in a collaboration room
- [ ] Each connected user is shown as a colored circle with their initial letter
- [ ] The user's own avatar is shown first (with "You" label on hover)
- [ ] Hovering any avatar shows: display name and current activity (e.g., "Editing Component 3", "Viewing Simulate tab")
- [ ] Users appear when they join and disappear when they leave (with brief fade animation)
- [ ] A participant count badge shows the total number of connected users

**E2E Test:** `epic10-presence-bar.spec.ts` — Open two browser contexts in same room. Verify both contexts show 2 user avatars in the presence bar. Hover an avatar, verify tooltip shows name. Close one context, verify the other shows 1 avatar.

---

### US-10.3: Edit Indicators

**As a** collaborator,
**I want to** see which components other users are currently editing,
**so that** I can avoid conflicting edits and understand what's being worked on.

**Acceptance Criteria:**
- [ ] When a user selects a component, a colored border glow appears around that node for all other users
- [ ] The glow color matches the editing user's assigned color
- [ ] A floating label appears near the node: "[User] is editing" (e.g., "Alex is editing")
- [ ] The indicator clears when the user deselects the component or switches to a different one
- [ ] Multiple users can have edit indicators on different components simultaneously
- [ ] Edit indicators do not block interaction with the component

**E2E Test:** `epic10-edit-indicators.spec.ts` — Open two browser contexts in same room with a component on canvas. In context A, select the component. Verify context B shows a colored glow on that component with "[User A] is editing" label. In context A, deselect. Verify indicator clears in context B.

---

### US-10.4: Share Room Modal

**As a** room host,
**I want to** easily share the room link with others,
**so that** they can join with minimal friction.

**Acceptance Criteria:**
- [ ] A "Share" button is visible in the toolbar when in a collaboration room
- [ ] Clicking it opens a modal showing: the room link, a "Copy Link" button, and connected user count
- [ ] Clicking "Copy Link" copies the URL to clipboard and shows a "Copied!" confirmation
- [ ] The modal shows the list of currently connected users with their names and colors
- [ ] The modal can be dismissed by clicking outside or pressing Esc
- [ ] When not in a room, the "Share" button acts as "Collaborate" (creates a new room — same as US-9.1)

**E2E Test:** `epic10-share-room-modal.spec.ts` — Create a room, click "Share", verify modal shows room link and user list. Click "Copy Link", verify clipboard contains the room URL. Verify connected user count matches actual users.

---

### US-10.5: Activity Bar

**As a** collaborator,
**I want to** see a live activity feed of recent edits by all users,
**so that** I can follow what's happening across the simulation without watching every cursor.

**Acceptance Criteria:**
- [ ] A collapsible activity bar appears at the bottom of the screen when in a collaboration room
- [ ] Each activity entry shows: user color dot, user name, action description, and relative timestamp
- [ ] Actions tracked: component added/edited/deleted, chain added/edited/deleted, scenario modified, simulation started/stopped
- [ ] New entries appear at the top with a brief slide-in animation
- [ ] The bar shows the 20 most recent activities (older entries scroll off)
- [ ] The bar can be collapsed to a single line showing the most recent activity
- [ ] Activity entries fade from full opacity to muted after 30 seconds

**E2E Test:** `epic10-activity-bar.spec.ts` — Open two browser contexts in same room. In context A, add a component. Verify context B's activity bar shows "[User A] added [Component Name]". In context B, rename it. Verify context A's activity bar shows "[User B] edited [Component Name]". Verify collapse/expand toggle works.

---

## Notes

- **V1 numbering preserved.** V2 epics continue from E7 to avoid confusion with existing E1-E6.
- **y-websocket server.** E9 requires a running y-websocket server. For development, use `npx y-websocket` locally. Production deployment is out of scope for V2 stories.
- **No accounts.** Per brainstorm decision, there are no user accounts. Display names are entered on room join and stored in session only.
- **Color assignment.** User colors are assigned from a fixed palette on join (8 colors). Consistent across cursors, presence bar, edit indicators, and activity bar.
- **Scenario library data.** The 6 pre-built scenarios are defined as static JSON/TypeScript data files. They are NOT loaded from a server.
- **Driver.js theming.** Tutorial popovers must be styled to match the CascadeSim dark theme (override Driver.js defaults).
- **localStorage keys.** Tutorial state uses `cascadesim-tutorial-complete` and `cascadesim-first-use-*` keys.
- **E2E multi-context tests.** E9 and E10 tests use Playwright's multi-browser-context feature to simulate multiple users in the same test.

---

## Out of Scope (V2)

- User accounts / authentication
- Role-based permissions (editor vs. viewer)
- Room persistence (rooms are ephemeral — gone when last user leaves)
- Offline-first sync (y-indexeddb is optional enhancement, not a requirement)
- Mobile responsive layout
- Voice/video chat
- Version history / change tracking
- Export/import of models

---

*Generated from brainstorm-notes-v2.md (2026-02-10)*
*Ready for implementation planning.*
