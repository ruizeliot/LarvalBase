# E2E Test Specifications: CascadeSim V2

**Source:** `docs/user-stories-v2.md`
**Generated:** 2026-02-10
**Framework:** Playwright
**Rule:** No mocking. All tests use real DOM, real state, real data.
**Base:** V1 tests (E1-E6) remain unchanged. V2 adds E7-E10.

---

## Conventions

Identical to V1 conventions (see `docs/test-specs.md`):

- **Selectors:** Use `data-testid` attributes (e.g. `[data-testid="library-panel"]`)
- **Setup helpers:** Reusable functions that perform real UI actions (drag, click, type) to build state. No injected fixtures.
- **Assertions:** Always assert against visible DOM or computed styles, never internal state.
- **Cleanup:** Each test starts with a fresh app load (`page.goto('/')`)
- **Multi-context tests (E9, E10):** Use Playwright's `browser.newContext()` to simulate multiple users in the same test. Each context gets its own page with independent localStorage.

### New Setup Functions (V2)

These are NOT mocks. Each performs real UI interactions to build prerequisite state.

| Helper | Actions |
|--------|---------|
| `openLibraryPanel(page)` | Clicks the "Library" button in the toolbar, waits for library panel to be visible |
| `loadScenarioFromLibrary(page, scenarioName)` | Opens library, clicks "Load" on the named scenario card, handles confirmation if workspace is dirty |
| `startTutorial(page)` | Clears `cascadesim-tutorial-complete` from localStorage, reloads page, waits for welcome overlay |
| `advanceTourStep(page)` | Clicks the "Next" button in the Driver.js popover |
| `createRoom(page, displayName)` | Clicks "Collaborate" button, enters display name, waits for room modal with shareable URL |
| `joinRoom(page, roomId, displayName)` | Navigates to `/?room={roomId}`, enters display name, waits for model state to load |
| `setupTwoUserRoom(browser)` | Creates two browser contexts, creates a room in context A, joins from context B. Returns `{ pageA, pageB, roomId }` |
| `buildFloodModel(page)` | Same as V1 — builds the full "Flood" reference model via UI interactions |

### y-websocket Server

E9 and E10 tests require a running y-websocket server. The Playwright config should start it in `globalSetup`:

```
npx y-websocket --port 1234
```

Tests connect to `ws://localhost:1234`. No external server dependencies.

---

## E7: Scenario Library

---

### TEST-7.1: scenario-library-panel.spec

**Story:** US-7.1 — Scenario Library Panel

#### TC-7.1.1: Library button is accessible and opens panel

```
Steps:
  1. Navigate to app
  2. Assert a "Library" button is visible in the toolbar
  3. Click the "Library" button
  4. Assert a library panel/modal appears
  5. Assert the panel contains a grid of scenario cards
  6. Assert exactly 6 scenario cards are visible
```

#### TC-7.1.2: Each card shows title, description, node count, and difficulty badge

```
Steps:
  1. Open library panel
  2. For each of the 6 cards, assert:
     a. Card has a visible title text (non-empty)
     b. Card has a visible description text (non-empty)
     c. Card has a node count indicator (e.g. "2 nodes", "7 nodes")
     d. Card has a difficulty badge element
```

#### TC-7.1.3: Library panel can be closed

```
Steps:
  1. Open library panel
  2. Assert panel is visible
  3. Click close button (or click outside the panel)
  4. Assert library panel is no longer visible
  5. Assert normal workspace is restored (canvas visible, tabs functional)
```

#### TC-7.1.4: Edge — Open library from different tabs

```
Steps:
  1. Switch to Scenarios tab
  2. Click "Library" button
  3. Assert library panel opens
  4. Close panel
  5. Switch to Simulate tab
  6. Click "Library" button
  7. Assert library panel opens
```

#### TC-7.1.5: Edge — Open library with existing model on canvas

```
Setup: buildFloodModel()
Steps:
  1. Assert canvas has components
  2. Click "Library" button
  3. Assert library panel opens and shows 6 cards
  4. Close panel
  5. Assert existing model is still on canvas (not modified by opening library)
```

---

### TEST-7.2: difficulty-badges.spec

**Story:** US-7.2 — Difficulty Badges & Color Coding

#### TC-7.2.1: Each scenario has correct difficulty text

```
Steps:
  1. Open library panel
  2. Assert card "Hello Cascade" has badge text "Beginner"
  3. Assert card "Branching Paths" has badge text "Beginner"
  4. Assert card "Supply Chain Disruption" has badge text "Intermediate"
  5. Assert card "Global Manufacturing Network" has badge text "Advanced"
  6. Assert card "Pandemic Stress Test" has badge text "Expert"
  7. Assert card "Feedback Loop Chaos" has badge text "Expert"
```

#### TC-7.2.2: Badges are color-coded correctly

```
Steps:
  1. Open library panel
  2. Assert "Beginner" badges have green color class/style (matching CascadeSim theme)
  3. Assert "Intermediate" badge has blue color class/style
  4. Assert "Advanced" badge has orange color class/style
  5. Assert "Expert" badges have red color class/style
```

#### TC-7.2.3: Correct difficulty distribution

```
Steps:
  1. Open library panel
  2. Count badges by difficulty text:
     - Assert 2 cards with "Beginner"
     - Assert 1 card with "Intermediate"
     - Assert 1 card with "Advanced"
     - Assert 2 cards with "Expert"
  3. Assert total = 6
```

#### TC-7.2.4: Node counts match scenario definitions

