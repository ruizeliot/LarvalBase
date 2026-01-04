# Phase 4: Implement & Validate (Worker CLAUDE.md)

**Pipeline Version:** 10.0
**Phase:** 4 - Implement (Functionality-First)
**Mode:** Autonomous (no user interaction)

---

# Worker Base Rules v10.0

**This file contains shared rules for ALL desktop pipeline workers.**

---

# Shared Rules (All Agents)

## Rule 1: WebSearch First

**Always search for anything technical. Don't rely on training knowledge.**

| Situation | Action |
|-----------|--------|
| Before implementing ANY technical solution | WebSearch first |
| Before claiming something is a "limitation" | WebSearch to verify |
| When encountering an error message | WebSearch the exact error |
| When using a library/API | WebSearch for current documentation |

**If you're about to write code based on memory, STOP and search first.**

---

## Rule 2: Self-Reflection After Every Task

### Fixed Checklist

- [ ] **Did I search before implementing?**
- [ ] **Did I check existing code patterns first?**
- [ ] **Did I avoid placeholders?**
- [ ] **Did I implement both halves of completeness pairs?**
- [ ] **Did I handle edge cases?**
- [ ] **Did I use real actions, not synthetic events?**
- [ ] **If I struggled, did I search for solutions rather than guess repeatedly?**

### Action on Failure

**If any checklist item is NO:** STOP, fix the issue, re-run the checklist.

---

## Rule 3: Research Before Claiming Limitations

**You MUST search online BEFORE claiming something is a "known limitation."**

---

# Worker-Specific Rules

## 1. Orchestrator Communication

- Initialize todos at phase startup
- Mark todos as `in_progress` when starting a task
- Mark todos as `completed` when finished
- One todo `in_progress` at a time

---

## 2. FORBIDDEN PATTERNS (Gate Enforcement)

### 🔴 NO MOCKING OF SYSTEM APIS (Most Important)

```typescript
// ❌ FORBIDDEN - Mocking Tauri APIs
jest.mock('@tauri-apps/plugin-dialog', () => ({...}))
vi.mock('@tauri-apps/plugin-fs', () => ({...}))

// ❌ FORBIDDEN - Hardcoded data instead of real API
const mockScenario = { nodes: [], edges: [] };
const filePath = '/hardcoded/path.json';

// ❌ FORBIDDEN - Test-only code paths
if (process.env.NODE_ENV === 'test') { return mockData; }
```

**If you're tempted to write any of these, STOP. The feature is not implemented.**

### No Empty Handlers

```tsx
// ❌ FORBIDDEN
onClick={() => {}}
onClick={() => console.log('TODO')}

// ✅ REQUIRED
onClick={() => handleEdit()}
```

---

## 3. Completeness Pairs

| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Place | Move / Reposition |
| Connect | Disconnect |
| Open / Expand | Close / Collapse |
| Select | Deselect |
| Start | Stop / Pause |

---

## 4. Git Discipline

Commit at phase end with conventional format including test counts.

---

# Phase 4: Implement & Validate (Functionality-First)

**Purpose:** Implement REAL functionality using REAL APIs - tests verify it works
**Input:** Skeleton app with real API imports + failing tests
**Output:** Working features with passing tests at all layers
**Mode:** Autonomous (no user interaction)

---

## 🔴 CRITICAL: Functionality-First, Not Test-First

**This is the KEY DIFFERENCE from previous versions.**

```
OLD (WRONG):
1. Look at test → 2. Write code to pass test → 3. If hard, mock it

NEW (CORRECT):
1. Look at functionality spec → 2. Implement REAL behavior → 3. Run test → 4. Test passes because real thing works
```

### The Core Rule

**If a test cannot pass without a mock, THE FEATURE IS NOT IMPLEMENTED.**

Fix the implementation. Call the real API. Make it work for real.

---

## ⛔ FORBIDDEN PATTERNS (Absolute Ban)

### Anti-Pattern Detection (Run Before Every Commit)

```bash
# MOCKING (most important check)
grep -rn "jest.mock.*@tauri-apps" src tests --include="*.ts" --include="*.tsx"
grep -rn "vi.mock.*@tauri-apps" src tests --include="*.ts" --include="*.tsx"

# Hardcoded mock data
grep -rn "mockScenario\|mockData\|fakeData" src --include="*.ts" --include="*.tsx"

# Empty handlers
grep -rn "onClick={() => {}}" src --include="*.tsx"

# Test-only code paths
grep -rn "NODE_ENV.*===.*test" src --include="*.ts" --include="*.tsx"
```

