# V11 Dashboard Implementation Plan

**Created:** 2026-01-14
**Status:** In Progress
**Goal:** Build complete v11 dashboard by recycling from v3

---

## Current State Analysis

### v11 Dashboard (lib/dashboard-runner-v11.cjs + lib/dashboard/)
- Basic skeleton with ~142 lines
- Modular architecture (colors, layout, render, input modules)
- **Missing**: Timer, heartbeat countdown, token breakdown, navigation, most key bindings
- **Bug**: Heartbeat writes to FILE instead of injecting into orchestrator

### v3 Dashboard (lib/dashboard-v3.cjs)
- Full-featured monolithic file (~3800 lines)
- Has all features from the spec
- **Recycle**: Heartbeat injection, timer logic, token analysis, navigation, pricing modes

---

## Implementation Priority

### Priority 1: Critical Bug Fix
1. **Heartbeat injection** - v11 writes to file, must inject into orchestrator console

### Priority 2: Core Display
2. **Timer display** - T H:MM:SS showing active session time
3. **Heartbeat countdown** - H M:SS (N/M) showing next heartbeat

### Priority 3: Token/Cost Information
4. **Token breakdown columns** - regular/cached/total columns

### Priority 4: Navigation & Interaction
5. **Up/Down navigation** - Navigate between phases/epics
6. **Tab expand/collapse** - Expand phase details
7. **Missing key bindings** - Enter, +/-, Space, r, a

---

## Recycle Map: v3 -> v11

| Feature | v3 Location | v11 Target |
|---------|-------------|------------|
| Heartbeat injection | `sendHeartbeat()` L3009-3179 | `dashboard-runner-v11.cjs` |
| Timer logic | `activeMs`, `formatTime()` | `dashboard-runner-v11.cjs` |
| Token analysis | `analyzeTranscript()` L350-501 | New module `dashboard/analysis.cjs` |
| Navigation | `navItems[]`, `cursorIndex` L82-83 | `dashboard/input.cjs` |
| Pricing modes | `pricingMode`, PRICING L46-53, 110-141 | `dashboard/pricing.cjs` |
| Console injector | PowerShell script L3048-3161 | `lib/console-injector.ps1` |

---

## File Changes

### 1. dashboard-runner-v11.cjs
- Replace file-based heartbeat with console injection
- Add timer tracking (activeMs)
- Add heartbeat countdown state
- Add navigation state

### 2. lib/dashboard/render.cjs
- Add timer to header (T H:MM:SS)
- Add heartbeat countdown to header (H M:SS)
- Add token breakdown columns
- Add cursor highlight for navigation

### 3. lib/dashboard/input.cjs
- Add Up/Down arrow handling
- Add Tab (expand/collapse)
- Add Enter (manual heartbeat)
- Add +/- (interval adjust)
- Add Space (pricing mode toggle)
- Add r/a (analysis)

### 4. New: lib/dashboard/pricing.cjs
- Port pricing constants from v3
- Port getDisplayCost, getSubCost functions

### 5. New: lib/console-injector.ps1
- Extract PowerShell script from v3
- Reusable for heartbeat and event injection

---

## Implementation Steps

1. **Extract console injector** - Create standalone PowerShell script
2. **Fix heartbeat** - Use console injection instead of file write
3. **Add timer state** - Track activeMs, persist to dashboard-state.json
4. **Update header render** - Add T H:MM:SS and H M:SS displays
5. **Add pricing module** - Token breakdown calculations
6. **Update render columns** - Show regular/cached/total
7. **Add navigation state** - navItems[], cursorIndex
8. **Handle arrow keys** - Up/Down navigation
9. **Handle Tab** - Expand/collapse
10. **Add remaining keys** - Enter, +/-, Space, r, a

---

## Testing

1. Run dashboard against martin project
2. Verify heartbeat injects into orchestrator (not file)
3. Verify timer increments and displays
4. Verify heartbeat countdown works
5. Verify navigation highlights correct item
6. Verify all key bindings work

---

## Estimated Effort

- Priority 1 (Critical): ~30 min
- Priority 2 (Core): ~30 min
- Priority 3 (Tokens): ~20 min
- Priority 4 (Navigation): ~40 min
- Testing: ~20 min

**Total: ~2-3 hours**