```
Steps:
  1. Open library panel
  2. Assert "Hello Cascade" shows 2 nodes
  3. Assert "Branching Paths" shows 4 nodes
  4. Assert "Supply Chain Disruption" shows 7 nodes
  5. Assert "Global Manufacturing Network" shows 12 nodes
  6. Assert "Pandemic Stress Test" shows 17 nodes
  7. Assert "Feedback Loop Chaos" shows 14 nodes
```

---

### TEST-7.3: filter-difficulty.spec

**Story:** US-7.3 — Filter Scenarios by Difficulty

#### TC-7.3.1: Filter chips are displayed with "All" selected by default

```
Steps:
  1. Open library panel
  2. Assert filter chips visible: "All", "Beginner", "Intermediate", "Advanced", "Expert"
  3. Assert "All" chip has active/highlighted styling
  4. Assert 6 scenario cards are visible
```

#### TC-7.3.2: Clicking a difficulty chip filters to matching scenarios

```
Steps:
  1. Open library panel
  2. Click "Beginner" chip
  3. Assert "Beginner" chip has active styling
  4. Assert "All" chip no longer has active styling
  5. Assert exactly 2 cards visible ("Hello Cascade", "Branching Paths")
  6. Click "Expert" chip
  7. Assert exactly 2 cards visible ("Pandemic Stress Test", "Feedback Loop Chaos")
  8. Click "Intermediate" chip
  9. Assert exactly 1 card visible ("Supply Chain Disruption")
  10. Click "Advanced" chip
  11. Assert exactly 1 card visible ("Global Manufacturing Network")
```

#### TC-7.3.3: Clicking "All" resets the filter

```
Steps:
  1. Open library panel
  2. Click "Expert" chip — assert 2 cards
  3. Click "All" chip
  4. Assert "All" chip has active styling
  5. Assert 6 cards visible
```

#### TC-7.3.4: Edge — Filter with no matching results does not occur

```
Steps:
  1. Open library panel
  2. Click each filter chip in sequence
  3. Assert every chip shows at least 1 result (no empty state needed per current distribution)
```

---

### TEST-7.4: load-scenario.spec

**Story:** US-7.4 — Load Pre-Built Scenario

#### TC-7.4.1: Load "Hello Cascade" into empty workspace

```
Steps:
  1. Open library panel
  2. Locate "Hello Cascade" card
  3. Assert card has a "Load" button
  4. Click "Load"
  5. Assert library panel closes
  6. Assert canvas shows exactly 2 component nodes
  7. Assert at least 1 chain edge is visible on canvas
  8. Assert app is in Editor mode (editor tab active)
```

#### TC-7.4.2: Loaded scenario creates components with correct positioning

```
Steps:
  1. Load "Hello Cascade" from library
  2. Assert 2 component nodes are on canvas
  3. Assert nodes are not stacked on top of each other (distinct x or y positions)
  4. Assert nodes are within the visible viewport
```

#### TC-7.4.3: Loaded scenario creates a pre-configured scenario with forced events

```
Steps:
  1. Load "Hello Cascade" from library
  2. Switch to Scenarios tab
  3. Assert at least 1 scenario appears in the scenario list
  4. Select the scenario
  5. Assert timeline shows at least 1 forced event marker
```

#### TC-7.4.4: Confirmation dialog when workspace has existing components

```
Setup: createComponent(page, 'internal', 'Existing', [{ name: 'val', value: '5' }])
Steps:
  1. Assert canvas has 1 component
  2. Open library panel
  3. Click "Load" on "Hello Cascade"
  4. Assert confirmation dialog appears warning about overwriting
  5. Click "Cancel"
  6. Assert library panel is still open
  7. Assert "Existing" component is still on canvas
  8. Click "Load" again on "Hello Cascade"
  9. Click "Confirm" on dialog
  10. Assert library panel closes
  11. Assert "Existing" component is gone
  12. Assert "Hello Cascade" components are loaded
```

#### TC-7.4.5: Load a different scenario over a loaded scenario

```
Steps:
  1. Load "Hello Cascade" (2 nodes)
  2. Open library panel
  3. Click "Load" on "Supply Chain Disruption"
  4. Assert confirmation dialog appears
  5. Confirm
  6. Assert canvas now shows 7 component nodes (not 2)
  7. Assert no leftover nodes from "Hello Cascade"
```

#### TC-7.4.6: Edge — Load scenario and verify it is runnable

```
Steps:
  1. Load "Hello Cascade" from library
  2. Switch to Simulate tab
  3. Click Play
  4. Wait 2 seconds
  5. Assert simulation is running (time > 0)
  6. Assert no error toasts or console errors
  7. Click Stop
```

---

### TEST-7.5: info-card-nodes.spec

**Story:** US-7.5 — Info Card Nodes

#### TC-7.5.1: Info cards appear on canvas after loading a scenario

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Assert canvas contains at least 1 element with info card styling (distinct background, dashed border, or book/lightbulb icon)
  3. Assert info card nodes are visually distinct from regular component nodes
```

#### TC-7.5.2: Info cards contain explanatory text

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Locate an info card node on canvas
  3. Assert it contains non-empty text content
  4. Assert text is readable (not truncated to nothing)
```

#### TC-7.5.3: Info cards are non-interactive (no chain connections)

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Right-click an info card node
  3. Assert context menu does NOT contain "New Causal Chain from here"
  4. Assert info card has no connection handles (input/output ports)
```

#### TC-7.5.4: Dismiss an info card via close button

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Count visible info cards as N
  3. Click the close/dismiss button on one info card
  4. Assert that info card disappears from canvas
  5. Assert remaining visible info cards = N - 1
```

#### TC-7.5.5: "Show Info Cards" toggle re-shows dismissed cards

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Count visible info cards as N
  3. Dismiss all info cards one by one
  4. Assert 0 info cards visible
  5. Click "Show Info Cards" toggle
  6. Assert N info cards are visible again
