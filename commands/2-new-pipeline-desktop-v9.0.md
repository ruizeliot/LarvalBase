---
name: 2-new-pipeline-desktop-v9.0
description: Phase 2 - Multi-layer test specs for Tauri desktop app (new project)
---

# Phase 2: Technical Specifications (New Project)

**Base Rules:** See `worker-base-desktop-v9.0.md` for shared worker rules.

**Purpose:** Generate multi-layer test specs for Tauri desktop app
**Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md`
**Output:** `docs/test-specs.md`
**Mode:** Autonomous (no user interaction)

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read docs/user-stories.md and count stories", status: "in_progress", activeForm: "Reading user stories" },
  { content: "2. Generate E2E test specs (1 per user story)", status: "pending", activeForm: "Generating E2E specs" },
  { content: "3. VERIFY: E2E count equals story count (BLOCKING)", status: "pending", activeForm: "Verifying 1:1 mapping" },
  { content: "4. VERIFY: E2E tests use REAL interactions only", status: "pending", activeForm: "Verifying real interactions" },
  { content: "5. VERIFY: Completeness pairs tested together", status: "pending", activeForm: "Verifying completeness pairs" },
  { content: "6. Generate Unit test specs for [UNIT] criteria", status: "pending", activeForm: "Generating Unit specs" },
  { content: "7. Generate Integration specs for [INTEGRATION] criteria", status: "pending", activeForm: "Generating Integration specs" },
  { content: "8. Generate Visual Quality test specs", status: "pending", activeForm: "Generating Visual specs" },
  { content: "9. Add edge cases (2-5 per E2E from DIFFERENT categories)", status: "pending", activeForm: "Adding edge cases" },
  { content: "10. Generate Onboarding test specs (if epic exists)", status: "pending", activeForm: "Generating Onboarding specs" },
  { content: "11. VERIFY: Each epic's tests are independent", status: "pending", activeForm: "Verifying independence" },
  { content: "12. Document test fixtures needed per epic", status: "pending", activeForm: "Documenting fixtures" },
  { content: "13. Create coverage matrix", status: "pending", activeForm: "Creating matrix" },
  { content: "14. Write docs/test-specs.md (per-epic incremental)", status: "pending", activeForm: "Writing test specs incrementally" },
  { content: "15. Run independent review (subagent)", status: "pending", activeForm: "Running review" },
  { content: "16. Fix issues if review fails", status: "pending", activeForm: "Fixing issues" }
])
```

---

## ⛔ FORBIDDEN IN E2E SPECS (Gate 1 Checks This)

**E2E tests must use REAL user interactions only. Gate 1 rejects these patterns:**

### Forbidden Patterns

```javascript
// ❌ FORBIDDEN - Direct store/API calls
browser.execute(() => { store.addNode({ type: 'factory' }) })
browser.execute(() => { window.appStore.dispatch({ type: 'ADD_NODE' }) })
await invoke('add_node', { type: 'factory' })  // Direct Tauri command

// ❌ FORBIDDEN - Synthetic events
browser.execute(() => {
  element.dispatchEvent(new MouseEvent('click'))
})
browser.execute(() => {
  element.dispatchEvent(new DragEvent('drop', { dataTransfer: new DataTransfer() }))
})
browser.execute(() => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
})

// ❌ FORBIDDEN - State manipulation
browser.execute(() => { localStorage.setItem('nodes', JSON.stringify([...])) })
browser.execute(() => { window.testHelpers.setNodes([...]) })
```

### Required Patterns

```javascript
// ✅ REQUIRED - Real WebdriverIO actions
await $('[data-testid="palette-factory"]').click()
await $('[data-testid="palette-item"]').dragAndDrop($('[data-testid="canvas"]'))
await $('[data-testid="input"]').setValue('My Factory')
await browser.keys(['Delete'])
await browser.keys(['Control', 'z'])  // Undo

// ✅ REQUIRED - Real drag operations
const source = await $('[data-testid="node-1"]')
const target = await $('[data-testid="canvas"]')
await source.dragAndDrop(target, { duration: 100 })

// ✅ REQUIRED - Assert on UI results, not store
const nodeText = await $('[data-testid="node-label"]').getText()
expect(nodeText).toBe('My Factory')
```

---

## Step 1: Read and Count Stories

```bash
cat docs/user-stories.md
```

Count total user stories (US-XXX entries). Record: `storyCount = [N]`

---

## Step 2: Generate E2E Test Specs

For each user story, create exactly one E2E test spec using **REAL interactions only:**

