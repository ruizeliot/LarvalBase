# E2E Test Specifications: CascadeSim V2.1

**Source:** `docs/user-stories-v2.1.md`
**Generated:** 2026-02-11
**Framework:** Playwright
**Rule:** No mocking. All tests use real DOM, real state, real data.
**Base:** V2 tests (E1-E10, 240 tests) remain unchanged. V2.1 adds E11-E12.

---

## Conventions

- **Selectors:** Use `data-testid` attributes (e.g. `[data-testid="tutorial-menu"]`)
- **Setup helpers:** Reusable functions that perform real UI actions (drag, click, type) to build state. No injected fixtures.
- **Assertions:** Always assert against visible DOM or computed styles, never internal state.
- **Cleanup:** Each test starts with a fresh app load (`page.goto('/')`)
- **localStorage management:** Tests that depend on tutorial progress must clear/set localStorage via `page.evaluate()` before navigation.
- **VPS integration tests (E12):** Tests marked "(Integration test, run on VPS)" require deployment to `cascadesim.ingevision.cloud` and are excluded from the normal CI run. Use a separate Playwright config with `baseURL` pointing to the VPS.

### V2.1 Shared Setup Functions

These are NOT mocks. Each performs real UI interactions or sets real localStorage state.

| Helper | Actions |
|--------|---------|
| `clearTutorialProgress(page)` | Clears `cascadesim-tutorial-progress` and `cascadesim-tutorial-complete` from localStorage, reloads page |
| `setTutorialPhaseComplete(page, phase)` | Sets localStorage `cascadesim-tutorial-progress` with the given phase(s) marked complete, reloads page |
| `setAllPhasesComplete(page)` | Sets all 4 phases as complete in localStorage |
| `openTutorialMenu(page)` | Clicks the "?" help button, waits for tutorial menu to appear |
| `startTutorialPhase(page, phaseNumber)` | Opens tutorial menu, clicks "Start" on the given phase, waits for Driver.js popover |
| `completeTutorialStep(page, action)` | Performs the required action for the current tutorial step (drag, click, type, etc.) |
| `skipTutorialStep(page)` | Clicks the "Skip Step" link on the current tutorial popover |
| `dismissTutorial(page)` | Presses Esc to dismiss the active tutorial |
| `buildFloodModel(page)` | Builds the full V1 "Flood" reference model (reused from V2) |
| `loadScenarioFromLibrary(page, scenarioTitle)` | Opens library panel, loads scenario by title (reused from V2) |
| `runSimulationToCompletion(page)` | Switches to Simulate tab, clicks Play, waits for simulation to complete |

### Reference Data: Tutorial Phases

| Phase | Title | Steps | Teaches |
|-------|-------|-------|---------|
| 1 | Solo Basics | 5 | Drag component, configure, create chain, build scenario, run sim |
| 2 | Advanced Modeling | 4 | Branching chains, edit params, auto-layout, re-layout options |
| 3 | Reading Results | 4 | Results panel, bottleneck analysis, event log, metrics |
| 4 | Collaboration | 5 | Create room, share link, live cursors, presence bar, co-editing |

### localStorage Schema

```json
{
  "cascadesim-tutorial-progress": {
    "phase1": { "status": "complete", "stepsCompleted": [1,2,3,4,5] },
    "phase2": { "status": "available", "stepsCompleted": [] },
    "phase3": { "status": "locked", "stepsCompleted": [] },
    "phase4": { "status": "locked", "stepsCompleted": [] },
    "welcomeSeen": true
  }
}
```

---

## E11: Progressive Tutorial System

---

### TEST-11.1: epic11-tutorial-phase-system.spec

**Story:** US-11.1 — Tutorial Phase System & Progress UI

#### TC-11.1.1: Help button opens tutorial menu with 4 phases

```
Steps:
  1. Navigate to app (skip welcome overlay if shown)
  2. Assert "?" help button is visible
  3. Click "?" button
  4. Assert tutorial menu appears (data-testid="tutorial-menu")
  5. Assert menu shows 4 phase cards in a vertical list
  6. Assert card titles are: "Solo Basics", "Advanced Modeling", "Reading Results", "Collaboration"
  7. Assert each card has: title, description text, step count, and status indicator
```

#### TC-11.1.2: Phase 1 is unlocked by default, Phases 2-4 are locked

```
Steps:
  1. Clear localStorage, navigate to app, dismiss welcome overlay
  2. Open tutorial menu
  3. Assert Phase 1 card shows "available" status (no lock icon, clickable)
  4. Assert Phase 2 card shows a lock icon and "locked" status
  5. Assert Phase 3 card shows a lock icon and "locked" status
  6. Assert Phase 4 card shows a lock icon and "locked" status
  7. Click Phase 2 card — assert nothing happens (non-clickable)
  8. Click Phase 1 card — assert tutorial starts (Driver.js popover appears)
```

#### TC-11.1.3: Completing Phase 1 unlocks Phase 2

```
Steps:
  1. Clear localStorage, navigate to app
  2. Set localStorage to simulate Phase 1 complete: setTutorialPhaseComplete(page, 1)
  3. Open tutorial menu
  4. Assert Phase 1 card shows checkmark and "complete" status
  5. Assert Phase 2 card is unlocked (no lock icon, clickable)
  6. Assert Phase 3 card is still locked
  7. Assert Phase 4 card is still locked
```

#### TC-11.1.4: Sequential unlocking — Phase N requires Phase N-1 complete

```
Steps:
  1. Set Phases 1 and 2 as complete in localStorage
  2. Open tutorial menu
  3. Assert Phase 1 shows checkmark
  4. Assert Phase 2 shows checkmark
  5. Assert Phase 3 is unlocked (available)
  6. Assert Phase 4 is locked
  7. Set Phase 3 as complete
  8. Reopen tutorial menu
  9. Assert Phase 4 is now unlocked
```

#### TC-11.1.5: Progress bar shows overall completion