```

#### TC-7.5.6: Library card shows info card count badge

```
Steps:
  1. Open library panel
  2. Locate "Supply Chain Disruption" card
  3. Assert card shows an info card count badge (e.g. "3 info cards" or similar)
  4. Assert badge count is a positive integer
```

#### TC-7.5.7: Edge — Info cards do not affect simulation

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Switch to Simulate tab
  3. Click Play
  4. Assert simulation runs normally
  5. Assert info cards are not listed as components in chain status panel
  6. Click Stop
```

---

## E8: Tutorial System

---

### TEST-8.1: first-visit-trigger.spec

**Story:** US-8.1 — First-Visit Walkthrough Trigger

#### TC-8.1.1: Welcome overlay appears on first visit

```
Steps:
  1. Clear localStorage (remove 'cascadesim-tutorial-complete' key)
  2. Navigate to app
  3. Wait 1.5 seconds (1s delay + buffer)
  4. Assert welcome overlay is visible
  5. Assert overlay contains app name "CascadeSim"
  6. Assert overlay contains a brief description
  7. Assert "Start Tutorial" button is visible
  8. Assert "Skip" button is visible
```

#### TC-8.1.2: Clicking "Skip" dismisses overlay and sets localStorage flag

```
Steps:
  1. Clear localStorage, reload app
  2. Wait for welcome overlay
  3. Click "Skip"
  4. Assert welcome overlay disappears
  5. Assert normal app workspace is visible
  6. Assert localStorage contains 'cascadesim-tutorial-complete' = 'true' (or truthy value)
```

#### TC-8.1.3: Subsequent visits do not trigger walkthrough

```
Steps:
  1. Clear localStorage, reload app
  2. Click "Skip" to dismiss overlay
  3. Reload page
  4. Wait 2 seconds
  5. Assert welcome overlay does NOT appear
```

#### TC-8.1.4: Clearing localStorage re-triggers walkthrough

```
Steps:
  1. Set 'cascadesim-tutorial-complete' in localStorage, reload — assert no overlay
  2. Clear localStorage
  3. Reload page
  4. Wait 1.5 seconds
  5. Assert welcome overlay appears again
```

#### TC-8.1.5: Edge — Clicking "Start Tutorial" begins guided tour

```
Steps:
  1. Clear localStorage, reload app
  2. Wait for welcome overlay
  3. Click "Start Tutorial"
  4. Assert welcome overlay disappears
  5. Assert Driver.js spotlight/popover appears (step 1 of tour)
```

---

### TEST-8.2: guided-tour-steps.spec

**Story:** US-8.2 — Guided Tour Steps

#### TC-8.2.1: Tour has 8 steps targeting correct UI elements

```
Steps:
  1. Start tutorial (clear localStorage, reload, click "Start Tutorial")
  2. Step 1: Assert spotlight targets canvas area, popover says "1 of 8"
  3. Click "Next"
  4. Step 2: Assert spotlight targets component palette
  5. Click "Next"
  6. Step 3: Assert spotlight targets property editor area
  7. Click "Next"
  8. Step 4: Assert spotlight targets a component node or chain builder instruction
  9. Click "Next"
  10. Step 5: Assert spotlight targets Scenarios tab
  11. Click "Next"
  12. Step 6: Assert spotlight targets timeline/forced events area
  13. Click "Next"
  14. Step 7: Assert spotlight targets Simulate tab or play button area
  15. Click "Next"
  16. Step 8: Assert spotlight targets Library button
  17. Assert step counter shows "8 of 8"
```

#### TC-8.2.2: Progress dots show correct state

```
Steps:
  1. Start tutorial
  2. Assert 8 progress dots visible below popover
  3. Assert dot 1 is active (filled/highlighted), dots 2-8 are empty
  4. Click "Next"
  5. Assert dot 1 is completed (filled), dot 2 is active, dots 3-8 are empty
  6. Advance to step 5
  7. Assert dots 1-4 completed, dot 5 active, dots 6-8 empty
```

#### TC-8.2.3: "Back" button navigates to previous step

```
Steps:
  1. Start tutorial, advance to step 3
  2. Assert step counter shows "3 of 8"
  3. Click "Back"
  4. Assert step counter shows "2 of 8"
  5. Assert spotlight targets component palette (step 2's element)
```

#### TC-8.2.4: Esc key dismisses the tour

```
Steps:
  1. Start tutorial, advance to step 4
  2. Press "Escape" key
  3. Assert Driver.js spotlight/popover disappears
  4. Assert normal app state is restored
  5. Assert localStorage flag is set (tour considered complete on dismiss)
```

#### TC-8.2.5: Arrow keys navigate between steps

```
Steps:
  1. Start tutorial (step 1)
  2. Press ArrowRight key
  3. Assert step counter shows "2 of 8"
  4. Press ArrowRight key
  5. Assert step counter shows "3 of 8"
  6. Press ArrowLeft key
  7. Assert step counter shows "2 of 8"
```

#### TC-8.2.6: Edge — "Back" on step 1 does nothing

```
Steps:
  1. Start tutorial (step 1)
  2. Click "Back" (or press ArrowLeft)
  3. Assert still on step 1 (counter shows "1 of 8")
  4. Assert no error
```

---

### TEST-8.3: action-progression.spec

**Story:** US-8.3 — Action-Based Step Progression

#### TC-8.3.1: Step 2 requires dragging a component to proceed

