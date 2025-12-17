---
name: 4-new-pipeline-desktop-v9.0
description: Phase 4 - Implement epic until all tests pass (Unit → Integration → E2E)
---

# Phase 4: Implement & Validate (Pyramid Test Order)

**Base Rules:** See `worker-base-desktop-v9.0.md` for shared worker rules.

**Purpose:** Implement code until all tests pass for current epic
**Input:** Skeleton app with failing multi-layer tests
**Output:** Working features with passing tests at all layers
**Mode:** Autonomous (no user interaction)


---

## ⛔ FORBIDDEN PATTERNS (Gate 2 Will Reject)

**The orchestrator runs Gate 2 after all epics complete. These patterns cause REJECTION.**

### No Empty Handlers

```tsx
// ❌ FORBIDDEN - Empty handlers
onClick={() => {}}
onDragStart={() => {}}
onChange={() => {}}

// ❌ FORBIDDEN - Console.log placeholders
onClick={() => console.log('TODO')}

// ❌ FORBIDDEN - Alert placeholders
onClick={() => alert('Not implemented')}

// ❌ FORBIDDEN - Buttons without handlers
<button>Edit</button>  // No onClick

// ✅ REQUIRED - Real implementation
onClick={() => handleEdit()}
onClick={handleEdit}
```

### No Test-Only Code Paths

```tsx
// ❌ FORBIDDEN
if (process.env.NODE_ENV === 'test') { ... }
if (import.meta.env.MODE === 'test') { ... }

// ✅ REQUIRED - Same code path for test and production
```

### Detection Commands (Run Before Every Commit)

```bash
# Empty handlers
grep -rn "onClick={() => {}}" src --include="*.tsx"
grep -rn "onDragStart={() => {}}" src --include="*.tsx"
grep -rn "onChange={() => {}}" src --include="*.tsx"

# Console.log placeholders
grep -rn "onClick={() => console" src --include="*.tsx"

# Test-only code paths
grep -rn "NODE_ENV.*===.*test" src --include="*.ts" --include="*.tsx"
grep -rn "import.meta.env.MODE.*test" src --include="*.ts" --include="*.tsx"

# Buttons without onClick (harder to grep - manual check)
```

**Expected:** Zero matches for all patterns.

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read manifest for current epic", status: "in_progress", activeForm: "Reading manifest" },
  { content: "2. Identify tests for this epic (all layers)", status: "pending", activeForm: "Identifying tests" },
  { content: "3. Read existing code patterns", status: "pending", activeForm: "Reading patterns" },
  { content: "4. Check for bugs from previous epics (skip if Epic 1)", status: "pending", activeForm: "Checking for bugs" },
  { content: "5. Implement pure logic (validation, calculations)", status: "pending", activeForm: "Implementing logic" },
  { content: "6. UNIT: Run tests until GREEN", status: "pending", activeForm: "Running Unit tests" },
  { content: "7. Implement Tauri backend (commands, store)", status: "pending", activeForm: "Implementing backend" },
  { content: "8. INTEGRATION: Run tests until GREEN", status: "pending", activeForm: "Running Integration tests" },
  { content: "9. Implement frontend with design tokens", status: "pending", activeForm: "Implementing frontend" },
  { content: "10. Implement completeness pairs (both halves)", status: "pending", activeForm: "Implementing pairs" },
  { content: "11. LINT: Verify no arbitrary Tailwind values", status: "pending", activeForm: "Checking design tokens" },
  { content: "12. CHECK: Verify no empty handlers", status: "pending", activeForm: "Checking empty handlers" },
  { content: "13. BUILD: Run tauri build", status: "pending", activeForm: "Building app" },
  { content: "14. E2E: Run tests until GREEN", status: "pending", activeForm: "Running E2E tests" },
  { content: "15. Enable smoke tests for implemented features", status: "pending", activeForm: "Enabling smoke tests" },
  { content: "16. VISUAL: Capture/update baselines", status: "pending", activeForm: "Capturing baselines" },
  { content: "17. A11Y: Run accessibility tests", status: "pending", activeForm: "Running accessibility tests" },
  { content: "18. REGRESSION: Run all layers", status: "pending", activeForm: "Running regression" },
  { content: "19. Update manifest and git commit", status: "pending", activeForm: "Committing" }
])
```

---

## Test Pyramid Order

| Order | Layer | Why First |
|-------|-------|-----------||
| 1st | Unit | Instant feedback, catch logic errors |
| 2nd | Integration | Verify Tauri commands before UI |
| 3rd | Lint | Verify design token usage before build |
| 4th | Empty handler check | Catch placeholders before build |
| 5th | E2E | Full validation (requires build) |
| 6th | Smoke | Verify all elements work |
| 7th | Visual | Capture/verify screenshots |
| 8th | A11y | Verify accessibility |

---

## Steps 1-3: Preparation

### Step 1: Read Manifest
```bash
cat .pipeline/manifest.json
```
Identify `currentEpic`, epic name, user stories.

### Step 2: Identify Tests
From `docs/test-specs.md`, list all tests for current epic (Unit, Integration, E2E).

### Step 3: Read Existing Code Patterns
**CRITICAL: Do this BEFORE implementing.**
```bash
cat src-tauri/src/lib.rs | head -100
grep -r "invoke" src --include="*.tsx" | head -20
```

---

## Step 4: Check for Bugs from Previous Epics (NEW in v9.0)

**⚠️ SKIP THIS STEP IF EPIC 1** - Epic 1 starts from RED state (Phase 3 bootstrap). There are no previous epics to regress.

### Check Current Epic First

```bash
CURRENT_EPIC=$(cat .pipeline/manifest.json | jq -r '.currentEpic')