```
Steps:
  1. Clear localStorage, navigate to app
  2. Open tutorial menu
  3. Assert progress bar shows "0 of 4 phases complete" (or 0% filled)
  4. Close menu, set Phase 1 complete, reopen menu
  5. Assert progress bar shows "1 of 4 phases complete" (25% filled)
  6. Close menu, set Phases 1-3 complete, reopen menu
  7. Assert progress bar shows "3 of 4 phases complete" (75% filled)
  8. Close menu, set all 4 phases complete, reopen menu
  9. Assert progress bar shows "4 of 4 phases complete" (100% filled)
```

#### TC-11.1.6: Completed phases show checkmark and can be replayed

```
Steps:
  1. Set Phase 1 as complete in localStorage
  2. Open tutorial menu
  3. Assert Phase 1 card shows a checkmark icon
  4. Assert Phase 1 card has a "Replay" button (not "Start")
  5. Click "Replay" on Phase 1
  6. Assert Driver.js popover appears at step 1 of Phase 1
```

#### TC-11.1.7: Progress persists in localStorage

```
Steps:
  1. Clear localStorage, navigate to app
  2. Open tutorial menu — assert Phase 1 is available
  3. Start Phase 1, complete all 5 steps
  4. Reload page (page.reload())
  5. Open tutorial menu
  6. Assert Phase 1 still shows as complete (persisted)
  7. Assert Phase 2 is unlocked
  8. Assert localStorage key "cascadesim-tutorial-progress" exists
```

#### TC-11.1.8: First visit auto-opens tutorial menu with Phase 1 highlighted

```
Steps:
  1. Clear all localStorage (no cascadesim keys)
  2. Navigate to app
  3. Wait for welcome overlay, click "Start Tutorial"
  4. Assert tutorial menu opens
  5. Assert Phase 1 card is visually highlighted (e.g. border emphasis or glow)
```

#### TC-11.1.9: Edge — Close and reopen tutorial menu preserves state

```
Steps:
  1. Set Phase 1 complete, Phase 2 in-progress (step 2 of 4)
  2. Open tutorial menu — verify state
  3. Close menu (click outside or Esc)
  4. Open tutorial menu again
  5. Assert Phase 1 still shows complete
  6. Assert Phase 2 still shows in-progress with correct step count
```

#### TC-11.1.10: Edge — Step count displayed correctly per phase

```
Steps:
  1. Open tutorial menu
  2. Assert Phase 1 card shows "5 steps"
  3. Assert Phase 2 card shows "4 steps"
  4. Assert Phase 3 card shows "4 steps"
  5. Assert Phase 4 card shows "5 steps"
```

---

### TEST-11.2: epic11-phase1-solo-basics.spec

**Story:** US-11.2 — Phase 1: Solo Basics

#### TC-11.2.1: Phase 1 starts with step 1 spotlighting component palette

```
Steps:
  1. Clear localStorage, navigate to app, start Phase 1
  2. Assert Driver.js popover is visible
  3. Assert popover title relates to "Drag a component"
  4. Assert spotlight/dimmed-backdrop highlights the component palette area
  5. Assert step counter shows "Step 1 of 5"
  6. Assert progress dots show 1 active, 4 empty
```

#### TC-11.2.2: Step 1 — Next is disabled until user drags a component

```
Steps:
  1. Start Phase 1 at step 1
  2. Assert "Next" button is disabled
  3. Assert action prompt instructs user to drag an Internal component
  4. Drag an "Internal" component from palette onto canvas
  5. Assert brief checkmark animation appears
  6. Assert "Next" button becomes enabled
  7. Click "Next"
  8. Assert step 2 popover appears
```

#### TC-11.2.3: Step 2 — Configure component (rename + add parameter)

```
Steps:
  1. Advance to step 2 (prerequisite: component exists from step 1)
  2. Assert spotlight highlights properties panel
  3. Assert "Next" button is disabled
  4. Assert action prompt instructs user to rename and add a parameter
  5. Change component name in properties panel
  6. Add a parameter with name and value
  7. Assert checkmark animation appears
  8. Assert "Next" button becomes enabled
```

#### TC-11.2.4: Step 3 — Create a causal chain

```
Steps:
  1. Advance to step 3
  2. Assert spotlight highlights context menu area / right-click prompt
  3. Assert "Next" button is disabled
  4. Right-click component, select "New Causal Chain from here"
  5. Complete chain builder with guided steps (source, type, conditions, save)
  6. Assert checkmark animation appears
  7. Assert "Next" button becomes enabled
```

#### TC-11.2.5: Step 4 — Build a scenario with forced event

```
Steps:
  1. Advance to step 4
  2. Assert spotlight highlights Scenarios tab
  3. Assert "Next" button is disabled
  4. Switch to Scenarios tab
  5. Create a new scenario
  6. Add a forced event on the timeline
  7. Assert checkmark animation appears
  8. Assert "Next" button becomes enabled
```

#### TC-11.2.6: Step 5 — Run simulation

```
Steps:
  1. Advance to step 5
  2. Assert spotlight highlights Simulate tab
  3. Assert "Next" button is disabled
  4. Switch to Simulate tab
  5. Click Run/Play button
  6. Assert simulation starts (time advances from t=0)
  7. Assert checkmark animation appears
  8. Assert completion overlay appears with "Phase 1 Complete!" message
```

#### TC-11.2.7: Completion overlay shows "Continue to Phase 2" button

```
Steps:
  1. Complete all 5 steps of Phase 1
  2. Assert success overlay is visible
  3. Assert overlay text contains "Phase 1 Complete!"
  4. Assert "Continue to Phase 2" button is visible
  5. Click "Continue to Phase 2"
  6. Assert Phase 2 step 1 begins (or tutorial menu opens with Phase 2 highlighted)
```

#### TC-11.2.8: Phase 1 completion unlocks Phase 2 in localStorage

