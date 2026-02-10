# E2E Test Specifications: CascadeSim V2

**Source:** `docs/user-stories-v2.md`
**Generated:** 2026-02-10
**Framework:** Playwright
**Rule:** No mocking. All tests use real DOM, real state, real data.
**Base:** V1 tests (E1-E6, 122 tests) remain unchanged. V2 adds E7-E10.

---

## Conventions

- **Selectors:** Use `data-testid` attributes (e.g. `[data-testid="library-panel"]`)
- **Setup helpers:** Reusable functions that perform real UI actions (drag, click, type) to build state. No injected fixtures.
- **Assertions:** Always assert against visible DOM or computed styles, never internal state.
- **Cleanup:** Each test starts with a fresh app load (`page.goto('/')`)
- **Multi-context tests (E9, E10):** Use Playwright `browser.newContext()` to simulate multiple users in the same room. Each context is a separate browser session.
- **localStorage management:** Tests that depend on localStorage (E8) must clear it in setup via `page.evaluate(() => localStorage.clear())` before navigation.

### V2 Shared Setup Functions

These are NOT mocks. Each performs real UI interactions to build prerequisite state.

| Helper | Actions |
|--------|---------|
| `openLibraryPanel(page)` | Clicks the "Library" button in the toolbar, waits for library panel to appear |
| `loadScenarioFromLibrary(page, scenarioTitle)` | Opens library panel, clicks "Load" on the scenario matching the title, confirms if needed |
| `startTutorial(page)` | Clears `cascadesim-tutorial-complete` from localStorage, reloads page, waits for welcome overlay |
| `skipTutorial(page)` | If welcome overlay is visible, clicks "Skip" |
| `createCollaborationRoom(page, displayName)` | Clicks "Collaborate" button, enters display name, waits for room modal with shareable URL |
| `joinRoom(page, roomUrl, displayName)` | Navigates to roomUrl, enters display name on prompt, waits for model sync |
| `openTwoContextsInRoom(browser)` | Creates two browser contexts, user A creates a room, user B joins via the shared URL. Returns `{ contextA, pageA, contextB, pageB, roomUrl }` |
| `buildFloodModel(page)` | Builds the full V1 "Flood" reference model (see V1 test-specs.md for details) |

### Reference Data: Pre-Built Scenarios

The 6 pre-built scenarios are static data. Used across E7 tests.

| Scenario | Nodes | Difficulty | Color |
|----------|-------|------------|-------|
| Hello Cascade | 2 | Beginner | Green |
| Branching Paths | 4 | Beginner | Green |
| Supply Chain Disruption | 7 | Intermediate | Blue |
| Global Manufacturing Network | 12 | Advanced | Orange |
| Pandemic Stress Test | 17 | Expert | Red |
| Feedback Loop Chaos | 14 | Expert | Red |

---

## E7: Scenario Library

---

### TEST-7.1: scenario-library-panel.spec

**Story:** US-7.1 — Scenario Library Panel

#### TC-7.1.1: Library button is accessible and opens the library panel

```
Steps:
  1. Navigate to app
  2. Assert a "Library" button is visible in the toolbar or Scenarios tab area
  3. Click "Library" button
  4. Assert library panel/modal appears
  5. Assert panel contains a grid of scenario cards
```

#### TC-7.1.2: Library contains exactly 6 pre-built scenarios

```
Steps:
  1. Open library panel
  2. Assert exactly 6 scenario cards are visible
  3. Assert each card has a visible title text
  4. Assert each card has a visible description text
  5. Assert each card has a node count indicator
  6. Assert each card has a difficulty badge
```

#### TC-7.1.3: Scenario card details match expected data

```
Steps:
  1. Open library panel
  2. Locate card with title "Hello Cascade"
  3. Assert description is non-empty
  4. Assert node count shows "2"
  5. Assert difficulty badge shows "Beginner"
  6. Locate card with title "Pandemic Stress Test"
  7. Assert node count shows "17"
  8. Assert difficulty badge shows "Expert"
```

#### TC-7.1.4: Library panel can be closed

```
Steps:
  1. Open library panel
  2. Assert panel is visible
  3. Close the panel (click close button or click outside)
  4. Assert panel is no longer visible
  5. Assert normal workspace is restored
```

#### TC-7.1.5: Edge — Open library panel, close, reopen

```
Steps:
  1. Open library panel
  2. Close panel
  3. Reopen library panel
  4. Assert all 6 cards are still visible (state not corrupted)
```

---

### TEST-7.2: difficulty-badges.spec

**Story:** US-7.2 — Difficulty Badges & Color Coding

#### TC-7.2.1: Each scenario has the correct difficulty text

```
Steps:
  1. Open library panel
  2. For each scenario, locate its card and verify the difficulty badge text:
     - "Hello Cascade" -> "Beginner"
     - "Branching Paths" -> "Beginner"
     - "Supply Chain Disruption" -> "Intermediate"
     - "Global Manufacturing Network" -> "Advanced"
     - "Pandemic Stress Test" -> "Expert"
     - "Feedback Loop Chaos" -> "Expert"
```

#### TC-7.2.2: Badges are color-coded correctly

```
Steps:
  1. Open library panel
  2. Locate "Hello Cascade" badge — assert it has green color class/style (e.g. data-difficulty="beginner" or bg-green-*)
  3. Locate "Supply Chain Disruption" badge — assert blue color class/style
  4. Locate "Global Manufacturing Network" badge — assert orange color class/style
  5. Locate "Pandemic Stress Test" badge — assert red color class/style
```

#### TC-7.2.3: Difficulty distribution is correct

```
Steps:
  1. Open library panel
  2. Count badges with text "Beginner" — assert 2
  3. Count badges with text "Intermediate" — assert 1
  4. Count badges with text "Advanced" — assert 1
  5. Count badges with text "Expert" — assert 2
```

---

### TEST-7.3: filter-difficulty.spec

**Story:** US-7.3 — Filter Scenarios by Difficulty

#### TC-7.3.1: Filter chips are displayed with "All" selected by default

```
Steps:
  1. Open library panel
  2. Assert filter chips are visible: "All", "Beginner", "Intermediate", "Advanced", "Expert"
  3. Assert "All" chip is highlighted (active state)
  4. Assert 6 scenario cards are visible
```