if [ "$CURRENT_EPIC" -eq 1 ]; then
  echo "Epic 1 - Skipping bug check (no previous epics)"
  # Skip to Step 5
else
  echo "Epic $CURRENT_EPIC - Running regression check on previous epics"
  # Continue with bug check below
fi
```

### For Epic 2+ Only: Run All Existing Tests

```bash
npm run test:unit
npm run test:integration
npm run tauri build && npm run test:e2e
```

### If Any Tests Fail (Epic 2+ only)

**DO NOT SKIP THEM. Fix them before implementing the new epic.**

```
Scenario: Epic 2 worker finds Epic 1's E2E test failing

WRONG: "That's Epic 1's problem, I'm only responsible for Epic 2"
RIGHT: Fix the bug, then continue with Epic 2

Why: The orchestrator doesn't care which epic broke it.
If tests are failing when you start, you fix them.
```

### Document Fixed Bugs in Commit

```bash
git commit -m "feat(epic-2): implement [Feature]

Fixed bugs from previous epics:
- Fixed E2E-003: Node drag-drop was broken by PR#...
- Fixed UNIT-012: Validation regex was too strict

New implementation:
- [Feature 1]
- [Feature 2]
"
```

---

## Steps 5-8: Unit + Integration Layer

### Step 5: Implement Pure Logic
Validation, calculations, transforms - no side effects.

### Step 6: Run Unit Tests Until GREEN
```bash
npm run test:unit
```
Fix failures, re-run. Instant feedback loop.

### Step 7: Implement Tauri Backend
Commands, state management, store operations.

### Step 8: Run Integration Tests Until GREEN
```bash
npm run test:integration
```
Fix failures, re-run. No build needed.

---

## Step 9: Implement Frontend with Design Tokens

React components with:
- Correct `data-testid` attributes
- **ONLY design token classes (no arbitrary values)**
- Proper hover/focus/active states

**Example of correct styling:**
```tsx
// ✅ CORRECT - uses design tokens
<button className="bg-primary-500 hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 rounded-sm px-4 py-2">

// ❌ WRONG - arbitrary values
<button className="bg-[#6366F1] hover:bg-[#4F46E5] rounded-[5px] px-[15px] py-[9px]">
```

**v9.0 extra emphasis:**

**Every interactive element MUST have a real handler:**

```tsx
// ❌ FORBIDDEN - Placeholder buttons
<button>Edit</button>
<button onClick={() => {}}>View</button>