```
Steps:
  1. Complete all 5 steps of Phase 1
  2. Read localStorage key "cascadesim-tutorial-progress"
  3. Assert Phase 1 status is "complete"
  4. Assert Phase 2 status is "available" (not "locked")
```

#### TC-11.2.9: "Skip Step" link bypasses action requirement

```
Steps:
  1. Start Phase 1 at step 1
  2. Assert "Skip Step" link is visible
  3. Assert "Next" button is disabled (action not performed)
  4. Click "Skip Step"
  5. Assert advances to step 2 without performing the drag action
```

#### TC-11.2.10: Arrow keys navigate between steps

```
Steps:
  1. Start Phase 1 at step 1
  2. Skip step 1 (to make Next available is not needed — use Skip)
  3. At step 2, press ArrowLeft
  4. Assert step 1 is shown
  5. Press ArrowRight
  6. Assert step 2 is shown
```

#### TC-11.2.11: Esc dismisses tutorial at any point

```
Steps:
  1. Start Phase 1, advance to step 3
  2. Press Escape
  3. Assert Driver.js popover and spotlight are dismissed
  4. Assert normal app state is restored
  5. Assert canvas and components are still functional
```

#### TC-11.2.12: Edge — Complete Phase 1, verify model was actually built

```
Steps:
  1. Complete all 5 steps of Phase 1 by performing real actions
  2. After completion overlay, dismiss it
  3. Assert canvas has at least 1 component node
  4. Assert at least 1 chain edge exists
  5. Switch to Scenarios tab — assert at least 1 scenario exists
  6. Switch to Simulate — assert simulation can run
```

---

### TEST-11.3: epic11-phase2-advanced-modeling.spec

**Story:** US-11.3 — Phase 2: Advanced Modeling

#### TC-11.3.1: Phase 2 requires Phase 1 to be complete

```
Steps:
  1. Clear localStorage, navigate to app
  2. Open tutorial menu
  3. Assert Phase 2 is locked
  4. Set Phase 1 as complete in localStorage, reload
  5. Open tutorial menu
  6. Assert Phase 2 is now available with "Start" button
```

#### TC-11.3.2: Phase 2 starts with a pre-loaded model

```
Steps:
  1. Set Phase 1 complete, start Phase 2
  2. Assert canvas has at least 2 component nodes (pre-loaded)
  3. Assert at least 1 chain edge exists (pre-loaded)
  4. Assert Driver.js popover appears for step 1
```

#### TC-11.3.3: Step 1 — Create a branching chain from same source

```
Steps:
  1. Start Phase 2 at step 1
  2. Assert popover instructs user to create a second chain from the same source component
  3. Assert "Next" button is disabled
  4. Right-click the source component, create a new causal chain to a different target
  5. Assert checkmark animation appears
  6. Assert "Next" button becomes enabled
```

#### TC-11.3.4: Step 2 — Edit parameters on a component

```
Steps:
  1. Advance to step 2
  2. Assert popover instructs user to add/edit parameters
  3. Assert "Next" button is disabled
  4. Select a component, add a new parameter
  5. Edit an existing parameter value
  6. Assert checkmark animation appears
  7. Assert "Next" button becomes enabled
```

#### TC-11.3.5: Step 3 — Click Re-Layout button triggers ELK layout

```
Steps:
  1. Advance to step 3
  2. Assert spotlight highlights the "Re-Layout" button
  3. Assert "Next" button is disabled
  4. Record node positions before layout
  5. Click "Re-Layout" button
  6. Assert nodes reposition (at least one node moved)
  7. Assert no overlapping nodes
  8. Assert checkmark animation appears
  9. Assert "Next" button becomes enabled
```

#### TC-11.3.6: Step 4 — Open layout dropdown and select different direction

```
Steps:
  1. Advance to step 4
  2. Assert popover instructs user to try a different layout direction
  3. Assert "Next" button is disabled
  4. Open the layout dropdown
  5. Select "TB" direction
  6. Assert graph rearranges to top-to-bottom flow
  7. Assert checkmark animation appears
  8. Assert "Next" button becomes enabled
```

#### TC-11.3.7: Phase 2 completion shows overlay and unlocks Phase 3

```
Steps:
  1. Complete all 4 steps of Phase 2
  2. Assert success overlay with "Phase 2 Complete!" text
  3. Assert "Continue to Phase 3" button visible
  4. Read localStorage — assert Phase 2 status is "complete"
  5. Assert Phase 3 status is "available"
```

#### TC-11.3.8: Edge — Re-Layout step handles single-node canvas

```
Steps:
  1. Start Phase 2 where pre-loaded model has only 1 component
  2. Advance to step 3 (Re-Layout)
  3. Click "Re-Layout"
  4. Assert no crash or error
  5. Assert step still completes (node stays in place or recenters)
```

---

### TEST-11.4: epic11-phase3-reading-results.spec

**Story:** US-11.4 — Phase 3: Reading Results

#### TC-11.4.1: Phase 3 pre-loads a complex scenario

```
Steps:
  1. Set Phases 1-2 complete, start Phase 3
  2. Assert canvas has multiple components (complex model pre-loaded)
  3. Assert chain edges are visible
  4. Assert Driver.js popover appears for step 1
```

#### TC-11.4.2: Step 1 — Run simulation and click a result in side panel

```
Steps:
  1. Start Phase 3 at step 1
  2. Assert popover instructs user to run simulation and view results
  3. Assert spotlight highlights the results panel area
  4. Assert "Next" button is disabled
  5. Switch to Simulate tab and click Run
  6. Wait for simulation to produce results
  7. Assert results appear in docked right panel (data-testid="results-side-panel")
  8. Click a component entry in the results panel
  9. Assert detail view appears for that component
  10. Assert checkmark animation and "Next" enabled
```

#### TC-11.4.3: Step 2 — Identify and click the top bottleneck component