**Expected:** Zero matches for ALL patterns. ANY match = stop and fix.

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read manifest for current epic", status: "in_progress", activeForm: "Reading manifest" },
  { content: "2. Identify tests for this epic (all layers)", status: "pending", activeForm: "Identifying tests" },
  { content: "3. Read existing code patterns", status: "pending", activeForm: "Reading patterns" },
  { content: "4. Check for bugs from previous epics", status: "pending", activeForm: "Checking for bugs" },
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
|-------|-------|-----------|
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
Identify `currentEpic`, epic name, user stories.

### Step 2: Read Functionality Specs
From `docs/functionality-specs.md`, identify what real behavior must exist.

### Step 3: Read Existing Code Patterns
**CRITICAL: Do this BEFORE implementing.**
```bash
cat src-tauri/src/lib.rs | head -100
grep -r "invoke" src --include="*.tsx" | head -20
```

---

## Step 4: Check for Bugs from Previous Epics

**⚠️ EPIC 1 SKIP:** If `currentEpic` is 1, skip this step.

**For Epic 2+:** Fix bugs before implementing new features.

```bash
npm run test:unit
npm run test:integration
npm run tauri build && npm run test:e2e
```

**If any tests fail:** Fix them before implementing the new epic.

---

## Steps 5-8: Unit + Integration Layer

### Step 5: Implement Pure Logic
Validation, calculations, transforms - no side effects.

### Step 6: Run Unit Tests Until GREEN
```bash
npm run test:unit
```

### Step 7: Implement Tauri Backend
Commands, state management, store operations.

### Step 8: Run Integration Tests Until GREEN
```bash
npm run test:integration
```

---

## Step 9: Implement Frontend with Design Tokens

**ONLY design token classes (no arbitrary values):**
```tsx
// ✅ CORRECT
<button className="bg-primary-500 hover:bg-primary-600 rounded-sm px-4 py-2">

// ❌ WRONG
<button className="bg-[#6366F1] rounded-[5px] px-[15px]">
```

---

## Step 10: Implement Completeness Pairs

**CRITICAL: Both halves of every pair must be implemented together.**

```tsx
// ✅ CORRECT - Implement both at once
function handleAddNode() { ... }
function handleDeleteNode() { ... }  // Implement in same PR

// ❌ WRONG
function handleAddNode() { ... }
// handleDeleteNode - TODO for next epic  ← DON'T DO THIS
```

---

## Steps 11-14: Build and E2E

### Step 11: Lint for Design Tokens
```bash
npm run lint:styles
```

### Step 12: Check for Empty Handlers
```bash
grep -rn "onClick={() => {}}" src --include="*.tsx"
```
**Must be zero.**

### Step 13: Build
```bash
npm run tauri build
```

### Step 14: Run E2E Tests
```bash
npm run test:e2e
```

---

## Steps 15-18: Visual, A11y, Regression

### Step 15: Enable Smoke Tests
Remove `.skip` from smoke tests for implemented features.

### Step 16: Capture Visual Baselines
```bash
npm run test:visual
```

### Step 17: Run Accessibility Tests
```bash
npm run test:a11y
```

### Step 18: Regression Check
Run ALL tests at ALL layers.

---

## Step 19: Commit and Exit

```bash
git commit -m "feat(epic-[N]): implement [Epic Name]"
```

**Print completion output and EXIT. Do NOT continue to next epic.**

---

## IMPORTANT: One Epic Per Worker

**You implement ONE epic only, then EXIT.**

The orchestrator handles:
- Detecting your completion
- Killing your process
- Spawning a NEW worker for the next epic

---

## Phase 4 Rules

### You Must (Phase 4)
- **Use REAL APIs, NEVER mocks**
- **Read functionality-specs.md**
- Read existing code patterns first
- Implement in pyramid order
- **Call real Tauri APIs**
- **Fix ANY bug you encounter, even from previous epics**
- **Implement BOTH halves of completeness pairs**
- **Check for empty handlers AND mocks before every build**
- **Enable smoke tests for implemented features**
- Run tests at each layer before proceeding
- Build before E2E tests
- **EXIT after completing ONE epic**

### You Must NOT (Phase 4)
- **⛔ NEVER mock system APIs** (Tauri, dialog, filesystem, OS)
- **⛔ NEVER add hardcoded/fake data instead of real API calls**
- **⛔ NEVER add test-only code paths**
- Skip any test layer
- Run E2E before Unit/Integration pass
- **Add empty handlers or placeholder code**
- **Implement one action without its pair**
- **Skip or ignore bugs from previous epics**
- **Continue to next epic (orchestrator handles that)**

---

**Execute now. Implement current epic (Unit → Integration → E2E). Verify no placeholders.**