```
Steps:
  1. Start tutorial, advance to step 2 (component palette)
  2. Assert popover shows action prompt (e.g. "Drag an Internal component onto the canvas")
  3. Assert "Next" button is disabled
  4. Drag "Internal" component from palette onto canvas
  5. Assert brief success animation/indicator appears (checkmark)
  6. Assert "Next" button is now enabled
  7. Click "Next"
  8. Assert step 3 is shown
```

#### TC-8.3.2: Step 3 requires changing a component's name

```
Steps:
  1. Advance to step 3 (property editor)
  2. Assert "Next" button is disabled
  3. Assert action prompt describes changing the component name
  4. Click on the component's name input and change it to "MyComponent"
  5. Assert success indicator appears
  6. Assert "Next" button is enabled
```

#### TC-8.3.3: Step 7 requires clicking the "Run" button

```
Steps:
  1. Advance to step 7 (simulate)
  2. Assert "Next" button is disabled
  3. Assert action prompt describes clicking "Run"
  4. Click the Play/Run button
  5. Assert success indicator appears
  6. Assert "Next" button is enabled
```

#### TC-8.3.4: "Skip" link bypasses action requirement

```
Steps:
  1. Advance to step 2 (action-required step)
  2. Assert "Next" button is disabled
  3. Assert a "Skip" link is visible
  4. Click "Skip"
  5. Assert step 3 is shown (advanced without performing action)
```

#### TC-8.3.5: Edge — Non-action steps have "Next" enabled immediately

```
Steps:
  1. Start tutorial (step 1 — canvas navigation, no action required)
  2. Assert "Next" button is enabled (not disabled)
  3. Click "Next" — step advances
```

---

### TEST-8.4: replay-tutorial.spec

**Story:** US-8.4 — Replay Tutorial via Help Button

#### TC-8.4.1: Floating help button is always visible

```
Steps:
  1. Navigate to app
  2. Assert "?" button is visible in the bottom-right corner
  3. Switch to Scenarios tab — assert "?" still visible
  4. Switch to Simulate tab — assert "?" still visible
```

#### TC-8.4.2: Help button opens menu with options

```
Steps:
  1. Click "?" button
  2. Assert help menu appears
  3. Assert menu contains "Replay Tutorial" option
  4. Assert menu contains "Keyboard Shortcuts" option
```

#### TC-8.4.3: "Replay Tutorial" starts walkthrough from step 1

```
Steps:
  1. Set 'cascadesim-tutorial-complete' in localStorage (not first visit)
  2. Reload app — assert no automatic overlay
  3. Click "?" button
  4. Click "Replay Tutorial"
  5. Assert Driver.js spotlight/popover appears
  6. Assert step counter shows "1 of 8"
```

#### TC-8.4.4: Help menu closes when clicking outside

```
Steps:
  1. Click "?" button — assert menu visible
  2. Click on the canvas area (outside menu)
  3. Assert help menu is no longer visible
```

#### TC-8.4.5: Normal app state restored after dismissing replayed tour

```
Steps:
  1. Click "?" → "Replay Tutorial"
  2. Advance to step 3
  3. Press Escape to dismiss
  4. Assert no spotlight/popover visible
  5. Assert app is functional (can create components, switch tabs)
```

#### TC-8.4.6: Edge — Help button does not overlap canvas controls

```
Steps:
  1. Navigate to app
  2. Get bounding box of "?" button
  3. Get bounding boxes of canvas zoom controls (if any)
  4. Assert no overlap between help button and other controls
```

---

### TEST-8.5: contextual-hints.spec

**Story:** US-8.5 — Contextual Hints on Complex Elements

#### TC-8.5.1: Hint icon visible on chain builder modal header

```
Setup: createComponent(page, 'internal', 'A', [{ name: 'x', value: '1' }])
Steps:
  1. Right-click "A" component, click "New Causal Chain from here"
  2. Assert chain builder modal opens
  3. Assert a "?" hint icon is visible near the modal header
```

#### TC-8.5.2: Clicking hint icon shows tooltip with explanation

```
Setup: Open chain builder (same as TC-8.5.1)
Steps:
  1. Click the "?" hint icon near the chain builder header
  2. Assert a tooltip/popover appears
  3. Assert tooltip contains explanatory text (non-empty, 1-2 sentences)
  4. Assert tooltip matches dark theme styling
```

#### TC-8.5.3: Tooltip dismisses on click outside or Esc

```
Setup: Open chain builder, click "?" to show tooltip
Steps:
  1. Assert tooltip is visible
  2. Click outside the tooltip (on the modal background)
  3. Assert tooltip is dismissed
  4. Click "?" again to reopen tooltip
  5. Press Escape
  6. Assert tooltip is dismissed
```

#### TC-8.5.4: First-time contextual hint auto-appears on chain builder open

```
Steps:
  1. Clear localStorage (remove all 'cascadesim-first-use-*' keys)
  2. Create a component
  3. Open chain builder for the first time
  4. Assert a contextual hint auto-appears (without clicking "?")
  5. Dismiss the hint
  6. Close chain builder
  7. Open chain builder again
  8. Assert the contextual hint does NOT auto-appear (tracked in localStorage)
```

#### TC-8.5.5: Edge — Hint icons on formula editor and simulation speed slider

```
Steps:
  1. Open chain builder → assert "?" icon near formula editor
  2. Close chain builder
  3. Switch to Simulate tab → assert "?" icon near simulation speed slider
```

---

## E9: Collaboration Core

**Note:** All E9 tests use Playwright multi-browser-context to simulate multiple users.

---

### TEST-9.1: create-room.spec

**Story:** US-9.1 — Create Collaboration Room

#### TC-9.1.1: "Collaborate" button visible in toolbar

```
Steps:
  1. Navigate to app
  2. Assert a "Collaborate" button is visible in the app toolbar
```