```
Steps:
  1. Advance to step 2
  2. Assert popover explains bottleneck analysis
  3. Assert spotlight highlights the bottleneck section in results
  4. Assert "Next" button is disabled
  5. Identify the component marked as top bottleneck (highest cascade impact)
  6. Click the top bottleneck component
  7. Assert checkmark animation and "Next" enabled
```

#### TC-11.4.4: Step 3 — Click an event log entry to jump to time step

```
Steps:
  1. Advance to step 3
  2. Assert popover explains the cascade event log
  3. Assert spotlight highlights the event log in bottom panel
  4. Assert "Next" button is disabled
  5. Assert event log has at least 1 entry
  6. Click an event log entry
  7. Assert simulation scrubs to the corresponding time step
  8. Assert checkmark animation and "Next" enabled
```

#### TC-11.4.5: Step 4 — Hover a metric to see tooltip explanation

```
Steps:
  1. Advance to step 4
  2. Assert popover explains summary metrics
  3. Assert spotlight highlights metrics section (total cascades, affected components, duration)
  4. Assert "Next" button is disabled
  5. Hover over a metric value
  6. Assert tooltip appears with explanation text
  7. Assert checkmark animation and "Next" enabled
```

#### TC-11.4.6: Phase 3 completion unlocks Phase 4

```
Steps:
  1. Complete all 4 steps of Phase 3
  2. Assert success overlay with "Phase 3 Complete!"
  3. Assert "Continue to Phase 4" button visible
  4. Read localStorage — assert Phase 3 complete, Phase 4 available
```

#### TC-11.4.7: Edge — Results panel must be open for step 1 to detect actions

```
Steps:
  1. Start Phase 3 at step 1
  2. Collapse the results panel (if toggle exists)
  3. Assert step does NOT complete (action not detected in collapsed panel)
  4. Expand the results panel
  5. Click a result entry
  6. Assert step completes
```

---

### TEST-11.5: epic11-phase4-collaboration.spec

**Story:** US-11.5 — Phase 4: Collaboration

#### TC-11.5.1: Phase 4 starts by spotlighting the Collaborate button

```
Steps:
  1. Set Phases 1-3 complete, start Phase 4
  2. Assert Driver.js popover appears for step 1
  3. Assert spotlight highlights the "Collaborate" button
  4. Assert popover instructs user to create a room
```

#### TC-11.5.2: Step 1 — Create a collaboration room

```
Steps:
  1. Start Phase 4 at step 1
  2. Assert "Next" button is disabled
  3. Click "Collaborate" button
  4. Enter a display name in the prompt
  5. Confirm room creation
  6. Assert room is created (room URL generated)
  7. Assert checkmark animation and "Next" enabled
```

#### TC-11.5.3: Step 2 — Click "Copy Link" in share modal

```
Steps:
  1. Advance to step 2
  2. Assert spotlight highlights Share modal
  3. Assert "Next" button is disabled
  4. Click "Copy Link"
  5. Assert checkmark animation and "Next" enabled
```

#### TC-11.5.4: Step 3 — Simulated ghost cursor appears

```
Steps:
  1. Advance to step 3
  2. Assert popover explains live cursors
  3. Assert a simulated "ghost" cursor appears on the canvas (synthetic, not from a real second user)
  4. Assert ghost cursor has a name label (e.g. "Demo User")
  5. Move own cursor on canvas
  6. Assert popover explains that collaborators see your cursor
  7. Assert "Next" button becomes enabled
```

#### TC-11.5.5: Step 4 — Simulated second avatar in presence bar

```
Steps:
  1. Advance to step 4
  2. Assert spotlight highlights the presence bar
  3. Assert presence bar shows the user's own avatar
  4. Assert a simulated second avatar briefly appears (synthetic presence)
  5. Assert popover explains join/leave behavior
  6. Assert "Next" button becomes enabled after observation
```

#### TC-11.5.6: Step 5 — Select a component to see own edit indicator

```
Steps:
  1. Advance to step 5
  2. Assert popover explains co-editing and conflict-free editing
  3. Assert a simulated edit indicator appears on a component (colored glow + "[Other User] is editing")
  4. Assert "Next" button is disabled
  5. Click/select a component on the canvas
  6. Assert popover explains how the user's own indicator appears to others
  7. Assert checkmark animation and completion overlay appears
```

#### TC-11.5.7: Final completion overlay shows "Tutorial Complete!" with confetti

```
Steps:
  1. Complete all 5 steps of Phase 4
  2. Assert final success overlay appears
  3. Assert overlay text contains "Tutorial Complete!" or "You've mastered CascadeSim"
  4. Assert confetti animation is visible (canvas element or particle effect)
  5. Assert all 4 phases show as complete in the tutorial menu
```

#### TC-11.5.8: Help menu shows all phases complete with "Replay any phase"

```
Steps:
  1. Set all 4 phases complete
  2. Click "?" help button
  3. Assert tutorial menu shows all 4 checkmarks
  4. Assert each phase has a "Replay" button
  5. Assert overall progress shows "4 of 4 phases complete"
```

#### TC-11.5.9: Edge — Phase 4 creates a real room for steps 1-2

```
Steps:
  1. Start Phase 4, complete step 1 (create room)
  2. Assert a real ?room= parameter is added to the URL
  3. Assert WebSocket connection to y-websocket server is established
  4. Complete step 2 (copy link)
  5. Read clipboard — assert URL contains valid room ID
```

#### TC-11.5.10: Edge — Simulated cursors/avatars disappear after Phase 4 ends

```
Steps:
  1. Complete Phase 4
  2. Dismiss the completion overlay
  3. Assert no ghost cursor is visible on canvas
  4. Assert no simulated second avatar in presence bar
  5. Assert only the user's real presence data remains
```

---

### TEST-11.6: epic11-tutorial-persistence.spec

**Story:** US-11.6 — Tutorial State Persistence & Resume

#### TC-11.6.1: Mid-phase progress is saved when tutorial is dismissed