#### TC-7.3.2: Clicking "Beginner" shows only beginner scenarios

```
Steps:
  1. Open library panel
  2. Click "Beginner" filter chip
  3. Assert "Beginner" chip is highlighted
  4. Assert "All" chip is no longer highlighted
  5. Assert exactly 2 cards are visible
  6. Assert both cards have "Beginner" difficulty badge
```

#### TC-7.3.3: Clicking "Expert" shows only expert scenarios

```
Steps:
  1. Open library panel
  2. Click "Expert" filter chip
  3. Assert exactly 2 cards are visible
  4. Assert both cards have "Expert" difficulty badge
```

#### TC-7.3.4: Clicking "Intermediate" shows only 1 scenario

```
Steps:
  1. Open library panel
  2. Click "Intermediate" filter chip
  3. Assert exactly 1 card is visible
  4. Assert card title is "Supply Chain Disruption"
```

#### TC-7.3.5: Clicking "All" resets the filter

```
Steps:
  1. Open library panel
  2. Click "Beginner" — assert 2 cards
  3. Click "All"
  4. Assert "All" chip is highlighted
  5. Assert 6 cards are visible
```

#### TC-7.3.6: Edge — Rapid filter switching

```
Steps:
  1. Open library panel
  2. Click "Beginner", then immediately "Expert", then "All" (rapid clicks)
  3. Assert final state shows 6 cards with "All" highlighted
  4. Assert no visual glitch or duplicate cards
```

---

### TEST-7.4: load-scenario.spec

**Story:** US-7.4 — Load Pre-Built Scenario

#### TC-7.4.1: Load "Hello Cascade" into empty workspace

```
Steps:
  1. Open library panel
  2. Locate "Hello Cascade" card
  3. Assert "Load" button is visible on the card
  4. Click "Load"
  5. Assert library panel closes
  6. Assert canvas shows exactly 2 component nodes
  7. Assert at least 1 chain edge is visible on canvas
  8. Assert Editor mode is active (editor tab selected)
```

#### TC-7.4.2: Loaded scenario includes components, chains, and a scenario with forced events

```
Steps:
  1. Load "Hello Cascade" from library
  2. Assert 2 components are visible on canvas with proper positioning (not overlapping)
  3. Select one component — assert properties panel shows parameters
  4. Switch to Scenarios tab
  5. Assert at least 1 scenario exists in the scenario list
  6. Select the scenario — assert forced events appear on timeline
```

#### TC-7.4.3: Confirmation dialog when workspace has existing content

```
Setup: createComponent(page, 'internal', 'Existing', [{ name: 'val', value: '5' }])
Steps:
  1. Assert canvas has 1 component ("Existing")
  2. Open library panel
  3. Click "Load" on "Branching Paths"
  4. Assert confirmation dialog appears warning about overwriting current model
  5. Click "Cancel"
  6. Assert library panel is still open
  7. Assert canvas still shows "Existing" component (unchanged)
  8. Click "Load" again on "Branching Paths"
  9. Click "Confirm" on dialog
  10. Assert "Existing" component is gone
  11. Assert canvas shows 4 components (Branching Paths model)
```

#### TC-7.4.4: Loading a different scenario replaces the previous loaded one

```
Steps:
  1. Load "Hello Cascade" — assert 2 nodes
  2. Open library panel again
  3. Click "Load" on "Supply Chain Disruption"
  4. Confirm overwrite dialog
  5. Assert canvas shows 7 components (not 2 + 7)
```

#### TC-7.4.5: Edge — Load scenario into workspace, switch tabs, verify state

```
Steps:
  1. Load "Hello Cascade"
  2. Switch to Scenarios tab — assert read-only graph shows 2 nodes
  3. Switch to Simulate tab — assert canvas still shows 2 nodes
  4. Switch back to Editor — assert 2 nodes still present and editable
```

---

### TEST-7.5: info-card-nodes.spec

**Story:** US-7.5 — Info Card Nodes

#### TC-7.5.1: Info cards appear when loading a scenario

```
Steps:
  1. Load "Supply Chain Disruption" from library
  2. Assert info card nodes appear on canvas
  3. Assert info card nodes have visually distinct styling (data-testid="info-card" or distinct class)
  4. Assert info cards have a different background color or dashed border compared to regular components
  5. Assert each info card contains explanation text (non-empty content)
```

#### TC-7.5.2: Info cards are non-interactive

```
Steps:
  1. Load "Supply Chain Disruption"
  2. Locate an info card node
  3. Right-click info card — assert "New Causal Chain from here" is NOT available
  4. Attempt to drag info card to connect a chain — assert no connection is created
  5. Click info card — assert properties panel does NOT show parameter editing UI
```

#### TC-7.5.3: Dismiss and restore info cards

```
Steps:
  1. Load "Supply Chain Disruption"
  2. Count visible info card nodes as N
  3. Assert N > 0
  4. Click the close/dismiss button on the first info card
  5. Assert info card disappears from canvas
  6. Assert remaining info card count is N - 1
  7. Locate "Show Info Cards" toggle
  8. Click toggle
  9. Assert all N info cards are visible again (dismissed card restored)
```

#### TC-7.5.4: Library cards show info card count badge

```
Steps:
  1. Open library panel
  2. Locate "Supply Chain Disruption" card
  3. Assert an info card count badge is visible (e.g. "3 info cards")
  4. Assert badge shows a number > 0
```

#### TC-7.5.5: Edge — Dismiss all info cards, then restore

```
Steps:
  1. Load a scenario with info cards
  2. Dismiss every info card one by one
  3. Assert no info cards visible
  4. Click "Show Info Cards" toggle
  5. Assert all info cards reappear
```

---

## E8: Tutorial System

---

### TEST-8.1: first-visit-trigger.spec

**Story:** US-8.1 — First-Visit Walkthrough Trigger

#### TC-8.1.1: Welcome overlay appears on first visit

```
Steps:
  1. Clear localStorage: page.evaluate(() => localStorage.clear())
  2. Navigate to app
  3. Wait up to 2 seconds
  4. Assert welcome overlay is visible
  5. Assert overlay contains app name "CascadeSim" (or similar branding)
  6. Assert overlay contains brief description text
  7. Assert "Start Tutorial" button is visible
  8. Assert "Skip" button is visible
```