#### TC-9.1.2: Clicking "Collaborate" prompts for display name and creates a room

```
Steps:
  1. Click "Collaborate" button
  2. Assert a display name input appears (modal or inline)
  3. Enter name: "Alice"
  4. Confirm
  5. Assert room modal appears
  6. Assert modal shows a shareable URL containing a "room=" parameter
  7. Assert a "Copy Link" button is visible
```

#### TC-9.1.3: Created room URL contains a unique room ID

```
Steps:
  1. Create a room with name "Alice"
  2. Extract room URL from modal
  3. Assert URL contains "?room=" followed by a non-empty ID string
  4. Create another room (new page context)
  5. Assert the two room IDs are different
```

#### TC-9.1.4: Creator is automatically the first connected participant

```
Steps:
  1. Create a room with name "Alice"
  2. Assert presence indicator shows 1 connected user
  3. Assert "Alice" appears in the participant list or presence UI
```

#### TC-9.1.5: "Copy Link" copies URL to clipboard

```
Steps:
  1. Create a room
  2. Click "Copy Link" button
  3. Read clipboard contents
  4. Assert clipboard contains the room URL with room parameter
```

#### TC-9.1.6: Edge — Empty display name rejected

```
Steps:
  1. Click "Collaborate"
  2. Leave display name empty
  3. Attempt to confirm
  4. Assert validation error (name is required)
  5. Assert room is NOT created
```

---

### TEST-9.2: join-room.spec

**Story:** US-9.2 — Join Room via Shared Link

#### TC-9.2.1: Opening URL with room parameter connects to room

```
Setup: Create room in context A, extract roomId
Steps:
  1. In context B, navigate to `/?room={roomId}`
  2. Assert display name prompt appears
  3. Enter name: "Bob"
  4. Confirm
  5. Assert model state from the room loads on canvas
  6. Assert presence shows 2 connected users
```

#### TC-9.2.2: Late joiner sees complete current state

```
Setup:
  1. Context A creates room, adds 2 components and a chain
Steps:
  1. Context B joins room via URL
  2. Assert context B's canvas shows 2 components
  3. Assert context B sees the chain edge on canvas
  4. Assert component names and parameter values match context A's model
```

#### TC-9.2.3: Error state when connecting to non-existent room

```
Steps:
  1. Navigate to `/?room=nonexistent-room-id-12345`
  2. Enter display name
  3. Assert error message appears (e.g. "Room not found" or "Connection failed")
  4. Assert "Work Offline" fallback button is visible
  5. Click "Work Offline"
  6. Assert app loads in normal (non-collaborative) mode
```

#### TC-9.2.4: Error state when server is unreachable

```
Steps:
  1. Navigate to `/?room=test-room` (with y-websocket server stopped)
  2. Enter display name
  3. Assert connection error message appears
  4. Assert "Work Offline" fallback is available
```

#### TC-9.2.5: Edge — Join room with model that has scenarios and forced events

```
Setup:
  1. Context A creates room, builds model, creates scenario with forced events
Steps:
  1. Context B joins room
  2. Switch to Scenarios tab in context B
  3. Assert scenario list shows the scenario created in context A
  4. Select the scenario
  5. Assert timeline shows forced event markers
```

---

### TEST-9.3: realtime-sync.spec

**Story:** US-9.3 — Real-Time Model Sync

#### TC-9.3.1: Adding a component syncs to other client

```
Setup: setupTwoUserRoom(browser) → { pageA, pageB }
Steps:
  1. In pageA, drag "Internal" component onto canvas, name it "Server"
  2. Wait up to 500ms
  3. In pageB, assert a component node named "Server" appears on canvas
```

#### TC-9.3.2: Editing a component name syncs to other client

```
Setup: setupTwoUserRoom → both see 1 component "Server"
Steps:
  1. In pageB, select "Server" component, change name to "Gateway"
  2. Wait up to 500ms
  3. In pageA, assert the component is now named "Gateway"
```

#### TC-9.3.3: Deleting a component syncs to other client

```
Setup: setupTwoUserRoom → both see 1 component "Server"
Steps:
  1. In pageA, select "Server", press Delete, confirm
  2. Wait up to 500ms
  3. In pageB, assert "Server" is no longer on canvas
  4. Assert pageB's canvas has 0 components
```

#### TC-9.3.4: Adding a causal chain syncs to other client

```
Setup: setupTwoUserRoom → both see 2 components ("Source", "Target")
Steps:
  1. In pageA, create a causal chain from "Source" to "Target"
  2. Wait up to 500ms
  3. In pageB, assert chain edge is visible connecting Source → Target
```

#### TC-9.3.5: Component parameter edits sync to other client

```
Setup: setupTwoUserRoom → both see component "Server" with param "load: 50"
Steps:
  1. In pageA, select "Server", change "load" value to 80
  2. Wait up to 500ms
  3. In pageB, select "Server"
  4. Assert properties panel shows "load: 80"
```

#### TC-9.3.6: Scenario changes sync to other client

```
Setup: setupTwoUserRoom → both see a model with components
Steps:
  1. In pageA, switch to Scenarios tab, create scenario "Test"
  2. Wait up to 500ms
  3. In pageB, switch to Scenarios tab
  4. Assert "Test" appears in scenario list
```

#### TC-9.3.7: Component position changes (drag) sync to other client

```
Setup: setupTwoUserRoom → both see component "Server"
Steps:
  1. In pageA, record position of "Server" node
  2. In pageA, drag "Server" node 100px to the right
  3. Wait up to 500ms
  4. In pageB, assert "Server" node position has changed (x increased)
```

