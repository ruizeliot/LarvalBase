# Phase 2: Functionality Specifications (Worker CLAUDE.md)

**Pipeline Version:** 10.0
**Phase:** 2 - Functionality Specs
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
| When unsure about syntax or patterns | WebSearch for examples |
| Before saying "this doesn't work" | WebSearch for workarounds |

**If you're about to write code based on memory, STOP and search first.**

---

## Rule 2: Self-Reflection After Every Task

**After completing each task, run this checklist before moving on.**

### Fixed Checklist

- [ ] **Did I search before implementing?**
- [ ] **Did I check existing code patterns first?**
- [ ] **Did I avoid placeholders?**
- [ ] **Did I implement both halves of completeness pairs?**
- [ ] **Did I handle edge cases?**
- [ ] **Did I use real actions, not synthetic events?**
- [ ] **Did I test what was asked, not something easier?**
- [ ] **If I struggled, did I search for solutions rather than guess repeatedly?**
- [ ] **If I claimed a limitation, did I verify it exists?**

### Action on Failure

**If any checklist item is NO:** STOP, fix the issue, re-run the checklist.

---

## Rule 3: Research Before Claiming Limitations

**You MUST search online BEFORE claiming something is a "known limitation" or "doesn't work."**

---

# Worker-Specific Rules

## 1. Orchestrator Communication

**CRITICAL: The orchestrator tracks your progress via the todo list.**

- Initialize todos at phase startup
- Mark todos as `in_progress` when starting a task
- Mark todos as `completed` when finished
- One todo `in_progress` at a time

---

## 2. FORBIDDEN PATTERNS

### No Mocking of System APIs

```javascript
// ❌ FORBIDDEN - Mocking Tauri APIs
jest.mock('@tauri-apps/plugin-dialog', () => ({...}))
vi.mock('@tauri-apps/plugin-fs', () => ({...}))

// ❌ FORBIDDEN - Hardcoded data in production code
const mockScenario = { nodes: [], edges: [] }
```

### No Synthetic Events in E2E

```javascript
// ❌ FORBIDDEN
browser.execute(() => { el.dispatchEvent(new MouseEvent(...)) })

// ✅ REQUIRED - Real WebdriverIO actions
$('selector').click()
$('source').dragAndDrop($('target'))
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
| Show | Hide |
| Enable | Disable |

---

## 4. Edge Case Matrix

| Category | Edge Cases |
|----------|------------|
| Empty state | No items, first item, single item |
| Boundaries | Min value, max value, at limit |
| Invalid input | Empty string, special chars, too long |
| Rapid actions | Double-click, spam clicks, drag cancel |
| Interruption | Action during loading, mid-drag escape |
| State conflicts | Delete while editing, move while drag |

---

## 5. Git Discipline

Commit at phase end with conventional format including test counts.

---

# Phase 2: Functionality Specifications

**Purpose:** Define what MUST ACTUALLY WORK - functionality specs, not just test specs
**Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md`
**Output:** `docs/functionality-specs.md`
**Mode:** Autonomous (no user interaction)

---

## 🔴 CRITICAL: Functionality-First Philosophy

**This phase defines what REAL behavior must exist.**

```
Working App = Success
Passing Tests = Verification that app works
```

**Tests verify that implemented functionality works. Tests do NOT define what "working" means - the functionality does.**

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read user-stories.md and extract required integrations", status: "in_progress", activeForm: "Extracting integrations" },
  { content: "2. Define functionality specs per feature (real behavior)", status: "pending", activeForm: "Defining functionality" },
  { content: "3. List ALL required integrations (npm + cargo)", status: "pending", activeForm: "Listing integrations" },
  { content: "4. List ALL required capabilities (Tauri permissions)", status: "pending", activeForm: "Listing capabilities" },
  { content: "5. Define FORBIDDEN patterns per feature", status: "pending", activeForm: "Defining forbidden patterns" },
  { content: "6. Generate E2E specs (REAL behavior, NO MOCKS)", status: "pending", activeForm: "Generating E2E specs" },
  { content: "7. VERIFY: E2E count equals story count", status: "pending", activeForm: "Verifying 1:1 mapping" },
  { content: "8. VERIFY: All integrations listed for each feature", status: "pending", activeForm: "Verifying integrations" },
  { content: "9. Generate Unit + Integration specs", status: "pending", activeForm: "Generating Unit/Integration specs" },
  { content: "10. Generate Visual Quality specs", status: "pending", activeForm: "Generating Visual specs" },
  { content: "11. Add edge cases (2-5 per E2E)", status: "pending", activeForm: "Adding edge cases" },
  { content: "12. VERIFY: Completeness pairs covered", status: "pending", activeForm: "Verifying completeness pairs" },
  { content: "13. Create integration checklist for Phase 3", status: "pending", activeForm: "Creating integration checklist" },
  { content: "14. Write docs/functionality-specs.md", status: "pending", activeForm: "Writing functionality specs" },
  { content: "15. Run independent review (subagent)", status: "pending", activeForm: "Running review" },
  { content: "16. Fix issues if review fails", status: "pending", activeForm: "Fixing issues" }
])
```

---

## ⛔ FORBIDDEN EVERYWHERE

### NO MOCKING of System APIs

```javascript
// ❌ FORBIDDEN
jest.mock('@tauri-apps/plugin-dialog', () => ({...}))
vi.mock('@tauri-apps/plugin-fs', () => ({...}))
const mockScenario = { nodes: [], edges: [] }
```

### REQUIRED: Real Interactions

```javascript
// ✅ REQUIRED - Real WebdriverIO actions
await $('[data-testid="palette-factory"]').click()
await $('[data-testid="palette-item"]').dragAndDrop($('[data-testid="canvas"]'))
await $('[data-testid="input"]').setValue('My Factory')
await browser.keys(['Delete'])
```

---

## Functionality Spec Format

**For each feature, create a spec using this format:**

```markdown
## Feature: [Name]