```
Steps:
  1. Clear localStorage, navigate to app
  2. Start Phase 1, complete steps 1-3 via real actions
  3. Press Esc to dismiss tutorial
  4. Read localStorage key "cascadesim-tutorial-progress"
  5. Assert Phase 1 stepsCompleted includes [1, 2, 3]
  6. Assert Phase 1 status is "in-progress" (not "complete")
```

#### TC-11.6.2: Resume button appears for in-progress phase

```
Steps:
  1. Set Phase 1 in-progress with steps 1-3 complete in localStorage
  2. Navigate to app, open tutorial menu
  3. Assert Phase 1 card shows "Resume" button (not "Start")
  4. Assert Phase 1 card shows progress indicator (e.g. "Step 4 of 5")
```

#### TC-11.6.3: Clicking Resume starts from next incomplete step

```
Steps:
  1. Set Phase 1 in-progress with steps 1-3 complete
  2. Open tutorial menu, click "Resume" on Phase 1
  3. Assert Driver.js popover appears at step 4 (not step 1)
  4. Assert step counter shows "Step 4 of 5"
  5. Assert steps 1-3 are shown as completed in progress dots
```

#### TC-11.6.4: Completed phase shows "Replay" button that restarts from step 1

```
Steps:
  1. Set Phase 1 as complete in localStorage
  2. Open tutorial menu
  3. Assert Phase 1 card shows "Replay" button
  4. Click "Replay"
  5. Assert Driver.js popover appears at step 1
  6. Assert step counter shows "Step 1 of 5"
```

#### TC-11.6.5: "Reset Tutorial" clears all progress with confirmation

```
Steps:
  1. Set Phases 1-3 complete, Phase 4 in-progress
  2. Open tutorial menu
  3. Scroll to bottom — assert "Reset Tutorial" option is visible
  4. Click "Reset Tutorial"
  5. Assert confirmation dialog appears (e.g. "This will reset all tutorial progress. Continue?")
  6. Click "Cancel" — assert nothing changes
  7. Click "Reset Tutorial" again
  8. Click "Confirm"
  9. Assert all phases reset: Phase 1 available, Phases 2-4 locked
  10. Assert progress bar shows "0 of 4 phases complete"
  11. Read localStorage — assert tutorial progress is cleared
```

#### TC-11.6.6: Progress survives page reload

```
Steps:
  1. Start Phase 1, complete steps 1-2
  2. Press Esc to dismiss
  3. Reload page (page.reload())
  4. Open tutorial menu
  5. Assert Phase 1 shows "Resume (Step 3 of 5)"
```

#### TC-11.6.7: Edge — Dismiss mid-step (action partially started)

```
Steps:
  1. Start Phase 1 at step 2 (configure component)
  2. Rename the component but do NOT add a parameter yet
  3. Press Esc to dismiss tutorial
  4. Resume Phase 1
  5. Assert step 2 is shown (step not marked complete since action wasn't fully done)
```

#### TC-11.6.8: Edge — Browser close and reopen preserves progress

```
Steps:
  1. Start Phase 1, complete steps 1-4
  2. Close context (browser.close())
  3. Create new context, navigate to app
  4. Open tutorial menu
  5. Assert Phase 1 shows "Resume (Step 5 of 5)"
```

---

### TEST-11.7: epic11-first-visit-migration.spec

**Story:** US-11.7 — First-Visit Auto-Launch & Migration

#### TC-11.7.1: First visit shows welcome overlay after 1 second

```
Steps:
  1. Clear all localStorage
  2. Navigate to app
  3. Assert welcome overlay does NOT appear immediately
  4. Wait 1-2 seconds
  5. Assert welcome overlay appears (data-testid="welcome-overlay")
  6. Assert overlay shows app name "CascadeSim"
  7. Assert overlay shows brief description text
  8. Assert "Start Tutorial" button is visible
  9. Assert "Skip" button is visible
```

#### TC-11.7.2: "Start Tutorial" opens tutorial menu at Phase 1

```
Steps:
  1. Clear localStorage, navigate to app, wait for welcome overlay
  2. Click "Start Tutorial"
  3. Assert welcome overlay is dismissed
  4. Assert tutorial menu opens (data-testid="tutorial-menu")
  5. Assert Phase 1 is highlighted/emphasized
```

#### TC-11.7.3: "Skip" dismisses overlay but does not complete any phases

```
Steps:
  1. Clear localStorage, navigate to app, wait for welcome overlay
  2. Click "Skip"
  3. Assert welcome overlay is dismissed
  4. Assert normal workspace is visible
  5. Read localStorage "cascadesim-tutorial-progress"
  6. Assert welcomeSeen is true
  7. Assert Phase 1 status is "available" (NOT "complete")
  8. Assert Phases 2-4 are "locked"
```

#### TC-11.7.4: Subsequent visits do not show welcome overlay

```
Steps:
  1. Clear localStorage, navigate to app
  2. Click "Skip" on welcome overlay
  3. Reload page
  4. Wait 3 seconds
  5. Assert welcome overlay does NOT appear
```

#### TC-11.7.5: Migration — V2 tutorial-complete key auto-completes Phase 1

```
Steps:
  1. Clear all localStorage
  2. Set old V2 key: page.evaluate(() => localStorage.setItem('cascadesim-tutorial-complete', 'true'))
  3. Navigate to app (or reload)
  4. Wait for any migration to complete
  5. Open tutorial menu
  6. Assert Phase 1 shows as complete (checkmark)
  7. Assert Phase 2 is unlocked (available)
  8. Assert welcome overlay did NOT appear (user is a returning V2 user)
```

#### TC-11.7.6: Migration removes old V2 localStorage key

```
Steps:
  1. Set old V2 key "cascadesim-tutorial-complete" to "true"
  2. Navigate to app
  3. Wait 2 seconds
  4. Read localStorage
  5. Assert "cascadesim-tutorial-complete" key no longer exists
  6. Assert "cascadesim-tutorial-progress" key exists with Phase 1 complete
```

#### TC-11.7.7: Edge — No localStorage keys at all (truly fresh user)