#### TC-9.3.8: Concurrent edits to different components merge without conflict

```
Setup: setupTwoUserRoom → both see "A" and "B" components
Steps:
  1. Simultaneously:
     - In pageA, rename "A" to "Alpha"
     - In pageB, rename "B" to "Beta"
  2. Wait up to 1000ms
  3. In pageA, assert components are "Alpha" and "Beta"
  4. In pageB, assert components are "Alpha" and "Beta"
```

#### TC-9.3.9: Edge — Concurrent edits to same property (last-writer-wins)

```
Setup: setupTwoUserRoom → both see "Server" with param "load: 50"
Steps:
  1. In pageA, change "load" to 80
  2. Immediately in pageB, change "load" to 90
  3. Wait 1000ms for sync to settle
  4. Assert both pageA and pageB show the same value for "load" (either 80 or 90, but consistent)
```

#### TC-9.3.10: Edge — Deleting a component with chains cascades across clients

```
Setup: setupTwoUserRoom → model with "A" → "B" chain
Steps:
  1. In pageA, delete "A" (confirm cascade removal)
  2. Wait up to 500ms
  3. In pageB, assert "A" is gone from canvas
  4. In pageB, assert the chain from "A" → "B" is also removed
```

---

### TEST-9.4: per-user-undo.spec

**Story:** US-9.4 — Per-User Undo/Redo

#### TC-9.4.1: Ctrl+Z undoes only the current user's action

```
Setup: setupTwoUserRoom(browser) → { pageA, pageB }
Steps:
  1. In pageA, add a component "Alpha"
  2. Wait for sync — assert both pages show "Alpha"
  3. In pageB, add a component "Beta"
  4. Wait for sync — assert both pages show "Alpha" and "Beta"
  5. In pageA, press Ctrl+Z
  6. Wait for sync
  7. Assert pageA does NOT show "Alpha" (undone)
  8. Assert pageA still shows "Beta" (not undone — belongs to user B)
  9. Assert pageB shows "Beta" and does NOT show "Alpha"
```

#### TC-9.4.2: Ctrl+Y redoes the current user's last undone action

```
Setup: Continuation of TC-9.4.1 (Alpha undone)
Steps:
  1. In pageA, press Ctrl+Y (or Ctrl+Shift+Z)
  2. Wait for sync
  3. Assert both pages show "Alpha" and "Beta" again
```

#### TC-9.4.3: Undo/redo buttons in toolbar with correct disabled state

```
Steps:
  1. Navigate to app
  2. Assert undo button is visible but disabled (no actions to undo)
  3. Assert redo button is visible but disabled
  4. Create a component
  5. Assert undo button is now enabled
  6. Assert redo button is still disabled
  7. Click undo button
  8. Assert redo button is now enabled
  9. Assert undo button is disabled (stack empty)
```

#### TC-9.4.4: Edge — Undo survives brief disconnection/reconnection

```
Setup: setupTwoUserRoom → pageA adds a component
Steps:
  1. Simulate brief disconnection in pageA (e.g. navigate away and back, or close/reopen WebSocket)
  2. After reconnection, press Ctrl+Z in pageA
  3. Assert the component is removed (undo stack survived)
```

---

## E10: Collaboration UI

**Note:** All E10 tests use Playwright multi-browser-context to simulate multiple users.

---

### TEST-10.1: live-cursors.spec

**Story:** US-10.1 — Live Cursors

#### TC-10.1.1: Remote cursor appears on other user's canvas

```
Setup: setupTwoUserRoom(browser) → { pageA, pageB }
Steps:
  1. In pageA, move mouse to canvas coordinates (300, 300)
  2. Wait up to 200ms
  3. In pageB, assert a remote cursor element is visible on the canvas
  4. Assert the cursor has a colored arrow style
  5. Assert the cursor has a name label matching pageA's display name
```

#### TC-10.1.2: Cursor position updates in real time

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, move mouse to (200, 200)
  2. Wait for cursor to appear in pageB
  3. Record cursor position in pageB as P1
  4. In pageA, move mouse to (400, 400)
  5. Wait up to 200ms
  6. Record cursor position in pageB as P2
  7. Assert P2 is different from P1 (cursor moved)
```

#### TC-10.1.3: Each user has a unique color

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, move mouse on canvas
  2. In pageB, get color of pageA's remote cursor
  3. In pageB, move mouse on canvas
  4. In pageA, get color of pageB's remote cursor
  5. Assert the two cursor colors are different
```

#### TC-10.1.4: Local user does not see their own remote cursor

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, move mouse across canvas
  2. Assert pageA does NOT have a remote cursor element with its own display name
```

#### TC-10.1.5: Cursor disappears after user disconnects

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, move mouse on canvas
  2. Assert pageB sees pageA's cursor
  3. Close pageA (disconnect)
  4. Wait 5 seconds
  5. Assert pageB no longer shows pageA's cursor
```

#### TC-10.1.6: Edge — Cursors only shown on canvas, not in panels

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, move mouse to the left panel area (outside canvas)
  2. Wait 200ms
  3. In pageB, assert no remote cursor is visible (cursors only on canvas)
```

---

### TEST-10.2: presence-bar.spec

**Story:** US-10.2 — Presence Bar

#### TC-10.2.1: Presence bar shows connected users

```
Setup: setupTwoUserRoom(browser) → { pageA, pageB }
Steps:
  1. In pageA, assert presence bar is visible in top-right corner
  2. Assert presence bar shows 2 user avatar circles
  3. Assert participant count badge shows "2"