#### TC-8.1.2: Clicking "Skip" dismisses overlay and sets localStorage flag

```
Steps:
  1. Clear localStorage, navigate to app
  2. Wait for welcome overlay
  3. Click "Skip"
  4. Assert overlay is dismissed (not visible)
  5. Assert normal workspace is visible
  6. Assert localStorage contains key "cascadesim-tutorial-complete"
```

#### TC-8.1.3: Subsequent visits do not trigger the walkthrough

```
Steps:
  1. Clear localStorage, navigate to app
  2. Click "Skip" on welcome overlay
  3. Reload page (page.reload())
  4. Wait 2 seconds
  5. Assert welcome overlay does NOT appear
```

#### TC-8.1.4: Clearing localStorage re-triggers the walkthrough

```
Steps:
  1. Set localStorage flag, navigate to app — assert no overlay
  2. Clear localStorage via page.evaluate(() => localStorage.removeItem('cascadesim-tutorial-complete'))
  3. Reload page
  4. Wait up to 2 seconds
  5. Assert welcome overlay appears
```

#### TC-8.1.5: Edge — Clicking "Start Tutorial" begins guided tour

```
Steps:
  1. Clear localStorage, navigate to app
  2. Wait for welcome overlay
  3. Click "Start Tutorial"
  4. Assert welcome overlay is dismissed
  5. Assert tour step 1 spotlight/popover is visible (Driver.js highlight active)
```

---

### TEST-8.2: guided-tour-steps.spec

**Story:** US-8.2 — Guided Tour Steps

#### TC-8.2.1: Tour has 8 steps with correct targets

```
Steps:
  1. Start tutorial (clear localStorage, navigate, click "Start Tutorial")
  2. Assert step 1 popover is visible with title related to "Canvas navigation"
  3. Assert step counter shows "1 of 8"
  4. Assert a spotlight/dimmed-backdrop highlights the canvas area
  5. Click "Next"
  6. Assert step 2 popover relates to "Component palette"
  7. Assert step counter shows "2 of 8"
  8. Continue clicking "Next" through all steps:
     - Step 3: "Property editor"
     - Step 4: "Causal chain builder"
     - Step 5: "Scenario tab"
     - Step 6: "Forced events / timeline"
     - Step 7: "Simulate tab"
     - Step 8: "Scenario library"
  9. After step 8, assert tour completes (no more popover)
```

#### TC-8.2.2: Progress dots update correctly

```
Steps:
  1. Start tutorial
  2. At step 1: assert 1 active dot, 0 filled, 7 empty
  3. Click "Next" to step 2: assert 1 filled, 1 active, 6 empty
  4. Click "Next" to step 3: assert 2 filled, 1 active, 5 empty
  5. Continue verifying through all 8 steps
```

#### TC-8.2.3: "Back" button navigates to previous step

```
Steps:
  1. Start tutorial
  2. Navigate to step 3
  3. Assert step counter shows "3 of 8"
  4. Click "Back"
  5. Assert step counter shows "2 of 8"
  6. Assert step 2 popover is shown with correct content
```

#### TC-8.2.4: Esc key dismisses the tour at any point

```
Steps:
  1. Start tutorial
  2. Navigate to step 4
  3. Press Escape key
  4. Assert tour is dismissed (no popover, no spotlight)
  5. Assert normal app state is restored
  6. Assert localStorage flag is set (tutorial considered complete)
```

#### TC-8.2.5: Arrow keys navigate between steps

```
Steps:
  1. Start tutorial, at step 1
  2. Press ArrowRight
  3. Assert step 2 is shown
  4. Press ArrowRight
  5. Assert step 3 is shown
  6. Press ArrowLeft
  7. Assert step 2 is shown again
```

#### TC-8.2.6: Edge — "Back" at step 1 does nothing

```
Steps:
  1. Start tutorial, at step 1
  2. Click "Back" (or press ArrowLeft)
  3. Assert still on step 1 (step counter shows "1 of 8")
  4. Assert no error
```

---

### TEST-8.3: action-progression.spec

**Story:** US-8.3 — Action-Based Step Progression

#### TC-8.3.1: Step 2 requires dragging a component

```
Steps:
  1. Start tutorial, navigate to step 2 (Component palette)
  2. Assert "Next" button is disabled
  3. Assert action prompt is visible (e.g. "Drag an Internal component onto the canvas")
  4. Drag an "Internal" component from palette to canvas
  5. Assert success indicator appears (checkmark animation or similar)
  6. Assert "Next" button becomes enabled
  7. Click "Next" — assert advances to step 3
```

#### TC-8.3.2: Step 3 requires renaming a component

```
Steps:
  1. Advance to step 3 (Property editor) — prerequisite: component exists from step 2
  2. Assert "Next" button is disabled
  3. Assert action prompt describes renaming the component
  4. Change the component's name in the property editor
  5. Assert success indicator appears
  6. Assert "Next" button becomes enabled
```

#### TC-8.3.3: Step 7 requires clicking "Run"

```
Steps:
  1. Advance to step 7 (Simulate tab)
  2. Assert "Next" button is disabled
  3. Assert action prompt describes clicking the "Run" button
  4. Click the "Run" / Play button
  5. Assert success indicator appears
  6. Assert "Next" button becomes enabled
```

#### TC-8.3.4: "Skip" link bypasses action requirement

```
Steps:
  1. Advance to step 2 (action required)
  2. Assert "Next" button is disabled
  3. Assert "Skip" link is visible
  4. Click "Skip"
  5. Assert advances to step 3 without performing the action
```

#### TC-8.3.5: Edge — Performing action then navigating back and forward

```
Steps:
  1. At step 2, drag component (action completed)
  2. Click "Next" to step 3
  3. Click "Back" to step 2
  4. Assert step 2 shows completed state (action already done)
  5. Assert "Next" is still enabled (don't need to redo action)
```

---

### TEST-8.4: replay-tutorial.spec

**Story:** US-8.4 — Replay Tutorial via Help Button

#### TC-8.4.1: Help button is always visible

```
Steps:
  1. Navigate to app (skip tutorial if shown)
  2. Assert "?" button is visible in the bottom-right corner
  3. Switch to Scenarios tab — assert "?" button still visible
  4. Switch to Simulate tab — assert "?" button still visible
```

#### TC-8.4.2: Help menu opens with expected options