```
Steps:
  1. Clear ALL localStorage (not just cascadesim keys)
  2. Navigate to app
  3. Wait for welcome overlay
  4. Assert overlay appears
  5. Click "Start Tutorial"
  6. Assert Phase 1 step 1 begins
  7. Read localStorage — assert cascadesim-tutorial-progress was created
```

#### TC-11.7.8: Edge — Both old and new keys present (migration idempotency)

```
Steps:
  1. Set old key: cascadesim-tutorial-complete = "true"
  2. Also set new key with Phase 1 already complete and Phase 2 in-progress
  3. Navigate to app
  4. Open tutorial menu
  5. Assert Phase 1 is complete (from new key, not re-migrated)
  6. Assert Phase 2 shows in-progress (new key preserved, not overwritten by migration)
  7. Assert old key is removed
```

---

## E12: VPS Deployment

**Note:** E12 tests are a mix of local build verification and VPS integration tests. Tests marked "(Integration)" require the app to be deployed to `cascadesim.ingevision.cloud`. Local tests verify build artifacts and script behavior.

---

### TEST-12.1: epic12-production-build.spec

**Story:** US-12.1 — Production Build Configuration

#### TC-12.1.1: `npm run build` produces a dist/ directory

```
Steps:
  1. Run `npm run build` in the project directory
  2. Assert process exits with code 0
  3. Assert `dist/` directory exists
  4. Assert `dist/index.html` exists
  5. Assert at least one `.js` file exists in `dist/assets/`
  6. Assert at least one `.css` file exists in `dist/assets/`
```

#### TC-12.1.2: No hardcoded localhost in built JS files

```
Steps:
  1. Run `npm run build`
  2. Read all `.js` files in `dist/assets/`
  3. Search for string "localhost" in concatenated JS content
  4. Assert no matches found (all URLs should use environment variables)
```

#### TC-12.1.3: Environment variables are embedded in build output

```
Steps:
  1. Create `.env.production` with:
     VITE_WS_URL=wss://cascadesim.ingevision.cloud/ws
     VITE_APP_URL=https://cascadesim.ingevision.cloud
  2. Run `npm run build`
  3. Read built JS files in `dist/assets/`
  4. Assert "wss://cascadesim.ingevision.cloud/ws" appears in at least one JS file
```

#### TC-12.1.4: Build output is under 2MB gzipped

```
Steps:
  1. Run `npm run build`
  2. Calculate total gzipped size of all files in `dist/` (excluding .map files)
  3. Assert total gzipped size < 2,097,152 bytes (2MB)
```

#### TC-12.1.5: Source maps are generated but separate

```
Steps:
  1. Run `npm run build`
  2. Assert `.map` files exist in `dist/assets/`
  3. Assert `dist/index.html` does NOT contain inline source map references
  4. Assert `.map` files are not referenced in nginx serving config (or can be excluded)
```

#### TC-12.1.6: Vite base is set to '/'

```
Steps:
  1. Run `npm run build`
  2. Read `dist/index.html`
  3. Assert script and CSS `src`/`href` paths start with "/" (not relative like "./")
```

#### TC-12.1.7: Edge — Build succeeds with missing .env.production

```
Steps:
  1. Ensure no `.env.production` file exists
  2. Run `npm run build`
  3. Assert build still succeeds (exit code 0)
  4. Assert dist/ is created (defaults used or empty env vars)
```

---

### TEST-12.2: epic12-y-websocket-server.spec

**Story:** US-12.2 — y-websocket Production Server

#### TC-12.2.1: Server config files exist

```
Steps:
  1. Assert file `server/y-websocket.config.js` exists
  2. Assert file `server/ecosystem.config.cjs` exists
  3. Read ecosystem config — assert it defines a process named "y-websocket"
  4. Assert ecosystem config specifies port 1234
```

#### TC-12.2.2: Health endpoint responds with status ok

```
(Local test — start server locally)
Steps:
  1. Start y-websocket server: node server/y-websocket.config.js
  2. Wait for server to be ready (up to 5 seconds)
  3. Send GET request to http://localhost:1234/health
  4. Assert response status is 200
  5. Assert response body contains {"status":"ok"}
  6. Assert response body contains "rooms" key with a numeric value
  7. Stop server
```

#### TC-12.2.3: Health endpoint shows room count

```
Steps:
  1. Start y-websocket server
  2. GET /health — assert rooms: 0
  3. Open a WebSocket connection and join a room (send Yjs sync message)
  4. GET /health — assert rooms: 1
  5. Open another WebSocket connection to a different room
  6. GET /health — assert rooms: 2
  7. Close all connections
  8. Stop server
```

#### TC-12.2.4: Empty room garbage collection after 5 minutes

```
(Long-running test — may need extended timeout)
Steps:
  1. Start y-websocket server
  2. Open WebSocket connection, join room "test-room"
  3. GET /health — assert rooms: 1
  4. Close WebSocket connection (all clients leave)
  5. Wait 30 seconds — GET /health — assert rooms: 1 (not yet garbage collected)
  6. Wait until 5 minutes after disconnect
  7. GET /health — assert rooms: 0 (room garbage collected)
  8. Stop server
```

#### TC-12.2.5: Connection limit prevents excessive connections

```
Steps:
  1. Start y-websocket server (max 50 connections configured)
  2. Open 50 WebSocket connections
  3. Assert all 50 connections are accepted
  4. Attempt to open connection 51
  5. Assert connection 51 is rejected or receives an error
  6. Close all connections
  7. Stop server
```

#### TC-12.2.6: Edge — Server restarts cleanly (pm2 simulation)

```
Steps:
  1. Start y-websocket server
  2. GET /health — assert ok
  3. Kill the server process (SIGTERM)
  4. Restart the server
  5. GET /health — assert ok (server recovered)
  6. Assert port 1234 is listening
```

---

### TEST-12.3: epic12-nginx-proxy.spec

