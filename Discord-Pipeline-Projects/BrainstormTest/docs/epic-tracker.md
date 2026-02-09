# Epic Tracker — CascadeSim

## Overview

| # | Epic | Stories | Status | Commit Range |
|---|------|---------|--------|--------------|
| E1 | Application Shell & Layout | 4 | ✅ Done | d7ceb83..cc337c0 |
| E2 | Component Management & Canvas | 6 | ✅ Done | 6a076e3..a05d0ce |
| E3 | Causal Chain Modeling | 7 | ✅ Done | 9ccf2ba..3c65f2b |
| E4 | Scenario Management | 4 | ✅ Done | 0f47ca5..2fa3380 |
| E5 | Simulation Engine & Playback | 5 | ✅ Done | 6c561cf..ddab486 |
| E6 | Simulation Visualization & Event Log | 4 | ✅ Done | c5e7c20..a55fe9d |

---

## E1: Application Shell & Layout ✅

### Stories & Tests
| Story | Description | E2E Test | Status |
|-------|-------------|----------|--------|
| US-1.1 | Tab Navigation | epic1-tab-navigation.spec.ts | ✅ Pass |
| US-1.2 | Collapsible Left Panel | epic1-left-panel-toggle.spec.ts | ✅ Pass |
| US-1.3 | Persistent Graph Canvas | epic1-persistent-canvas.spec.ts | ✅ Pass |
| US-1.4 | Context-Aware Bottom Panel | epic1-bottom-panel-context.spec.ts | ✅ Pass |

### Demo Checklist
1. Open app → see 3 tabs (Editor, Scenarios, Simulate)
2. Click each tab → active tab highlighted, content switches
3. Toggle left panel → collapses/expands
4. Switch tabs → canvas stays visible across all tabs
5. Check bottom panel → content changes per tab (properties / timeline / playback)

### Notes
- Foundation for everything else. 3-panel layout with persistent ReactFlow canvas.

---

## E2: Component Management & Canvas ✅

### Stories & Tests
| Story | Description | E2E Test | Status |
|-------|-------------|----------|--------|
| US-2.1 | Create Internal Component | epic2-create-internal.spec.ts | ✅ Pass |
| US-2.2 | Create External Component | epic2-create-external.spec.ts | ✅ Pass |
| US-2.3 | Edit Component Parameters | epic2-edit-component-parameters.spec.ts | ✅ Pass |
| US-2.4 | Define Capacities | epic2-define-capacities.spec.ts | ✅ Pass |
| US-2.5 | Toggle Component Type | epic2-toggle-component-type.spec.ts | ✅ Pass |
| US-2.6 | Delete Component | epic2-delete-component.spec.ts | ✅ Pass |

### Demo Checklist
1. Editor tab → "Add Internal Component" → node appears on canvas
2. "Add External Component" → visually different node appears
3. Click component → property editor in bottom panel → change name → canvas updates live
4. Click internal component → capacities section → add capacity (e.g. "Processing: 100")
5. Toggle internal→external → confirmation dialog about losing capacities → confirm → capacities gone
6. Select component → delete → removed from canvas and panel

### Notes
- Context crash during US-2.6 (4% context). Relaunched fresh session to finish.
- Confirmation dialog on type toggle when capacities exist.

---

## E3: Causal Chain Modeling ✅

### Stories & Tests
| Story | Description | E2E Test | Status |
|-------|-------------|----------|--------|
| US-3.1 | Start New Causal Chain | epic3-start-chain.spec.ts | ✅ Pass |
| US-3.2 | Select Chain Type | epic3-select-chain-type.spec.ts | ✅ Pass |
| US-3.3 | Define Potential (Stage 1) | epic3-define-potential.spec.ts | ✅ Pass |
| US-3.4 | Define Potentiality (Stage 2) | epic3-define-potentiality.spec.ts | ✅ Pass |
| US-3.5 | Define Actuality (Stage 3) | epic3-define-actuality.spec.ts | ✅ Pass |
| US-3.6 | Chain Rendering on Canvas | epic3-chain-rendering.spec.ts | ✅ Pass |
| US-3.7 | Toggle Detailed/Compact View | epic3-toggle-chain-view.spec.ts | ✅ Pass |

### Demo Checklist
1. Create 2+ components first (need targets for chains)
2. Right-click canvas → "New Causal Chain" → chain builder dialog opens
3. Select chain type: Inflicted or Managed (Managed shows "mitigates" dropdown)
4. Define Stage 1 (Potential) → formula editor with autocomplete for component names
5. Define Stage 2 (Potentiality) → target selector + susceptibility condition
6. Define Stage 3 (Actuality) → triggering condition + consequences with duration types
7. See chain rendered on canvas as condition nodes + edges with tooltips
8. Toggle Detailed ↔ Compact view