```
Steps:
  1. Click "?" button
  2. Assert help menu appears
  3. Assert menu contains "Replay Tutorial" option
  4. Assert menu contains "Keyboard Shortcuts" option
```

#### TC-8.4.3: "Replay Tutorial" starts the walkthrough

```
Steps:
  1. Click "?" button
  2. Click "Replay Tutorial"
  3. Assert tour step 1 spotlight/popover appears
  4. Assert step counter shows "1 of 8"
  5. Assert it is the same tour as the first-visit walkthrough
```

#### TC-8.4.4: Help menu closes when clicking outside

```
Steps:
  1. Click "?" button — assert menu visible
  2. Click on empty canvas area
  3. Assert help menu is dismissed
```

#### TC-8.4.5: Edge — Help button does not overlap canvas controls

```
Steps:
  1. Navigate to app
  2. Locate "?" button bounding box
  3. Locate zoom controls bounding box
  4. Assert bounding boxes do not overlap
```

#### TC-8.4.6: Edge — Dismiss tour and verify app state restored

```
Steps:
  1. Build a model with components and chains
  2. Click "?" then "Replay Tutorial"
  3. Navigate to step 4, then press Esc
  4. Assert all previously-created components and chains are still on canvas
  5. Assert app is fully functional (can create new components)
```

---

### TEST-8.5: contextual-hints.spec

**Story:** US-8.5 — Contextual Hints on Complex Elements

#### TC-8.5.1: "?" icon on chain builder modal

```
Setup: createComponent(page, 'internal', 'A', [{ name: 'x', value: '1' }])
Steps:
  1. Right-click "A" then "New Causal Chain from here"
  2. Assert chain builder dialog opens
  3. Assert a "?" hint icon is visible near the dialog header
  4. Click the "?" icon
  5. Assert tooltip/popover appears with explanation text (non-empty, 1-2 sentences)
  6. Assert tooltip matches dark theme styling
```

#### TC-8.5.2: Tooltip dismisses on click outside or Esc

```
Setup: Open chain builder, click "?" icon to show tooltip
Steps:
  1. Assert tooltip is visible
  2. Click outside the tooltip
  3. Assert tooltip is dismissed
  4. Click "?" icon again — assert tooltip reappears
  5. Press Escape
  6. Assert tooltip is dismissed
```

#### TC-8.5.3: First-time chain builder hint auto-appears

```
Steps:
  1. Clear localStorage (remove all cascadesim-first-use-* keys)
  2. Navigate to app
  3. Create a component
  4. Open chain builder for the first time
  5. Assert a contextual hint auto-appears (without clicking "?")
  6. Dismiss the hint
  7. Close chain builder
  8. Open chain builder again
  9. Assert contextual hint does NOT auto-appear (tracked in localStorage)
```

#### TC-8.5.4: Edge — Hint icons on other complex elements

```
Steps:
  1. Navigate to app, skip tutorial
  2. Switch to Simulate tab
  3. Assert "?" hint icon is visible near the simulation speed slider
  4. Click it — assert tooltip with explanation appears
```

---

### TEST-8.6: results-side-panel.spec

**Story:** US-8.6 — Simulation Results Side Panel

#### TC-8.6.1: Simulation results appear in docked right panel

```
Setup: buildFloodModel(page), create scenario with forced events, run simulation
Steps:
  1. Assert simulation results are visible
  2. Assert results are inside a right-docked side panel (data-testid="results-side-panel")
  3. Assert panel is positioned on the right edge of the viewport
  4. Assert panel does NOT have overlay/backdrop behavior (no dimmed background)
  5. Assert canvas area is still visible to the left of the panel
```

#### TC-8.6.2: Panel default width is 350px

```
Setup: Run simulation to open results panel
Steps:
  1. Assert results panel is visible
  2. Measure panel width via bounding box
  3. Assert width is approximately 350px (±10px tolerance)
```

#### TC-8.6.3: Panel is resizable via draggable divider

```
Setup: Run simulation to open results panel
Steps:
  1. Locate the draggable divider element (data-testid="panel-resize-divider")
  2. Assert divider is visible on the left edge of the panel
  3. Drag divider 100px to the left (expanding panel)
  4. Assert panel width increased to approximately 450px
  5. Drag divider 200px to the right (shrinking panel)
  6. Assert panel width decreased to approximately 250px
```

#### TC-8.6.4: Panel respects min/max width constraints

```
Setup: Run simulation to open results panel
Steps:
  1. Drag divider far to the right (attempt to shrink below 250px)
  2. Assert panel width does not go below 250px
  3. Drag divider far to the left (attempt to expand beyond 500px)
  4. Assert panel width does not exceed 500px
```

#### TC-8.6.5: Collapse and expand toggle

```
Setup: Run simulation to open results panel
Steps:
  1. Assert panel is visible with results content
  2. Locate collapse/expand toggle button (data-testid="panel-collapse-toggle")
  3. Click toggle button
  4. Assert panel collapses (width near 0 or hidden)
  5. Assert canvas reclaims full viewport width
  6. Click toggle button again
  7. Assert panel re-expands to previous width
  8. Assert results content is still visible
```

#### TC-8.6.6: Canvas remains interactive with panel open

```
Setup: Run simulation, results panel open, components on canvas
Steps:
  1. Assert results panel is visible
  2. Pan the canvas (mousedown + drag on canvas area)
  3. Assert canvas pans successfully (viewport moves)
  4. Zoom the canvas (scroll wheel on canvas)
  5. Assert canvas zooms successfully
  6. Click a component node on the canvas
  7. Assert component is selected (properties panel shows it)
```

#### TC-8.6.7: ReactFlow fitView called on panel state change

```
Setup: Run simulation, components on canvas
Steps:
  1. Record component node positions before panel opens
  2. Open results panel (run simulation or expand)
  3. Assert fitView was triggered — nodes should be repositioned to fit the reduced canvas viewport
  4. Collapse the panel
  5. Assert fitView was triggered again — nodes adjust to full-width canvas
```

#### TC-8.6.8: Edge — Rapid resize does not corrupt layout

```
Setup: Run simulation to open results panel
Steps:
  1. Rapidly drag divider back and forth 5 times
  2. Assert panel has a valid width within 250–500px range
  3. Assert canvas is not clipped or overlapping the panel
  4. Assert results content is still rendered correctly
```