// ✅ REQUIRED - Real implementation
<button onClick={handleEdit}>Edit</button>
<button onClick={() => setViewMode('detail')}>View</button>
```

**If you can't implement it now, DON'T ADD THE ELEMENT.**

---

## Step 10: Implement Completeness Pairs (NEW in v9.0)

**CRITICAL: Both halves of every pair must be implemented together.**

### Completeness Pairs Checklist

For each action you implement, verify its pair exists:

| If you implement... | You MUST also implement... |
|---------------------|---------------------------|
| Add node | Delete node |
| Place via drag-drop | Move existing node |
| Connect nodes | Disconnect nodes |
| Open panel | Close panel |
| Select element | Deselect element |
| Start simulation | Stop/pause simulation |
| Show dialog | Close dialog |
| Zoom in | Zoom out |
| Enable feature | Disable feature |

### Implementation Pattern

```tsx
// ✅ CORRECT - Implement both at once
function handleAddNode() { ... }
function handleDeleteNode() { ... }  // Implement in same PR

// ❌ WRONG - "I'll add delete later"
function handleAddNode() { ... }
// handleDeleteNode - TODO for next epic  ← DON'T DO THIS
```

### Verification

After implementing, run these checks:

```bash
# Check both halves are called somewhere in code
grep -rn "handleAddNode\|addNode" src --include="*.tsx"
grep -rn "handleDeleteNode\|deleteNode" src --include="*.tsx"

# If one exists without the other, implement the missing half
```

---

## Step 11: Lint for Design Tokens

```bash
npm run lint:styles
```
**Must pass with zero violations before proceeding to build.**

---

## Step 12: Check for Empty Handlers (NEW in v9.0)

**CRITICAL: Run this before every build.**

```bash
# Check for empty handlers
echo "Checking for forbidden patterns..."

EMPTY_HANDLERS=$(grep -rn "onClick={() => {}}\|onDragStart={() => {}}\|onChange={() => {}}" src --include="*.tsx" | wc -l)
CONSOLE_PLACEHOLDERS=$(grep -rn "onClick={() => console" src --include="*.tsx" | wc -l)
TEST_ONLY_PATHS=$(grep -rn "NODE_ENV.*===.*test\|import.meta.env.MODE.*test" src --include="*.ts" --include="*.tsx" | wc -l)

if [ "$EMPTY_HANDLERS" -gt 0 ]; then
  echo "❌ Found $EMPTY_HANDLERS empty handlers - FIX BEFORE PROCEEDING"
  grep -rn "onClick={() => {}}\|onDragStart={() => {}}\|onChange={() => {}}" src --include="*.tsx"
  exit 1
fi

if [ "$CONSOLE_PLACEHOLDERS" -gt 0 ]; then
  echo "❌ Found $CONSOLE_PLACEHOLDERS console.log placeholders - FIX BEFORE PROCEEDING"
  grep -rn "onClick={() => console" src --include="*.tsx"
  exit 1
fi

if [ "$TEST_ONLY_PATHS" -gt 0 ]; then
  echo "❌ Found $TEST_ONLY_PATHS test-only code paths - FIX BEFORE PROCEEDING"
  grep -rn "NODE_ENV.*===.*test\|import.meta.env.MODE.*test" src --include="*.ts" --include="*.tsx"
  exit 1
fi

echo "✅ No forbidden patterns found"
```

**If any patterns found:** Fix them before building. Do NOT proceed with placeholders.

---

## Step 13-14: Build and E2E

### Step 13: Build
```bash
npm run tauri build
```

### Step 14: Run E2E Tests Until GREEN
```bash
npm run test:e2e
```

**Fix Loop:** Read error → Fix code → Rebuild → Re-run.

---

## Step 15: Enable Smoke Tests for Implemented Features (NEW in v9.0)

**Remove `.skip` from smoke tests that correspond to implemented features.**

### Example

If you implemented:
- Add node
- Delete node
- File menu

Then in `e2e/specs/smoke.e2e.js`:

```javascript
// Before (from bootstrap)
it.skip('Add and Delete nodes both work', async () => { ... });
it.skip('File menu items all work', async () => { ... });

// After (your implementation)
it('Add and Delete nodes both work', async () => {
  // Add node
  await dragFromPalette('[data-testid="palette-node"]', 200, 200);
  expect(await $('[data-testid="node-1"]').isDisplayed()).toBe(true);

  // Delete node
  await $('[data-testid="node-1"]').click();
  await browser.keys(['Delete']);
  expect(await $('[data-testid="node-1"]').isExisting()).toBe(false);
});