### 1. Functionality Definition
What REAL behavior must exist:
- User clicks "Browse" → Native OS file picker opens
- User selects file → File content is loaded into app

### 2. Required Integrations

| Package | Type | Purpose |
|---------|------|---------|
| @tauri-apps/plugin-dialog | npm | Native file picker |
| tauri-plugin-dialog | cargo | Rust side of dialog |

### 3. Capabilities Required
- `dialog:allow-open`
- `fs:allow-read`

### 4. Test Criteria
- Tests MUST call real Tauri APIs
- NO MOCKS ALLOWED

### 5. Forbidden Anti-Patterns
- `jest.mock('@tauri-apps/plugin-dialog')`
- Hardcoded file paths
```

---

## Step 1: Read Stories and Extract Integrations

Count total user stories. Record: `storyCount = [N]`

**Scan every user story for implied system integrations:**

| Story Contains | Implies Integration |
|----------------|---------------------|
| "opens file", "browse for file" | tauri-plugin-dialog, tauri-plugin-fs |
| "saves file", "export to disk" | tauri-plugin-dialog, tauri-plugin-fs |
| "drag file into app" | tauri-plugin-fs |

---

## Steps 2-5: Define Functionality Specs

For each user story, create a functionality spec with:
1. Functionality Definition
2. Required Integrations
3. Capabilities Required
4. Test Criteria
5. Forbidden Anti-Patterns

---

## Steps 6-8: Generate E2E Specs

For each user story, create exactly one E2E test spec using **REAL interactions only:**

```markdown
### E2E-001: [Test Name] (US-001)

**Test:** [What is being tested]

**WebdriverIO Test (Real User Interactions):**
1. Click on [element] using `$('[data-testid="..."]').click()`
2. Drag [element] to [target] using `.dragAndDrop()`
3. Assert [visible result]
```

**VERIFY:** E2E count must equal story count.

---

## Steps 9-10: Unit, Integration, Visual Specs

Generate specs for each test layer including Visual Quality specs:
- VIS-E2E-001: Design Token Enforcement
- VIS-E2E-002: Visual Baseline Match
- VIS-E2E-003: Interactive State Visibility
- VIS-E2E-004: Accessibility Contrast

---

## Steps 11-12: Edge Cases and Completeness

**Every E2E test MUST include 2-5 edge cases from DIFFERENT categories.**

**Verify all completeness pairs have both halves tested:**
- Add ↔ Delete
- Place ↔ Move
- Connect ↔ Disconnect

---

## Steps 13-16: Document and Review

Create `docs/functionality-specs.md` with:
- Required Integrations table
- Required Capabilities list
- Functionality specs per feature
- E2E specs with edge cases
- Unit/Integration specs
- Visual specs

Run independent subagent review.

---

## Phase 2 Rules

### You Must (Phase 2)
- **Define functionality specs with all 5 sections**
- **List ALL required integrations (npm + cargo packages)**
- **List ALL required capabilities (Tauri permissions)**
- **Document FORBIDDEN patterns per feature**
- Enforce 1:1 E2E-to-story mapping
- **Write E2E specs using REAL interactions only (NO MOCKS)**
- **Verify all completeness pairs have both halves tested**
- **Include 2-5 edge cases per E2E**
- Include Visual Quality test specs
- Use independent reviewer

### You Must NOT (Phase 2)
- **Allow any mock patterns in specs**
- **Omit required integrations**
- **Omit required capabilities**
- Proceed if E2E count ≠ story count
- Write E2E specs that use synthetic events
- Skip completeness pair verification
- Omit Visual Quality test specs
- Write actual test code (just specs)

---

**Execute now. Define REAL functionality, list ALL integrations, document forbidden patterns.**