---

### TEST-8.7: elk-auto-layout.spec

**Story:** US-8.7 — ELK.js Auto-Layout

#### TC-8.7.1: Loading a scenario from library applies ELK auto-layout

```
Steps:
  1. Open library panel
  2. Load "Supply Chain Disruption" (7 nodes)
  3. Assert all 7 component nodes are visible on canvas
  4. Record positions of all nodes
  5. Assert no two nodes overlap (bounding boxes do not intersect)
  6. Assert nodes are generally arranged left-to-right (LR direction):
     - Source/root nodes have smaller X positions than downstream nodes
```

#### TC-8.7.2: Re-Layout button is visible in canvas toolbar

```
Steps:
  1. Load a scenario from library
  2. Assert "Re-Layout" button is visible in the canvas toolbar (data-testid="relayout-button")
  3. Click "Re-Layout"
  4. Assert dropdown menu appears with options: "LR", "TB", "Compact"
```

#### TC-8.7.3: Re-Layout with TB direction arranges nodes vertically

```
Setup: Load "Supply Chain Disruption" (initially laid out LR)
Steps:
  1. Record node positions (LR layout)
  2. Click "Re-Layout" > "TB"
  3. Wait for layout animation to complete
  4. Record new node positions
  5. Assert nodes are now arranged top-to-bottom:
     - Source/root nodes have smaller Y positions than downstream nodes
  6. Assert no two nodes overlap
```

#### TC-8.7.4: Re-Layout with Compact mode reduces spacing

```
Setup: Load "Supply Chain Disruption"
Steps:
  1. Click "Re-Layout" > "LR" — record bounding box of all nodes (total area)
  2. Click "Re-Layout" > "Compact"
  3. Record new bounding box of all nodes
  4. Assert compact bounding box area is smaller than LR bounding box area
  5. Assert no nodes overlap in compact mode
```

#### TC-8.7.5: Layout follows causal chain order

```
Setup: Load "Hello Cascade" (2 nodes, 1 chain: A -> B)
Steps:
  1. Assert 2 nodes visible
  2. Record position of source node (A) and target node (B)
  3. In LR mode: assert A.x < B.x (source is left of target)
  4. Click "Re-Layout" > "TB"
  5. Assert A.y < B.y (source is above target)
```

#### TC-8.7.6: fitView called after layout completes

```
Setup: Load scenario from library
Steps:
  1. Assert all nodes are visible within the canvas viewport (none clipped off-screen)
  2. Click "Re-Layout" > "TB"
  3. Assert all nodes are still visible within the canvas viewport after re-layout
```

#### TC-8.7.7: Edge — Re-layout after manual node repositioning

```
Steps:
  1. Load scenario from library (auto-layout applied)
  2. Manually drag one node to a far corner of the canvas
  3. Click "Re-Layout" > "LR"
  4. Assert the manually-moved node is repositioned back into the layout flow
  5. Assert no overlapping nodes
```

#### TC-8.7.8: Edge — Re-Layout button not visible when canvas is empty

```
Steps:
  1. Navigate to app with empty workspace (no components)
  2. Assert "Re-Layout" button is either not visible or disabled
  3. Create a single component manually
  4. Assert "Re-Layout" button becomes enabled
```

---

## E9: Collaboration Core

**Note:** All E9 tests use Playwright multi-browser-context to simulate multiple users. A running y-websocket server is required (e.g. `npx y-websocket`).

---

### TEST-9.1: create-room.spec

**Story:** US-9.1 — Create Collaboration Room

#### TC-9.1.1: "Collaborate" button creates a room with shareable URL

```
Steps:
  1. Navigate to app
  2. Assert "Collaborate" button is visible in the toolbar
  3. Click "Collaborate"
  4. Assert display name prompt appears
  5. Enter name: "Alice"
  6. Confirm
  7. Assert room modal appears
  8. Assert modal contains a URL with a ?room= parameter
  9. Assert "Copy Link" button is visible
  10. Assert the user "Alice" appears as a connected participant
```

#### TC-9.1.2: "Copy Link" copies URL to clipboard

```
Steps:
  1. Create a room as "Alice"
  2. Click "Copy Link"
  3. Read clipboard content via page.evaluate(() => navigator.clipboard.readText())
  4. Assert clipboard contains a URL with ?room= parameter
```

#### TC-9.1.3: Room ID is unique per creation

```
Steps:
  1. Create room in context A — record room URL as URL_A
  2. Close modal
  3. Create a new page (context B) and navigate to app
  4. Click "Collaborate" in context B — record room URL as URL_B
  5. Assert URL_A !== URL_B (unique room IDs)
```

#### TC-9.1.4: Edge — Empty display name rejected

```
Steps:
  1. Click "Collaborate"
  2. Leave display name empty
  3. Attempt to confirm
  4. Assert validation error: display name is required
  5. Assert room is NOT created
```

---

### TEST-9.2: join-room.spec

**Story:** US-9.2 — Join Room via Shared Link

#### TC-9.2.1: Opening URL with room parameter joins the room

```
Steps:
  1. In context A, create a room as "Alice", build a model with 1 component "Server"
  2. Copy room URL
  3. In context B, navigate to the room URL
  4. Assert display name prompt appears
  5. Enter name: "Bob"
  6. Confirm
  7. Assert context B's canvas shows the "Server" component (state synced from room)
```

#### TC-9.2.2: Late joiner sees complete current state

```
Steps:
  1. Context A creates room, adds 3 components with chains and a scenario
  2. After 2 seconds, context B joins the room
  3. Assert context B sees all 3 components on canvas
  4. Assert context B sees chain edges on canvas
  5. Switch to Scenarios tab in context B — assert scenario exists
```

#### TC-9.2.3: Error state for non-existent or unreachable room

```
Steps:
  1. Navigate to /?room=nonexistent-room-12345
  2. Enter display name
  3. Assert error message appears (e.g. "Room not found" or "Unable to connect")
  4. Assert "Work Offline" fallback button is visible
  5. Click "Work Offline"
  6. Assert app loads normally without collaboration features
```

#### TC-9.2.4: Edge — Join room with existing local model

```
Steps:
  1. In context B, create a local component "Local"
  2. Navigate to a room URL where context A has component "Remote"
  3. Assert local model is replaced by room state (shows "Remote", not "Local")
```