**Story:** US-12.3 — Nginx Reverse Proxy & Domain Configuration

#### TC-12.3.1: Nginx config file exists with correct structure

```
Steps:
  1. Assert file `server/nginx/cascadesim.conf` exists
  2. Read file content
  3. Assert contains `server_name cascadesim.ingevision.cloud`
  4. Assert contains `root /var/www/cascadesim/dist`
  5. Assert contains `location /ws` with proxy_pass to port 1234
  6. Assert contains WebSocket upgrade headers (Upgrade, Connection)
  7. Assert contains `try_files $uri $uri/ /index.html` (SPA fallback)
  8. Assert contains `server_tokens off`
```

#### TC-12.3.2: (Integration) App loads at domain root

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to https://cascadesim.ingevision.cloud
  2. Assert response status is 200
  3. Assert response content-type is text/html
  4. Assert response body contains "<div id=\"root\">" or similar React mount point
```

#### TC-12.3.3: (Integration) WebSocket connection succeeds at /ws

```
(Integration test, run on VPS)
Steps:
  1. Open WebSocket connection to wss://cascadesim.ingevision.cloud/ws
  2. Assert connection is established (WebSocket readyState === OPEN)
  3. Send a Yjs sync message
  4. Assert response received (Yjs awareness update or sync step)
  5. Close connection
```

#### TC-12.3.4: (Integration) SPA fallback returns index.html for unknown routes

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to https://cascadesim.ingevision.cloud/foo/bar/nonexistent
  2. Assert response status is 200 (not 404)
  3. Assert response body contains the app's HTML content
```

#### TC-12.3.5: (Integration) Gzip compression is enabled

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to https://cascadesim.ingevision.cloud with Accept-Encoding: gzip header
  2. Assert response header Content-Encoding is "gzip"
```

#### TC-12.3.6: (Integration) Static assets have long cache headers

```
(Integration test, run on VPS)
Steps:
  1. Load https://cascadesim.ingevision.cloud
  2. Extract a JS asset URL from the HTML (e.g. /assets/index-abc123.js)
  3. Send GET request for the JS asset
  4. Assert response header Cache-Control contains "max-age=31536000" or "immutable"
```

#### TC-12.3.7: (Integration) index.html has no-cache header

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to https://cascadesim.ingevision.cloud
  2. Assert response header Cache-Control contains "no-cache" or "no-store" or "max-age=0"
```

---

### TEST-12.4: epic12-ssl-https.spec

**Story:** US-12.4 — SSL/HTTPS via Let's Encrypt

#### TC-12.4.1: (Integration) HTTP redirects to HTTPS

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to http://cascadesim.ingevision.cloud (note: HTTP, not HTTPS)
  2. Assert response status is 301 or 302 (redirect)
  3. Assert Location header points to https://cascadesim.ingevision.cloud
```

#### TC-12.4.2: (Integration) HTTPS serves valid certificate

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to https://cascadesim.ingevision.cloud
  2. Assert response status is 200
  3. Assert TLS connection was established (no certificate errors)
  4. Assert certificate subject matches cascadesim.ingevision.cloud
```

#### TC-12.4.3: (Integration) HSTS header is present

```
(Integration test, run on VPS)
Steps:
  1. Send GET request to https://cascadesim.ingevision.cloud
  2. Assert response header Strict-Transport-Security is present
  3. Assert header value contains "max-age=31536000"
```

#### TC-12.4.4: (Integration) WebSocket uses wss:// in production

```
(Integration test, run on VPS)
Steps:
  1. Load app at https://cascadesim.ingevision.cloud
  2. Click "Collaborate", create a room
  3. Assert WebSocket connection URL uses "wss://" protocol (not "ws://")
  4. Assert connection is established successfully
```

#### TC-12.4.5: (Integration) TLS version is 1.2 or higher

```
(Integration test, run on VPS)
Steps:
  1. Connect to https://cascadesim.ingevision.cloud
  2. Inspect TLS version of the connection
  3. Assert TLS version is >= 1.2 (TLSv1.2 or TLSv1.3)
  4. Assert TLSv1.0 and TLSv1.1 are not accepted (attempt connection with old TLS — should fail)
```

---

### TEST-12.5: epic12-deploy-script.spec

**Story:** US-12.5 — Automated Deploy Script

#### TC-12.5.1: Deploy script exists and is executable

```
Steps:
  1. Assert file `scripts/deploy.sh` exists
  2. Assert file has executable permission (chmod +x)
  3. Read file — assert it contains a shebang line (#!/bin/bash or similar)
```

#### TC-12.5.2: --dry-run prints all 7 steps without executing

```
Steps:
  1. Run `scripts/deploy.sh --dry-run`
  2. Capture output
  3. Assert output contains step references for:
     a. "npm run build" (or "Building")
     b. "npm test" (or "Running tests")
     c. "rsync" and "dist/" (or "Syncing static files")
     d. "rsync" and "server/" (or "Syncing server files")
     e. "pm2 restart" (or "Restarting y-websocket")
     f. "nginx" and "reload" (or "Reloading nginx")
     g. "health" or "verify" (or "Verifying deployment")
  4. Assert no actual commands were executed (no SSH connection attempted)
  5. Assert exit code is 0
```

#### TC-12.5.3: --skip-tests flag skips the test step

```
Steps:
  1. Run `scripts/deploy.sh --dry-run --skip-tests`
  2. Capture output
  3. Assert output does NOT contain "npm test" or "Running tests" step
  4. Assert output still contains all other 6 steps
```

#### TC-12.5.4: Script aborts on build failure

```
Steps:
  1. Temporarily break the build (e.g. add syntax error to a source file)
  2. Run `scripts/deploy.sh --dry-run` (or a simulated run that calls npm run build)
  3. Assert script exits with non-zero exit code
  4. Assert error message is displayed
  5. Assert subsequent steps (rsync, pm2, nginx) are NOT shown/executed
  6. Revert the syntax error
```

