# Phase 3: Bootstrap (Worker CLAUDE.md)

**Pipeline Version:** 10.0
**Phase:** 3 - Bootstrap (Integrations-First)
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

## 2. FORBIDDEN PATTERNS (Gate 1 Checks This)

### E2E Tests MUST Use Real WebdriverIO Actions

| ❌ FORBIDDEN (Synthetic Events) | ✅ REQUIRED (Real Actions) |
|--------------------------------|---------------------------|
| `browser.execute(() => { el.dispatchEvent(new MouseEvent) })` | `$('selector').click()` |
| `browser.execute(() => { el.dispatchEvent(new DragEvent) })` | `$('source').dragAndDrop($('target'))` |
| `browser.execute(() => { new DataTransfer() })` | Use WebdriverIO's native drag-drop |

---

## 3. Completeness Pairs

| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Place | Move / Reposition |
| Connect | Disconnect |
| Open / Expand | Close / Collapse |
| Select | Deselect |

---

## 4. Git Discipline

Commit at phase end with conventional format including test counts.

---

# Phase 3: Bootstrap (Integrations-First)

**Purpose:** Install ALL integrations FIRST, then create skeleton that uses REAL APIs
**Input:** `docs/user-stories.md`, `docs/functionality-specs.md`
**Output:** Tauri app with all plugins installed + skeleton using real APIs + failing tests
**Mode:** Autonomous (no user interaction)

---

## 🔴 CRITICAL: Integrations FIRST, Skeleton SECOND

**This is the KEY CHANGE from previous versions.**

```
OLD (WRONG):
1. Create skeleton → 2. Write tests → 3. Hope integrations work later

NEW (CORRECT):
1. Install ALL integrations → 2. Verify they work → 3. Create skeleton using real APIs → 4. Write tests
```

### Why This Order Matters

With integrations-first:
1. tauri-plugin-dialog is installed in Phase 3
2. Skeleton imports real `open()` function
3. Tests fail because button doesn't call `open()` yet
4. Phase 4 implements real call → tests pass → app works

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read functionality-specs.md and extract integrations", status: "in_progress", activeForm: "Extracting integrations" },
  { content: "2. Create Tauri project (basic)", status: "pending", activeForm: "Creating project" },
  { content: "3. INSTALL: All npm packages from specs", status: "pending", activeForm: "Installing npm packages" },
  { content: "4. INSTALL: All cargo crates from specs", status: "pending", activeForm: "Installing cargo crates" },
  { content: "5. REGISTER: All plugins in lib.rs", status: "pending", activeForm: "Registering plugins" },
  { content: "6. CONFIGURE: All capabilities in Tauri", status: "pending", activeForm: "Configuring capabilities" },
  { content: "7. VERIFY: Integration tests (plugins available)", status: "pending", activeForm: "Verifying integrations" },
  { content: "8. Create skeleton using REAL API imports", status: "pending", activeForm: "Creating skeleton with real APIs" },
  { content: "9. Set up Tailwind with strict design tokens", status: "pending", activeForm: "Setting up Tailwind" },
  { content: "10. Set up Vitest (Unit + Integration)", status: "pending", activeForm: "Setting up Vitest" },
  { content: "11. Set up WebdriverIO + tauri-driver (E2E)", status: "pending", activeForm: "Setting up WebdriverIO" },
  { content: "12. Create interaction test helpers", status: "pending", activeForm: "Creating interaction helpers" },
  { content: "13. Implement all test layers from specs", status: "pending", activeForm: "Implementing tests" },
  { content: "14. RED CHECK: All layers 100% failing", status: "pending", activeForm: "Verifying RED state" },
  { content: "15. BUILD: Run tauri build", status: "pending", activeForm: "Building Tauri app" },
  { content: "16. VALIDATE: Launch .exe (no crash)", status: "pending", activeForm: "Validating launch" },
  { content: "17. Update manifest and git commit", status: "pending", activeForm: "Committing" }
])
```

---

## CRITICAL: 100% RED State Required

**ALL tests at ALL LAYERS must fail.**

| Layer | Expected | Why Failures Prove RED |
|-------|----------|------------------------|
| Unit | 100% failing | Functions don't exist |
| Integration | 100% failing | Tauri commands don't exist |
| E2E | 100% failing | UI flow doesn't work |
| Visual | 100% failing | No baselines, no styled components |
| Smoke | 100% failing | No clickable elements work |

---

## Steps 1-7: Install Integrations First

### Step 1: Read Functionality Specs
Extract all required integrations from `docs/functionality-specs.md`.

### Step 2: Create Tauri Project
```bash
npm create tauri-app@latest . -- --template react-ts
cd src-tauri && cargo build
```

### Steps 3-4: Install ALL Packages
```bash
# npm packages
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs

# cargo crates
cd src-tauri
cargo add tauri-plugin-dialog tauri-plugin-fs
```

### Step 5: Register ALL Plugins in lib.rs
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    // Add all plugins from specs
```

### Step 6: Configure ALL Capabilities
Edit `src-tauri/capabilities/default.json` with all permissions.

### Step 7: VERIFY Integrations
Create integration tests that prove plugins are available:
```typescript
import { open } from '@tauri-apps/plugin-dialog';
expect(typeof open).toBe('function');  // Must PASS
```

---

## Step 8: Create Skeleton with REAL API Imports

**Import real APIs, not mocks:**

```typescript
// ✅ CORRECT - imports real API
import { open } from '@tauri-apps/plugin-dialog';

const handleBrowse = async () => {
  // TODO: Call open() in Phase 4
};

// ❌ WRONG - uses mock
const handleBrowse = () => {
  loadMockData('/fake/path.json');  // FORBIDDEN
};
```

---

## Steps 9-12: Test Infrastructure

### Step 9: Tailwind with Strict Design Tokens
Configure `tailwind.config.js` with only allowed colors, spacing, borderRadius.
Add ESLint rule to reject arbitrary values.

### Steps 10-11: Test Runners
- Vitest for Unit + Integration
- WebdriverIO + tauri-driver for E2E

### Step 12: Create Interaction Helpers
Create `e2e/helpers/interactions.ts` with:
- `dragFromPalette(selector, x, y)`
- `moveElement(selector, deltaX, deltaY)`
- `connectNodes(source, target)`
- `typeInto(selector, text)`
- `pressKeys(keys[])`

---

## Steps 13-17: Tests and Verification

### Step 13: Implement Tests from Specs
Convert specs to actual test files.

### Step 14: Verify RED State
All tests must fail (except plugin verification).

### Step 15: Build
```bash
npm run tauri build
```

### Step 16: Validate Launch
Launch .exe, verify no crash.

### Step 17: Commit
```bash
git commit -m "bootstrap: project skeleton with failing multi-layer tests"
```

---

## Phase 3 Rules

### You Must (Phase 3)
- **Read functionality-specs.md FIRST to extract all integrations**
- **Install ALL npm packages from specs BEFORE creating skeleton**
- **Install ALL cargo crates from specs BEFORE creating skeleton**
- **Register ALL plugins in lib.rs**
- **Add ALL capabilities to Tauri config**
- **Create integration tests to verify plugins are available**
- **Create skeleton that imports REAL APIs (not mocks)**
- Set up Tailwind with strict design tokens
- Set up ALL test layers
- Create interaction test helpers
- Verify 100% RED at all layers
- Build and validate app launches

### You Must NOT (Phase 3)
- **Create skeleton before installing integrations**
- **Skip any integration listed in functionality-specs.md**
- **Use mock imports in skeleton components**
- **Use fake/hardcoded data in skeleton**
- **Have E2E tests fail because integration is missing**
- Skip any test layer
- Use arbitrary Tailwind values
- Skip the DevTools minimizer setup
- Skip interaction helpers

---

**Execute now. Install integrations FIRST, then create skeleton with REAL APIs.**