---

### TEST-9.3: realtime-sync.spec

**Story:** US-9.3 — Real-Time Model Sync

#### TC-9.3.1: Adding a component syncs to other client

```
Steps:
  1. Open two contexts in the same room (Alice and Bob)
  2. In context A, create an internal component "Pump" with param flowRate=100
  3. Wait up to 500ms
  4. Assert context B's canvas shows a node named "Pump"
  5. Click "Pump" in context B — assert properties show flowRate: 100
```

#### TC-9.3.2: Renaming a component syncs to other client

```
Steps:
  1. Two contexts in same room. Context A creates "Pump"
  2. Wait for sync
  3. In context A, select "Pump", change name to "SuperPump"
  4. Wait up to 500ms
  5. Assert context B shows node named "SuperPump" (not "Pump")
```

#### TC-9.3.3: Deleting a component syncs to other client

```
Steps:
  1. Two contexts in same room. Context A creates "Pump"
  2. Wait for sync — verify context B sees "Pump"
  3. In context A, select "Pump", press Delete, confirm
  4. Wait up to 500ms
  5. Assert context B's canvas no longer shows "Pump"
```

#### TC-9.3.4: Adding a causal chain syncs to other client

```
Steps:
  1. Two contexts in same room
  2. In context A, create components "Source" and "Target" with params
  3. Wait for sync
  4. In context A, create a causal chain from "Source" to "Target"
  5. Wait up to 500ms
  6. Assert context B shows chain edges between "Source" and "Target"
```

#### TC-9.3.5: Scenario changes sync to other client

```
Steps:
  1. Two contexts in same room with a model
  2. In context A, switch to Scenarios tab and create scenario "Test"
  3. Wait for sync
  4. In context B, switch to Scenarios tab
  5. Assert "Test" scenario appears in context B's scenario list
```

#### TC-9.3.6: Component position changes (drag) sync to other client

```
Steps:
  1. Two contexts in same room with a component "Node"
  2. In context A, drag "Node" 200px to the right
  3. Wait up to 500ms
  4. Record position of "Node" in context A as (x_a, y_a)
  5. Record position of "Node" in context B as (x_b, y_b)
  6. Assert positions approximately match (within +-10px tolerance)
```

#### TC-9.3.7: Concurrent edits to different components merge cleanly

```
Steps:
  1. Two contexts in same room. Both see components "A" and "B"
  2. Context A renames "A" to "Alpha"
  3. Context B (simultaneously) renames "B" to "Beta"
  4. Wait up to 1000ms
  5. Assert both contexts show "Alpha" and "Beta" (no conflict, CRDT merge)
```

#### TC-9.3.8: Edge — Concurrent edits to same component property (last-writer-wins)

```
Steps:
  1. Two contexts in same room. Both see component "Shared" with param value=10
  2. Context A changes value to 20
  3. Context B changes value to 30 (slightly after A)
  4. Wait up to 1000ms
  5. Assert both contexts converge to the same value (last-writer-wins)
  6. Assert values are identical on both contexts (no divergence)
```

---

### TEST-9.4: per-user-undo.spec

**Story:** US-9.4 — Per-User Undo/Redo

#### TC-9.4.1: Ctrl+Z undoes only the current user's action

```
Steps:
  1. Two contexts in same room
  2. In context A, create component "FromA"
  3. Wait for sync — both contexts see "FromA"
  4. In context B, create component "FromB"
  5. Wait for sync — both contexts see "FromA" and "FromB"
  6. In context A, press Ctrl+Z
  7. Wait up to 500ms
  8. Assert context A's canvas does NOT show "FromA" (undone)
  9. Assert context A's canvas STILL shows "FromB" (not affected)
  10. Assert context B's canvas shows "FromB" but not "FromA"
```

#### TC-9.4.2: Ctrl+Y redoes the current user's last undone action

```
Steps:
  1. From TC-9.4.1 final state (context A undid "FromA")
  2. In context A, press Ctrl+Y (or Ctrl+Shift+Z)
  3. Wait up to 500ms
  4. Assert "FromA" reappears on both contexts' canvases
```

#### TC-9.4.3: Undo/redo buttons in toolbar with correct disabled states

```
Steps:
  1. Navigate to app in a collaboration room
  2. Assert Undo button is visible and disabled (no actions yet)
  3. Assert Redo button is visible and disabled
  4. Create a component
  5. Assert Undo button becomes enabled
  6. Assert Redo button remains disabled
  7. Click Undo — assert Redo button becomes enabled
  8. Click Redo — assert Redo button becomes disabled again
```

#### TC-9.4.4: Edge — Undo at empty stack does nothing

```
Steps:
  1. Open app in a collaboration room, no actions taken
  2. Press Ctrl+Z
  3. Assert no error
  4. Assert canvas unchanged
```

#### TC-9.4.5: Edge — Undo survives brief disconnection

```
Steps:
  1. Create a room, add 2 components
  2. Simulate brief disconnect (e.g. go offline and reconnect)
  3. Press Ctrl+Z
  4. Assert last component is removed (undo stack survived reconnection)
```

---

## E10: Collaboration UI

**Note:** All E10 tests require a collaboration room (E9). Use `openTwoContextsInRoom(browser)` helper.

---

### TEST-10.1: live-cursors.spec

**Story:** US-10.1 — Live Cursors

#### TC-10.1.1: Remote cursor appears on other user's canvas

```
Steps:
  1. Open two contexts in same room (Alice and Bob)
  2. In context A, move mouse to center of canvas area
  3. Wait up to 200ms
  4. Assert context B shows a colored cursor element (data-testid="remote-cursor" or similar)
  5. Assert cursor has a name label showing "Alice"
```

#### TC-10.1.2: Cursor position updates in real time

```
Steps:
  1. Two contexts in same room
  2. In context A, move mouse to position (200, 200) on canvas
  3. Wait briefly
  4. Record remote cursor position in context B as (x1, y1)
  5. In context A, move mouse to position (400, 400) on canvas
  6. Wait briefly
  7. Record remote cursor position in context B as (x2, y2)
  8. Assert (x2, y2) is different from (x1, y1) — cursor moved
```

#### TC-10.1.3: Each user gets a unique color