### Notes
- 7 stories, ran as single session (sequential dependencies).
- Hit auto-compact at 5% context but survived. All 28 E2E tests green.

---

## E4: Scenario Management ✅

### Stories & Tests
| Story | Description | E2E Test | Status |
|-------|-------------|----------|--------|
| US-4.1 | Create and Manage Scenarios | epic4-create-manage-scenarios.spec.ts | ✅ Pass |
| US-4.2 | Read-Only Graph in Scenario Mode | epic4-readonly-graph.spec.ts | ✅ Pass |
| US-4.3 | Place Forced Events on Timeline | epic4-place-forced-events.spec.ts | ✅ Pass |
| US-4.4 | Edit and Remove Forced Events | epic4-edit-remove-events.spec.ts | ✅ Pass |

### Demo Checklist
1. Go to **Scenarios** tab → click "New Scenario" → name it → verify it appears in list
2. Select a scenario → canvas should show components in **read-only** mode (can't edit/delete/add)
3. Find the **timeline** in the bottom panel → click to place a forced event on a component at a specific timestep
4. Click an existing forced event → edit its properties (value, timestep) → verify changes save
5. Delete a forced event → verify it's removed from timeline
6. Create a second scenario → switch between them → verify each has its own events

### Notes
- Auto-compacted during US-4.4 (hit 0% → compacted to 38% → finished successfully)
- Delete confirmation dialog on scenario deletion

## E5: Simulation Engine & Playback ✅

### Stories & Tests
| Story | Description | E2E Test | Status |
|-------|-------------|----------|--------|
| US-5.1 | Start, Pause, Stop Simulation | epic5-simulation-controls.spec.ts | ✅ Pass |
| US-5.2 | Step Forward and Backward | epic5-simulation-stepping.spec.ts | ✅ Pass |
| US-5.3 | Adjust Simulation Speed | epic5-simulation-speed.spec.ts | ✅ Pass |
| US-5.4 | Scrub Simulation Timeline | epic5-simulation-scrub.spec.ts | ✅ Pass |
| US-5.5 | Cascading Effect Propagation | epic5-cascading-effects.spec.ts | ✅ Pass |

### QA Gate
- **104 tests total | ✅ 104 passed | ❌ 0 failed**
- 4 regressions found (E1-E2 tests broken by E5 changes) — fixed before demo
- Regression fix commit: `5f8058e`

### Demo Checklist
1. Create 2+ components with parameters → build a causal chain between them → create a scenario with forced events
2. Go to **Simulate** tab → click **Play** → simulation starts from t=0, events cascade
3. Click **Pause** → simulation freezes at current timestep
4. Click **Step Forward** → advances one timestep. **Step Backward** → goes back one.
5. Adjust **Speed slider** → simulation plays faster/slower
6. Drag the **Scrub bar** → jump to any timestep, event log updates
7. Click **Stop** → resets to t=0
8. Verify cascading: forced event on component A triggers chain → affects component B → triggers another chain (if modeled)

### Notes
- Regression fix required before demo (E5 changes broke 4 older tests — selectors + UI text changes)
- Session died after fix commit (API limit hit at 1pm). Tests verified green independently.

## E6: Simulation Visualization & Event Log ✅

### Stories & Tests
| Story | Description | E2E Test | Status |
|-------|-------------|----------|--------|
| US-6.1 | Animated Pulses on Chain Edges | epic6-animated-pulses.spec.ts | ✅ Pass |
| US-6.2 | Live Chain Status Indicators | epic6-chain-status-indicators.spec.ts | ✅ Pass |
| US-6.3 | Real-Time Parameter Updates on Canvas | epic6-realtime-parameter-updates.spec.ts | ✅ Pass |
| US-6.4 | Timestamped Event Log | epic6-event-log.spec.ts | ✅ Pass |

### QA Gate
- **122 tests total | ✅ 122 passed | ❌ 0 failed**
- Zero regressions across E1-E5 tests

### Demo Checklist
1. Build model with chains → go to Simulate → play simulation → see animated diamond pulses on chain edges
2. Check left panel → chain status indicators show ●○○ / ○●○ / ○○● as stages activate
3. Watch component nodes on canvas → parameter values update live with green highlight flash
4. Check bottom panel → timestamped event log shows [forced] and [cascade] entries
5. Pause → pulses freeze, indicators stay, values freeze
6. Stop → indicators reset to ○○○, values revert to initial, event log persists
7. Play again → event log clears and new entries appear

### Notes
- Shared `chainStageEvaluator.ts` utility used by US-6.1 (pulses) and US-6.2 (indicators)
- Snapshot keys use component ID + parameter ID (not names) — important for ComponentNode lookup
- `frozenEventLog` state added to simulationStore to persist events after stop