it('File menu items all work', async () => {
  await $('[data-testid="menu-file"]').click();

  await $('[data-testid="menu-new"]').click();
  // Verify new project action

  await $('[data-testid="menu-file"]').click();
  await $('[data-testid="menu-save"]').click();
  // Verify save action
});
```

### Run Smoke Tests

```bash
npm run test:e2e -- --spec './e2e/specs/smoke.e2e.js'
```

All enabled smoke tests must pass. If they fail, fix the implementation.

---

## Steps 16-17: Visual and Accessibility

### Step 16: Capture/Update Visual Baselines

**First epic:** Creates baseline screenshots.
**Later epics:** Compares to baselines, updates if intentional changes.

```bash
npm run test:visual
```

**If baselines don't exist:** They auto-save on first run (autoSaveBaseline: true).

**If visual diff detected:**
1. Review the diff in `e2e/screenshots/diff/`
2. If intentional change: delete old baseline, re-run to save new
3. If regression: fix the code

### Step 17: Run Accessibility Tests
```bash
npm run test:a11y
```

**Common fixes:**
- Low contrast: adjust colors in Tailwind config
- Missing focus ring: add `focus:ring-2 focus:ring-primary-500`
- Missing labels: add `aria-label` or visible label

---

## Step 18: Regression Check

**Run ALL tests at ALL layers:**

```bash
npm run lint:styles
npm run test:unit
npm run test:integration
npm run tauri build
npm run test:e2e
npm run test:visual
npm run test:a11y
```

**If any fail:** Fix before committing.

---

## Step 19: Commit and Exit

```bash
git add .
git commit -m "$(cat <<'EOF'
feat(epic-[N]): implement [Epic Name]

Implementation:
- [Feature 1]
- [Feature 2]

Completeness pairs verified:
- Add ↔ Delete: ✅
- Place ↔ Move: ✅
- Open ↔ Close: ✅

Fixed bugs from previous epics:
- [Bug 1 if any]

No forbidden patterns:
- Empty handlers: 0
- Console placeholders: 0
- Test-only code: 0

Tests passing:
- Unit: X/X
- Integration: X/X
- E2E: X/X
- Smoke: Y enabled, Y passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Epic Completion Output

**Print this and EXIT (do NOT continue to next epic):**

```
════════════════════════════════════════════════════════════════
Epic [N] Complete: [Name]
════════════════════════════════════════════════════════════════

✅ Tests Passing:
   Unit: X/X
   Integration: X/X
   E2E: X/X

✅ v9.0 Quality Checks:
   Empty handlers: 0 ✅
   Completeness pairs: All implemented ✅
   Smoke tests enabled: Y ✅
   Previous bugs fixed: [count] ✅

WORKER DONE - Waiting for orchestrator
════════════════════════════════════════════════════════════════
```

---

## IMPORTANT: One Epic Per Worker

**You implement ONE epic only, then EXIT.**

The orchestrator handles:
- Detecting your completion
- Killing your process
- Spawning a NEW worker for the next epic

**DO NOT:**
- Advance currentEpic yourself
- Continue to the next epic
- Loop through multiple epics

---

## Phase-Specific Rules

### You Must (Phase 4)
- Read existing code patterns first
- Implement in pyramid order: Logic → Backend → Frontend
- **Fix ANY bug you encounter, even from previous epics**
- **Implement BOTH halves of completeness pairs**
- **Check for empty handlers before every build**
- **Enable smoke tests for implemented features**
- Run tests at each layer before proceeding
- Build before E2E tests
- Check for regressions
- **EXIT after completing ONE epic**

### You Must NOT (Phase 4)
- Skip any test layer
- Run E2E before Unit/Integration pass
- Implement features for other epics
- **Add empty handlers or placeholder code**
- **Implement one action without its pair**
- **Skip or ignore bugs from previous epics**
- **Continue to next epic (orchestrator handles that)**

---

**Execute now. Implement current epic (Unit → Integration → E2E). Verify no placeholders.**