```
Steps:
  1. Two contexts in same room
  2. Record the color of Alice's remote cursor in context B
  3. Record the color of Bob's remote cursor in context A
  4. Assert the two colors are different
```

#### TC-10.1.4: Local user does not see their own remote cursor

```
Steps:
  1. Two contexts in same room
  2. In context A, move mouse on canvas
  3. Assert context A does NOT show a remote cursor for "Alice"
  4. Assert context A only shows a remote cursor for "Bob"
```

#### TC-10.1.5: Cursor disappears after disconnection

```
Steps:
  1. Two contexts in same room
  2. Assert context A shows Bob's cursor
  3. Close context B (disconnect Bob)
  4. Wait up to 5 seconds
  5. Assert context A no longer shows Bob's cursor
```

#### TC-10.1.6: Edge — Cursors only shown on canvas, not in panels

```
Steps:
  1. Two contexts in same room
  2. In context A, move mouse over the left panel (not canvas)
  3. Assert context B does NOT show a remote cursor for Alice
  4. In context A, move mouse back to canvas
  5. Assert context B shows Alice's cursor
```

---

### TEST-10.2: presence-bar.spec

**Story:** US-10.2 — Presence Bar

#### TC-10.2.1: Presence bar shows connected users

```
Steps:
  1. Open two contexts in same room (Alice and Bob)
  2. In context A, assert presence bar is visible in top-right area
  3. Assert presence bar shows 2 user avatars (colored circles with initial letters)
  4. Assert participant count badge shows "2"
```

#### TC-10.2.2: Own avatar is shown first with "You" label

```
Steps:
  1. Two contexts in same room (Alice's view)
  2. Locate first avatar in context A's presence bar
  3. Hover over it
  4. Assert tooltip shows "You" or "Alice (You)"
```

#### TC-10.2.3: Hovering avatar shows display name and activity

```
Steps:
  1. Two contexts in same room
  2. In context A, hover over Bob's avatar in the presence bar
  3. Assert tooltip shows "Bob"
  4. Assert tooltip includes activity info (e.g. "Viewing Editor" or "Editing Component X")
```

#### TC-10.2.4: User disappears from presence bar on disconnect

```
Steps:
  1. Two contexts in same room — presence bar shows 2 avatars
  2. Close context B (Bob disconnects)
  3. Wait up to 5 seconds
  4. Assert context A's presence bar shows 1 avatar
  5. Assert participant count badge shows "1"
```

#### TC-10.2.5: Presence bar not shown when not in a room

```
Steps:
  1. Navigate to app without a room parameter
  2. Assert presence bar is NOT visible
```

#### TC-10.2.6: Edge — Third user joins

```
Steps:
  1. Two contexts in room (Alice and Bob)
  2. Assert presence bar shows 2 avatars
  3. Create third context, join same room as "Charlie"
  4. Assert all three contexts' presence bars show 3 avatars
  5. Assert participant count shows "3"
```

---

### TEST-10.3: edit-indicators.spec

**Story:** US-10.3 — Edit Indicators

#### TC-10.3.1: Selecting a component shows edit indicator for others

```
Setup: Two contexts in same room, a component "Server" on canvas
Steps:
  1. In context A, click to select "Server" component
  2. Wait up to 500ms
  3. Assert context B shows a colored glow/border around "Server" node
  4. Assert context B shows a label near "Server": "Alice is editing" (or similar)
```

#### TC-10.3.2: Deselecting clears the edit indicator

```
Steps:
  1. Context A selects "Server" — context B sees indicator
  2. Context A clicks on empty canvas (deselects)
  3. Wait up to 500ms
  4. Assert context B no longer shows glow or label on "Server"
```

#### TC-10.3.3: Multiple users editing different components simultaneously

```
Setup: Two contexts in same room, components "A" and "B" on canvas
Steps:
  1. Context A selects "A"
  2. Context B selects "B"
  3. Wait up to 500ms
  4. Assert context A sees edit indicator on "B" (from Bob)
  5. Assert context B sees edit indicator on "A" (from Alice)
  6. Assert indicators have different colors matching each user's assigned color
```

#### TC-10.3.4: Edit indicator color matches user's assigned color

```
Steps:
  1. Two contexts in same room
  2. Record Alice's color from the presence bar in context B
  3. Context A selects a component
  4. Assert the edit indicator glow color in context B matches Alice's presence bar color
```

#### TC-10.3.5: Edge — Edit indicator does not block interaction

```
Setup: Two contexts in same room, component "Shared" on canvas
Steps:
  1. Context A selects "Shared" — context B sees edit indicator
  2. In context B, click "Shared" (despite the edit indicator)
  3. Assert context B can select and edit "Shared" (interaction not blocked)
  4. Assert context B's properties panel shows "Shared" parameters
```

---

### TEST-10.4: share-room-modal.spec

**Story:** US-10.4 — Share Room Modal

#### TC-10.4.1: "Share" button opens modal with room link and user list

```
Steps:
  1. Create a room as "Alice"
  2. Assert "Share" button is visible in toolbar
  3. Click "Share"
  4. Assert modal appears
  5. Assert modal contains a room link (URL with ?room= parameter)
  6. Assert "Copy Link" button is visible
  7. Assert connected user count is shown (e.g. "1 connected")
  8. Assert user list shows "Alice"
```

#### TC-10.4.2: "Copy Link" copies URL to clipboard with confirmation

```
Steps:
  1. Create a room, click "Share"
  2. Click "Copy Link"
  3. Assert "Copied!" confirmation text appears briefly
  4. Read clipboard — assert it contains the room URL
```

#### TC-10.4.3: User list updates when new user joins

```
Steps:
  1. Alice creates room, opens Share modal — shows 1 user
  2. Bob joins the room (context B)
  3. Wait up to 1 second
  4. Assert Share modal in context A now shows 2 users
  5. Assert "Bob" appears in the user list
```

#### TC-10.4.4: Modal dismisses on click outside or Esc

```
Steps:
  1. Create room, click "Share" — modal visible
  2. Press Escape
  3. Assert modal is dismissed
  4. Click "Share" again — modal visible
  5. Click outside the modal
  6. Assert modal is dismissed
```

#### TC-10.4.5: "Share" acts as "Collaborate" when not in a room