```

#### TC-10.2.2: Own avatar shown first with "You" label on hover

```
Setup: setupTwoUserRoom → pageA's name is "Alice"
Steps:
  1. In pageA, locate the first avatar in the presence bar
  2. Hover over it
  3. Assert tooltip shows "Alice" with "You" indicator
```

#### TC-10.2.3: Hover shows display name and current activity

```
Setup: setupTwoUserRoom → { pageA (Alice), pageB (Bob) }
Steps:
  1. In pageA, hover over the second avatar (Bob's)
  2. Assert tooltip shows "Bob"
  3. Assert tooltip shows an activity description (e.g. "Viewing Editor tab")
```

#### TC-10.2.4: User avatar disappears when they leave

```
Setup: setupTwoUserRoom → { pageA, pageB }, both showing 2 avatars
Steps:
  1. Close pageB
  2. Wait for presence update (up to 5 seconds)
  3. In pageA, assert presence bar shows 1 avatar
  4. Assert participant count badge shows "1"
```

#### TC-10.2.5: Presence bar only shows when in a room

```
Steps:
  1. Navigate to app (no room parameter)
  2. Assert presence bar is NOT visible (or not rendered)
```

#### TC-10.2.6: Edge — Avatar initials match display name

```
Setup: setupTwoUserRoom → names "Alice" and "Bob"
Steps:
  1. In pageA, assert one avatar circle shows "A" (Alice's initial)
  2. Assert another avatar shows "B" (Bob's initial)
```

---

### TEST-10.3: edit-indicators.spec

**Story:** US-10.3 — Edit Indicators

#### TC-10.3.1: Selecting a component shows colored glow for other users

```
Setup: setupTwoUserRoom → both see component "Server"
Steps:
  1. In pageA, click to select "Server" component
  2. Wait up to 500ms
  3. In pageB, assert "Server" node has a colored border glow (edit indicator)
  4. Assert glow color matches pageA's assigned user color
```

#### TC-10.3.2: Floating label shows "[User] is editing"

```
Setup: setupTwoUserRoom → { pageA (Alice), pageB }, component "Server" on canvas
Steps:
  1. In pageA, select "Server"
  2. Wait for sync
  3. In pageB, assert a floating label near "Server" node reads "Alice is editing" (or similar)
```

#### TC-10.3.3: Indicator clears when user deselects

```
Setup: setupTwoUserRoom → pageA selected "Server", pageB sees glow
Steps:
  1. In pageA, click on empty canvas (deselect)
  2. Wait up to 500ms
  3. In pageB, assert "Server" node no longer has edit indicator glow
  4. Assert no floating "[User] is editing" label
```

#### TC-10.3.4: Multiple users can have indicators on different components

```
Setup: setupTwoUserRoom → both see "A" and "B" components
Steps:
  1. In pageA, select "A"
  2. In pageB, select "B"
  3. Wait for sync
  4. In pageA, assert "B" has edit indicator with pageB's color (pageB editing "B")
  5. In pageB, assert "A" has edit indicator with pageA's color (pageA editing "A")
```

#### TC-10.3.5: Edit indicator does not block interaction

```
Setup: setupTwoUserRoom → pageA selected "Server", pageB sees glow
Steps:
  1. In pageB, click on "Server" (even though it has edit indicator from pageA)
  2. Assert pageB can select "Server" (properties panel opens)
  3. Assert pageB can edit "Server" parameters
```

#### TC-10.3.6: Edge — Indicator updates when user switches selection

```
Setup: setupTwoUserRoom → both see "A" and "B" components
Steps:
  1. In pageA, select "A" — pageB sees glow on "A"
  2. In pageA, select "B" (switches selection)
  3. Wait for sync
  4. In pageB, assert "A" no longer has edit indicator
  5. In pageB, assert "B" now has edit indicator from pageA
```

---

### TEST-10.4: share-room-modal.spec

**Story:** US-10.4 — Share Room Modal

#### TC-10.4.1: "Share" button visible when in a room

```
Setup: Create a collaboration room
Steps:
  1. Assert "Share" button is visible in the toolbar
  2. Click "Share"
  3. Assert modal appears with room link, "Copy Link" button, and user count
```

#### TC-10.4.2: Modal shows room link and connected user list

```
Setup: setupTwoUserRoom → { pageA (Alice), pageB (Bob) }
Steps:
  1. In pageA, click "Share"
  2. Assert modal shows the room URL
  3. Assert modal shows connected user count = 2
  4. Assert user list includes "Alice" and "Bob" with their assigned colors
```

#### TC-10.4.3: "Copy Link" copies URL and shows confirmation

```
Setup: Create a room
Steps:
  1. Click "Share"
  2. Click "Copy Link"
  3. Assert "Copied!" confirmation text appears
  4. Read clipboard contents
  5. Assert clipboard contains the room URL with room parameter
```

#### TC-10.4.4: Modal dismisses on outside click or Esc

```
Setup: Create a room
Steps:
  1. Click "Share" — assert modal visible
  2. Click outside the modal
  3. Assert modal is dismissed
  4. Click "Share" again — assert modal visible
  5. Press Escape
  6. Assert modal is dismissed
```

#### TC-10.4.5: "Share" button acts as "Collaborate" when not in a room

```
Steps:
  1. Navigate to app (no room)
  2. Assert toolbar shows a "Share" or "Collaborate" button
  3. Click it
  4. Assert display name prompt appears (same flow as US-9.1)
```

#### TC-10.4.6: Edge — User count updates dynamically

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, click "Share" — assert user count shows 2
  2. Close pageB
  3. Wait for presence update
  4. Assert user count in the modal updates to 1 (or close and reopen modal to verify)
```

---

### TEST-10.5: activity-bar.spec

**Story:** US-10.5 — Activity Bar

#### TC-10.5.1: Activity bar visible when in a collaboration room

```
Setup: Create a collaboration room
Steps:
  1. Assert activity bar element is visible at the bottom of the screen
```

#### TC-10.5.2: Adding a component creates an activity entry on other client

```
Setup: setupTwoUserRoom → { pageA (Alice), pageB }
Steps:
  1. In pageA, create a component named "Server"
  2. Wait up to 1000ms
  3. In pageB, assert activity bar shows an entry containing "Alice" and "Server" (e.g. "Alice added Server")
  4. Assert entry has a user color dot matching Alice's assigned color
  5. Assert entry has a relative timestamp
```

#### TC-10.5.3: Multiple action types are tracked

```
Setup: setupTwoUserRoom → { pageA (Alice), pageB (Bob) }
Steps:
  1. In pageA, add a component "Server" → assert activity entry in pageB
  2. In pageB, rename "Server" to "Gateway" → assert activity entry in pageA containing "Bob" and "edited"
  3. In pageA, delete "Gateway" → assert activity entry in pageB containing "Alice" and "deleted"
```

#### TC-10.5.4: New entries appear at the top with animation

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageB, note activity bar is empty or has existing entries
  2. In pageA, add a component
  3. Wait for entry to appear in pageB
  4. Assert the newest entry is at the top of the activity bar
  5. In pageA, add another component
  6. Wait for entry — assert the new entry is now at the top (previous moved down)
```

#### TC-10.5.5: Activity bar shows max 20 entries

```
Setup: setupTwoUserRoom → { pageA, pageB }
Steps:
  1. In pageA, perform 22 trackable actions (e.g. create and delete components repeatedly)
  2. Wait for all entries to sync
  3. In pageB, count activity bar entries
  4. Assert count <= 20 (older entries scrolled off)
```

#### TC-10.5.6: Collapse/expand toggle

```
Setup: setupTwoUserRoom → at least 1 activity entry exists
Steps:
  1. Assert activity bar is expanded (multiple entries visible)
  2. Click collapse toggle
  3. Assert activity bar is collapsed to a single line showing most recent activity
  4. Click expand toggle
  5. Assert activity bar is expanded again with all entries visible
```

#### TC-10.5.7: Edge — Activity bar not visible when not in a room

```
Steps:
  1. Navigate to app (no room)
  2. Assert activity bar is NOT visible
```

#### TC-10.5.8: Edge — Activity entries fade after 30 seconds

```
Setup: setupTwoUserRoom → create an activity entry
Steps:
  1. Assert new entry has full opacity styling
  2. Wait 30+ seconds
  3. Assert entry has muted/faded opacity styling
```

---

## Cross-Epic V2 Integration Tests

These tests verify end-to-end workflows spanning V2 epics and connecting to V1 functionality.

---

### TEST-INT-V2-1: library-to-simulate.spec

**Story:** Load a library scenario and run simulation (E7 + E5 + E6)

#### TC-INT-V2-1.1: Load library scenario → simulate → verify events

```
Steps:
  1. Open library panel (E7)
  2. Load "Supply Chain Disruption" (7 nodes)
  3. Assert 7 components on canvas
  4. Switch to Simulate tab (E1)
  5. Click Play (E5)
  6. Wait for chain events to fire
  7. Assert chain status indicators update (E6)
  8. Assert event log shows transitions (E6)
  9. Click Stop — assert values reset
```

---

### TEST-INT-V2-2: tutorial-library-step.spec

**Story:** Tutorial references scenario library (E8 + E7)

#### TC-INT-V2-2.1: Tutorial step 8 spotlights library button and library is functional

```
Steps:
  1. Start tutorial (clear localStorage)
  2. Advance to step 8 (Library button)
  3. Assert spotlight targets Library button
  4. Dismiss tour
  5. Click the Library button
  6. Assert library panel opens with 6 scenarios
```

---

### TEST-INT-V2-3: collab-with-library.spec

**Story:** Load a library scenario in a collaboration room (E9 + E7)

#### TC-INT-V2-3.1: Loading a library scenario syncs to other users

```
Setup: setupTwoUserRoom → { pageA, pageB }, empty workspace
Steps:
  1. In pageA, open library and load "Branching Paths" (4 nodes)
  2. Wait for sync
  3. In pageB, assert 4 component nodes appear on canvas
  4. In pageB, assert chain edges are visible
```

---

### TEST-INT-V2-4: collab-simulate.spec

**Story:** Run simulation in collaboration room (E9 + E10 + E5)

#### TC-INT-V2-4.1: Starting simulation in one client reflects in activity bar

```
Setup: setupTwoUserRoom → model loaded, scenario created
Steps:
  1. In pageA, switch to Simulate tab, click Play
  2. Wait up to 1000ms
  3. In pageB, assert activity bar shows "Alice started simulation" (or similar)
```

---

### TEST-INT-V2-5: info-cards-collab.spec

**Story:** Info cards in collaboration room (E7 + E9 + E10)

#### TC-INT-V2-5.1: Dismissing info card in one client syncs to other

```
Setup: setupTwoUserRoom → load "Supply Chain Disruption" in pageA, wait for sync
Steps:
  1. In pageA, count info cards as N
  2. In pageB, assert N info cards visible
  3. In pageA, dismiss one info card
  4. Wait for sync
  5. In pageB, assert N-1 info cards visible
```

---

*Generated from docs/user-stories-v2.md*
*19 stories → 19 test files → 84 test cases (including edge cases and error scenarios)*
*No mocking — all tests use real UI interactions, real Yjs sync, real application state.*
*Multi-user tests use Playwright browser contexts with real WebSocket connections.*