```markdown
### E2E-001: [Test Name] (US-001)

**Test:** [What is being tested]

**WebdriverIO Test (Real User Interactions):**
1. Click on [element] using `$('[data-testid="..."]').click()`
2. Drag [element] to [target] using `.dragAndDrop()`
3. Type [text] using `.setValue()`
4. Press [key] using `browser.keys()`
5. Assert [visible result] using `.getText()`, `.isDisplayed()`

**Covers Acceptance Criteria:**
- [Criterion with [E2E] tag]
```

**Tests must use REAL WebdriverIO actions:**
```javascript
// ✅ CORRECT - Real user action that exercises full stack
await $('[data-testid="add-button"]').click()
await $('[data-testid="name-input"]').setValue('Test Item')
await $('[data-testid="save-button"]').click()
const text = await $('[data-testid="item-name"]').getText()
expect(text).toBe('Test Item')

// ❌ WRONG - Store call bypasses UI
browser.execute(() => store.addItem({ name: 'Test Item' }))
```

---

## Step 3: VERIFY E2E Count (BLOCKING)

```
if (e2eTestCount !== storyCount) {
  FAIL: "Cannot proceed - add missing E2E tests"
}
```

**Do NOT proceed if counts don't match.**

---

## Step 4: VERIFY Real Interactions Only (NEW in v9.0)

**Scan ALL E2E specs for forbidden patterns:**

### Forbidden Words/Patterns to Check

```
- "browser.execute(() => { store"
- "browser.execute(() => { window.app"
- "dispatchEvent(new MouseEvent"
- "dispatchEvent(new DragEvent"
- "dispatchEvent(new KeyboardEvent"
- "new DataTransfer()"
- "invoke('" (direct Tauri command call)
- "localStorage.setItem"
```

### Required Words to Find

Every E2E spec MUST contain at least one of:
```
- "$('...').click()"
- "$('...').dragAndDrop("
- "$('...').setValue("
- "browser.keys(["
- "$('...').getText()"
- "$('...').isDisplayed()"
```

**If any spec fails this check, rewrite it with real interactions.**

---

## Step 5: VERIFY Completeness Pairs (NEW in v9.0)

**Every action pair must be tested together in related E2E tests:**

### Completeness Pairs to Verify

| Action | Pair | E2E Must Cover Both |
|--------|------|---------------------|
| Add | Delete | E2E tests add AND delete |
| Place | Move | E2E tests place AND move |
| Connect | Disconnect | E2E tests connect AND disconnect |
| Open | Close | E2E tests open AND close |
| Select | Deselect | E2E tests select AND deselect |
| Start | Stop | E2E tests start AND stop |
| Show | Hide | E2E tests show AND hide |
| Zoom in | Zoom out | E2E tests both zoom directions |

### Verification Example

```markdown
✅ Completeness Pair: Add / Delete nodes
   - E2E-003: Add node to canvas (tests ADD)
   - E2E-015: Delete node from canvas (tests DELETE)
   - VERIFIED: Both halves have E2E specs

✅ Completeness Pair: Place / Move nodes
   - E2E-007: Place node via drag-drop (tests PLACE)
   - E2E-007b: Move existing node on canvas (tests MOVE)
   - VERIFIED: Both halves have E2E specs

❌ Completeness Pair: Connect / Disconnect
   - E2E-011: Connect nodes (tests CONNECT)
   - MISSING: No E2E for disconnect
   - ACTION: Add E2E-016 for disconnect
```

---

## Steps 6-7: Unit and Integration Specs

### Step 6: Unit Test Specs
For each `[UNIT]` criterion - test pure functions.

### Step 7: Integration Test Specs
For each `[INTEGRATION]` criterion - test Tauri commands.

---

## Step 8: Visual Quality Test Specs (MANDATORY)

Generate specs for US-VIS-001 through US-VIS-004:

```markdown
## Visual Quality Test Specifications

### VIS-E2E-001: Design Token Enforcement (US-VIS-001)
**Test:** Verify no arbitrary Tailwind values are used
**Setup:** Run ESLint with tailwind-arbitrary-values plugin
**WebdriverIO Test (Pre-build check):**
1. Execute `npm run lint:styles`
2. Assert exit code is 0
**Expected:** Build fails if `bg-[#123456]` or `p-[13px]` patterns found

### VIS-E2E-002: Visual Baseline Match (US-VIS-002)
**Test:** Screenshots match approved baselines
**Setup:** wdio-image-comparison-service configured
**WebdriverIO Test:**
1. Navigate to Dashboard
2. `await browser.saveFullPageScreen('dashboard')`
3. `expect(await browser.checkFullPageScreen('dashboard')).toBeLessThan(0.1)`
**Threshold:** 0.1% pixel difference

### VIS-E2E-003: Interactive State Visibility (US-VIS-003)
**Test:** Hover, focus, active states are visually distinct
**WebdriverIO Test:**
1. Get button default background color
2. Hover → assert color changed
3. Tab focus → assert focus ring visible
4. Click and hold → assert active state different

### VIS-E2E-004: Accessibility Contrast (US-VIS-004)
**Test:** WCAG AA contrast requirements met
**WebdriverIO Test:**
1. Navigate to each screen
2. Run axe-core analysis
3. Assert zero color-contrast violations
```

---

## Step 9: Edge Case Matrix (ENHANCED in v9.0)

**Every E2E test MUST include 2-5 edge cases from DIFFERENT categories:**

### Edge Case Matrix

| Category | Edge Cases | Example |
|----------|------------|---------|
| Empty state | No items, first item, single item | "Add first node to empty canvas" |
| Boundaries | Min value, max value, at limit | "Add node at canvas edge", "Max nodes reached" |
| Invalid input | Empty string, special chars, too long | "Name with <script> tag", "256 char name" |
| Rapid actions | Double-click, spam clicks, drag cancel | "Double-click add button", "Cancel mid-drag" |
| Interruption | Action during loading, mid-drag escape | "Press Escape while dragging" |
| State conflicts | Delete while editing, move while drag | "Delete node being edited" |

### Edge Case Spec Format

```markdown
### E2E-003: Add node to canvas (US-003)

**Test:** User can add node via drag-drop

**WebdriverIO Test (Happy Path):**
1. Drag palette item to canvas
2. Assert node appears at drop position

**Edge Cases (Required: 2-5 from DIFFERENT categories):**

**E2E-003-edge-1: Add to empty canvas (Empty State)**
1. Ensure canvas is empty
2. Drag first node
3. Assert node created AND empty state message disappears

**E2E-003-edge-2: Cancel mid-drag (Interruption)**
1. Start dragging palette item
2. Press Escape while dragging
3. Assert no node created, palette item returns

**E2E-003-edge-3: Rapid double-click add (Rapid Actions)**
1. Double-click palette item
2. Assert only one node created OR second is handled gracefully

**E2E-003-edge-4: Add at canvas boundary (Boundaries)**
1. Drag node to edge of canvas
2. Assert node snaps to valid position or is constrained

**E2E-003-edge-5: Add while save in progress (State Conflicts)**
1. Trigger save operation
2. Attempt to add node during save
3. Assert graceful handling (queue or block)
```

### Verification Checklist

For each E2E spec, verify:
- [ ] Has 2-5 edge case variants
- [ ] Edge cases are from DIFFERENT matrix categories (REQUIRED)
- [ ] No two edge cases from same category
- [ ] Edge cases use REAL interactions (not synthetic events)

---

## Step 10: Onboarding Test Specs (NEW in v9.0)

**If Onboarding epic exists in user-stories.md, generate these specs:**

### For Minimal Onboarding:

```markdown
### E2E-ONBOARD-001: Empty states provide guidance (US-ONBOARD-001)

**WebdriverIO Test:**
1. Launch app with fresh state (clear localStorage)
2. Assert canvas shows "Drag items from palette to get started"
3. Add one node
4. Assert empty state message disappears

### E2E-ONBOARD-002: Tooltips on hover (US-ONBOARD-002)

**WebdriverIO Test:**
1. Hover over palette item
2. Assert tooltip appears with description
3. Hover over toolbar button
4. Assert tooltip shows name + keyboard shortcut

### E2E-ONBOARD-003: Keyboard shortcuts dialog (US-ONBOARD-003)

**WebdriverIO Test:**
1. Click Help menu
2. Click "Keyboard Shortcuts"
3. Assert dialog opens
4. Assert shortcuts are grouped by category
5. Press Escape
6. Assert dialog closes
```

### For Full Tutorial:

```markdown
### E2E-ONBOARD-001: First-launch tutorial (US-ONBOARD-001)

**WebdriverIO Test:**
1. Clear localStorage to simulate first launch
2. Launch app
3. Assert tutorial overlay appears
4. Assert "Welcome" message shown
5. Click "Next"
6. Assert step 2 shows with UI highlight
7. Click "Skip"
8. Assert tutorial dismissed

### E2E-ONBOARD-002: Relaunch tutorial (US-ONBOARD-002)

**WebdriverIO Test:**
1. Launch app (not first time)
2. Assert no tutorial shown automatically
3. Click Help > Show Tutorial
4. Assert tutorial starts from beginning
```

---

## Steps 11-13: Independence and Coverage

### Step 11: Test Independence Matrix
Verify each epic can run alone.

### Step 12: Document Fixtures
What setup/teardown each epic needs.

### Step 13: Coverage Matrix

Include completeness pairs and edge case categories in matrix:

```markdown
## Coverage Matrix

| Story | Unit | Integration | E2E | Pair | Edge Cases | Categories |
|-------|------|-------------|-----|------|------------|------------|
| US-003 Add node | UNIT-003 | INT-003 | E2E-003 | ✅ E2E-015 (Delete) | 5 | ES,IN,RA,BO,SC |
| US-007 Place node | - | INT-007 | E2E-007 | ✅ E2E-007b (Move) | 3 | ES,BO,RA |
| US-015 Delete node | - | INT-015 | E2E-015 | ✅ E2E-003 (Add) | 3 | ES,SC,IN |

Category Key: ES=Empty State, BO=Boundaries, II=Invalid Input, RA=Rapid Actions, IN=Interruption, SC=State Conflicts
```

---

## Steps 14-16: Document and Review

### Step 14: Write docs/test-specs.md (INCREMENTAL)

**⚠️ CRITICAL: Write in sections to avoid 32K output token limit.**

**14a. Write header with v9.0 additions:**
```markdown
# Test Specifications

## Overview
- Total User Stories: [N]
- E2E Tests: [N] (1:1 mapping)
- Unit Tests: [X]
- Integration Tests: [Y]
- Visual Tests: 4 (VIS-E2E-001 to VIS-E2E-004)
- Onboarding Tests: [Z] (if applicable)
- Edge Cases: Min 2 per E2E

## v9.0 Verification Status
- [x] Real interactions only (no synthetic events)
- [x] Completeness pairs tested
- [x] Edge cases: 2-5 per E2E from different categories
- [x] Onboarding specs included

## Test Layers
...
```

**14b-14c. Write epic by epic using Edit tool.**

### Steps 15-16: Independent Review
Dispatch subagent to verify specs. Fix if issues found.

**Subagent must verify:**
1. No forbidden patterns in E2E specs
2. All completeness pairs have both halves tested
3. Each E2E has minimum 2 edge cases
4. Onboarding specs exist if epic exists

---

## Completion Output

```
════════════════════════════════════════════════════════════════
Phase 2 Complete
════════════════════════════════════════════════════════════════

📊 Multi-Layer Test Specifications:
   Unit Tests: [X] specs
   Integration Tests: [Y] specs
   E2E Tests: [Z] specs
   Visual Tests: 4 specs
   Onboarding Tests: [O] specs
   Edge Cases: [M] total (2-5 per E2E from different categories ✅)

✅ v9.0 Quality Gates:
   1:1 E2E Mapping: PASSED
   Real Interactions Only: PASSED (no synthetic events)
   Completeness Pairs: ALL VERIFIED
   Edge Cases: 2-5 per E2E, different categories VERIFIED
   Independence Check: PASSED
   Visual Quality Specs: INCLUDED
   Onboarding Specs: INCLUDED
   Review: PASSED

Files Created:
  - docs/test-specs.md

Ready for Phase 3: Bootstrap
════════════════════════════════════════════════════════════════
```

---

## Phase-Specific Rules

### You Must (Phase 2)
- Enforce 1:1 E2E-to-story mapping
- **Write E2E specs using REAL WebdriverIO actions only**
- **Verify all completeness pairs have both halves tested**
- **Include 2-5 edge cases per E2E from DIFFERENT categories**
- **Verify no two edge cases from same category**
- **Include onboarding test specs if epic exists**
- Include Visual Quality test specs
- Use independent reviewer

### You Must NOT (Phase 2)
- Proceed if E2E count ≠ story count
- **Write E2E specs that use synthetic events**
- **Write E2E specs that call store/API directly**
- **Have multiple edge cases from the same category**
- **Have fewer than 2 or more than 5 edge cases per E2E**
- **Skip completeness pair verification**
- Omit Visual Quality test specs
- Write actual test code (just specs)
- Write entire test-specs.md in one operation

---

**Execute now. Generate multi-layer test specs with REAL interactions only.**