```
Steps:
  1. Navigate to app without a room (no collaboration active)
  2. Assert toolbar shows "Share" (or "Collaborate") button
  3. Click it
  4. Assert display name prompt appears (creates a new room, same as US-9.1)
```

#### TC-10.4.6: Edge — Share modal reflects correct connected user count

```
Steps:
  1. Three users in a room (Alice, Bob, Charlie)
  2. Alice opens Share modal — assert count shows "3"
  3. Bob disconnects
  4. Wait up to 5 seconds
  5. Assert count in Alice's Share modal updates to "2"
```

---

### TEST-10.5: activity-bar.spec

**Story:** US-10.5 — Activity Bar

#### TC-10.5.1: Activity bar appears in collaboration room

```
Steps:
  1. Create a collaboration room
  2. Assert activity bar is visible at the bottom of the screen
  3. Assert activity bar is initially empty or shows a "session started" entry
```

#### TC-10.5.2: Component add activity logged

```
Steps:
  1. Two contexts in same room (Alice and Bob)
  2. In context A, create component "Pump"
  3. Wait up to 1 second
  4. Assert context B's activity bar shows entry: "[Alice] added Pump" (or similar)
  5. Assert entry includes a user color dot
  6. Assert entry includes a relative timestamp (e.g. "just now")
```

#### TC-10.5.3: Component edit activity logged

```
Steps:
  1. Two contexts in same room with component "Pump"
  2. In context B, rename "Pump" to "SuperPump"
  3. Wait up to 1 second
  4. Assert context A's activity bar shows "[Bob] edited SuperPump"
```

#### TC-10.5.4: Component delete activity logged

```
Steps:
  1. Two contexts in same room with component "Pump"
  2. In context A, delete "Pump"
  3. Wait up to 1 second
  4. Assert context B's activity bar shows "[Alice] deleted Pump"
```

#### TC-10.5.5: Chain and scenario activities logged

```
Steps:
  1. Two contexts in same room with a model
  2. In context A, create a causal chain
  3. Assert context B's activity bar shows "[Alice] added [chain name]"
  4. In context A, switch to Scenarios and create scenario "Test"
  5. Assert context B's activity bar shows "[Alice] modified scenario"
```

#### TC-10.5.6: Activity bar shows max 20 entries

```
Steps:
  1. Two contexts in same room
  2. Perform 25 distinct actions in context A (create/rename/delete components rapidly)
  3. Assert context B's activity bar shows no more than 20 entries
  4. Assert most recent entries are at the top
  5. Assert oldest entries are no longer visible (scrolled off)
```

#### TC-10.5.7: Activity bar collapse/expand toggle

```
Steps:
  1. Create room, perform some actions to populate activity bar
  2. Assert activity bar is expanded (shows multiple entries)
  3. Click collapse toggle
  4. Assert activity bar collapses to a single line showing most recent entry
  5. Click expand toggle
  6. Assert activity bar expands back to show all entries
```

#### TC-10.5.8: Activity bar not shown when not in a room

```
Steps:
  1. Navigate to app without a room parameter
  2. Assert activity bar is NOT visible
```

#### TC-10.5.9: Edge — Entries fade after 30 seconds

```
Steps:
  1. Two contexts in same room
  2. Context A creates a component — entry appears in context B
  3. Assert entry has full opacity initially
  4. Wait 30+ seconds
  5. Assert entry has reduced/muted opacity (CSS opacity change)
```

---

## Cross-Epic Integration Tests (V2)

These tests verify end-to-end workflows spanning V2 epics.

---

### TEST-INT-V2-1: library-to-tutorial.spec

**Story:** Library scenario loaded, then tutorial replayed

#### TC-INT-V2-1.1: Load scenario from library, then replay tutorial

```
Steps:
  1. Load "Hello Cascade" from library (E7)
  2. Assert 2 components on canvas
  3. Click "?" then "Replay Tutorial" (E8)
  4. Assert tour step 1 appears
  5. Navigate through tour steps — assert loaded model persists on canvas during tour
  6. Complete or dismiss tour
  7. Assert "Hello Cascade" components are still on canvas
```

---

### TEST-INT-V2-2: collab-with-library.spec

**Story:** One user loads a library scenario in a collaboration room

#### TC-INT-V2-2.1: Library load syncs to collaborators

```
Steps:
  1. Open two contexts in same room (E9)
  2. In context A, load "Supply Chain Disruption" from library (E7)
  3. Wait for sync
  4. Assert context B shows 7 components on canvas
  5. Assert context B sees info card nodes
  6. Assert activity bar shows "[Alice] loaded scenario" or similar (E10)
```

---

### TEST-INT-V2-3: collab-full-workflow.spec

**Story:** Complete collaboration workflow from room creation to simulation

#### TC-INT-V2-3.1: Create room then Build model then Simulate together

```
Steps:
  1. Context A creates a collaboration room (E9)
  2. Context B joins the room (E9)
  3. Context A creates component "Sensor" with param temp=20 (syncs to B via E9)
  4. Context B creates component "Alarm" with param threshold=50 (syncs to A via E9)
  5. Assert both contexts show both components
  6. Assert presence bar shows 2 users (E10)
  7. Assert activity bar shows both additions (E10)
  8. Context A creates a causal chain from "Sensor" to "Alarm" (syncs)
  9. Context A switches to Scenarios, creates scenario with forced event
  10. Context B switches to Simulate tab and clicks Play
  11. Assert simulation runs and chain status updates visible
  12. Context A clicks Stop — assert simulation stops on both
```

---

### TEST-INT-V2-4: tutorial-in-collab.spec

**Story:** Starting tutorial while in a collaboration room

#### TC-INT-V2-4.1: Tutorial does not disrupt collaboration

```
Steps:
  1. Two contexts in a room with a model
  2. Context A clicks "?" then "Replay Tutorial" (E8)
  3. Assert tour starts in context A
  4. Assert context B is NOT affected (no tour overlay in context B)
  5. Context B creates a component during context A's tour
  6. Assert sync still works — component appears in context A behind the tour overlay
  7. Context A dismisses tour
  8. Assert context A sees all synced changes
```

---

*Generated from docs/user-stories-v2.md*
*21 stories -> 21 test files + 4 integration files -> 99 test cases (including edge cases and error scenarios)*
*No mocking — all tests use real UI interactions, real state, real Yjs sync, and real data.*