#### TC-12.5.5: Script outputs colored status messages

```
Steps:
  1. Run `scripts/deploy.sh --dry-run`
  2. Capture raw output (with ANSI codes)
  3. Assert output contains ANSI color codes (green for success indicators)
  4. Assert each step has a status prefix (e.g. "[OK]", "[SKIP]", "[FAIL]")
```

#### TC-12.5.6: npm run deploy alias works

```
Steps:
  1. Read package.json
  2. Assert "scripts" object contains "deploy" key
  3. Assert "deploy" script value references "scripts/deploy.sh"
  4. Run `npm run deploy -- --dry-run`
  5. Assert output matches `scripts/deploy.sh --dry-run` output
```

#### TC-12.5.7: Edge — Script handles missing server/ directory gracefully

```
Steps:
  1. Temporarily rename server/ directory
  2. Run `scripts/deploy.sh --dry-run`
  3. Assert script reports an error about missing server directory
  4. Assert script does NOT proceed past the rsync server step
  5. Rename server/ directory back
```

---

## Cross-Epic Integration Tests (V2.1)

These tests verify end-to-end workflows spanning V2.1 epics and interactions with V2 features.

---

### TEST-INT-V2.1-1: tutorial-with-library-scenario.spec

**Story:** Tutorial Phase 3 uses a pre-loaded scenario from the library system (E7 + E11)

#### TC-INT-V2.1-1.1: Phase 3 pre-loaded scenario is simulatable

```
Steps:
  1. Set Phases 1-2 complete, start Phase 3
  2. Assert pre-loaded model has components and chains on canvas
  3. Switch to Simulate tab, click Run
  4. Assert simulation produces results (events in log, parameters change)
  5. Assert results panel shows data for Phase 3 tutorial steps to reference
```

---

### TEST-INT-V2.1-2: tutorial-phase4-with-collaboration.spec

**Story:** Tutorial Phase 4 creates a real collaboration room (E9 + E11)

#### TC-INT-V2.1-2.1: Phase 4 room creation uses real Yjs infrastructure

```
Steps:
  1. Set Phases 1-3 complete, start Phase 4
  2. Complete step 1 (create room)
  3. Assert URL contains ?room= parameter with real room ID
  4. Open a second browser context, navigate to the room URL
  5. Enter display name, join room
  6. Assert second context sees the canvas model (real Yjs sync working)
  7. Close second context
  8. Continue Phase 4 steps 3-5 (simulated collaboration features)
```

---

### TEST-INT-V2.1-3: tutorial-resume-after-reload.spec

**Story:** Tutorial persistence works across navigation and tab switches (E11 + E1)

#### TC-INT-V2.1-3.1: Tutorial resumes correctly after switching tabs

```
Steps:
  1. Start Phase 1, complete steps 1-2
  2. Press Esc to dismiss tutorial
  3. Switch to Scenarios tab, then back to Editor tab
  4. Open tutorial menu — assert "Resume (Step 3 of 5)" for Phase 1
  5. Click Resume
  6. Assert step 3 appears correctly
  7. Assert app state from steps 1-2 is preserved (component on canvas)
```

---

### TEST-INT-V2.1-4: v2-tutorial-migration-with-new-features.spec

**Story:** V2 users migrating to V2.1 can access new tutorial phases (E8 legacy + E11)

#### TC-INT-V2.1-4.1: Migrated V2 user can start Phase 2 immediately

```
Steps:
  1. Set old V2 key: cascadesim-tutorial-complete = "true"
  2. Navigate to app
  3. Open tutorial menu
  4. Assert Phase 1 is complete (auto-migrated)
  5. Assert Phase 2 is available
  6. Click "Start" on Phase 2
  7. Assert Phase 2 tutorial begins (Driver.js popover for step 1)
```

---

### TEST-INT-V2.1-5: deployed-app-collaboration.spec

**Story:** Production-deployed app supports full collaboration workflow (E12 + E9 + E10)

#### TC-INT-V2.1-5.1: (Integration) Two users collaborate on deployed app

```
(Integration test, run on VPS)
Steps:
  1. Context A navigates to https://cascadesim.ingevision.cloud
  2. Context A clicks "Collaborate", enters name "Alice", creates room
  3. Copy room URL
  4. Context B navigates to the room URL
  5. Context B enters name "Bob", joins room
  6. Assert both contexts see presence bar with 2 users
  7. Context A creates a component "TestNode"
  8. Wait for sync
  9. Assert Context B sees "TestNode" on canvas
  10. Assert activity bar in Context B shows the addition
```

---

## Test Count Summary

| Epic | Test File | Test Cases | Edge Cases |
|------|-----------|------------|------------|
| E11 | epic11-tutorial-phase-system.spec | 10 | 2 |
| E11 | epic11-phase1-solo-basics.spec | 12 | 1 |
| E11 | epic11-phase2-advanced-modeling.spec | 8 | 1 |
| E11 | epic11-phase3-reading-results.spec | 7 | 1 |
| E11 | epic11-phase4-collaboration.spec | 10 | 2 |
| E11 | epic11-tutorial-persistence.spec | 8 | 2 |
| E11 | epic11-first-visit-migration.spec | 8 | 2 |
| E12 | epic12-production-build.spec | 7 | 1 |
| E12 | epic12-y-websocket-server.spec | 6 | 1 |
| E12 | epic12-nginx-proxy.spec | 7 | 0 |
| E12 | epic12-ssl-https.spec | 5 | 0 |
| E12 | epic12-deploy-script.spec | 7 | 1 |
| INT | 5 integration test files | 5 | 0 |
| **Total** | **17 files** | **100 test cases** | **14 edge cases** |

---

*Generated from docs/user-stories-v2.1.md (2026-02-11)*
*12 stories -> 12 test files + 5 integration files -> 100 test cases (including edge cases and error scenarios)*
*No mocking — all tests use real UI interactions, real state, real Yjs sync, real build processes, and real server endpoints.*
