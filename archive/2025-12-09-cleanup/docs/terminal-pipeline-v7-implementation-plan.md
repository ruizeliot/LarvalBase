# Terminal Pipeline v7.0 - Implementation Plan

**Created:** 2025-12-08
**Purpose:** Comprehensive plan to update all terminal pipeline commands based on AI Development Research
**Based On:** `docs/ai-development-research.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Global Changes (All Commands)](#2-global-changes-all-commands)
3. [Phase 1: Brainstorm](#3-phase-1-brainstorm)
4. [Phase 2: Test Specifications](#4-phase-2-test-specifications)
5. [Phase 3: Bootstrap](#5-phase-3-bootstrap)
6. [Phase 4: Implement](#6-phase-4-implement)
7. [Phase 5: Finalize](#7-phase-5-finalize)
8. [Feature Pipeline](#8-feature-pipeline)
9. [Fix Pipeline](#9-fix-pipeline)
10. [Implementation Order](#10-implementation-order)
11. [Verification Checklist](#11-verification-checklist)

---

## 1. Executive Summary

### Goals

1. **Integrate Testing Pyramid** - Add unit and integration test layers alongside E2E
2. **Improve AI Reliability** - Add anti-lazy prompting and false-completion prevention
3. **Optimize Debug Efficiency** - Fast tests first, slow tests last
4. **Maintain ATDD Philosophy** - User stories drive ALL test layers

### Key Principles from Research

| Principle | Source | Application |
|-----------|--------|-------------|
| Testing Pyramid | Martin Fowler | 30% unit, 40% integration, 30% E2E |
| Testing Trophy | Kent C. Dodds | "Mostly integration" for confidence |
| False Completion | Anthropic | Mark tasks FAILING initially |
| Lazy Default | Anthropic | Explicit "MUST" behaviors |
| Context Rot | Stanford | Keep critical info at start/end |
| Task Horizons | AI Digest | Break into 30-min chunks |

### Files to Modify

| File | Change Level | Description |
|------|--------------|-------------|
| `1-new-pipeline-terminal-v6.0.md` | Medium | Add test layer planning |
| `2-new-pipeline-terminal-v6.0.md` | **Major** | Full rewrite for multi-layer specs |
| `3-new-pipeline-terminal-v6.0.md` | **Major** | Add unit/integration infrastructure |
| `4-new-pipeline-terminal-v6.0.md` | Medium | Layered test execution |
| `5-new-pipeline-terminal-v6.0.md` | Medium | Multi-layer verification |
| `1-feature-pipeline-terminal-v6.0.md` | Medium | Add test layer planning |
| `2-feature-pipeline-terminal-v6.0.md` | **Major** | Multi-layer spec generation |
| `3-feature-pipeline-terminal-v6.0.md` | Medium | Layered test execution |
| `1-fix-pipeline-terminal-v6.0.md` | Medium | Test layer decision tree |

---

## 2. Global Changes (All Commands)

### 2.1 Add Mandatory Behaviors Section

**Add to ALL 9 commands immediately after the TODO LIST RULES section:**

```markdown
---

## MANDATORY BEHAVIORS (AI Reliability)

**CRITICAL - These rules prevent false completion and lazy defaults:**

### You MUST:
- **Run tests, not claim to have run them** - Show actual output
- **Complete ALL items**, not "most" items
- **Show actual test output** in your response, not summaries
- **Try 3 approaches** before saying "not possible"
- **Break down large tasks** instead of saying "too much work"

### You MUST NOT:
- Declare completion without running verification commands
- Summarize test results instead of showing them
- Skip items because they seem redundant
- Give up after one failed approach

### Evidence Before Assertions
```
❌ WRONG: "All tests pass"
✅ RIGHT: "Test output: 12 passed, 0 failed (showing actual output)"
```

---
```

**Location:** Insert after `## TODO LIST RULES` section in each file.

### 2.2 Add Context Management Section

**Add to ALL autonomous phases (Phase 2, 3, 4, 5):**

```markdown
---

## Context Management (Prevent Context Rot)

**Long conversations degrade AI recall. Mitigate with:**

1. **Critical info placement:** Key instructions are at START and END of this prompt
2. **Fresh context:** Use `/clear` between major tasks if context grows large
3. **Re-read before acting:** If unsure, re-read the "You Must" section before proceeding
4. **Checkpoint summaries:** After each major step, briefly summarize what was done

---
```

**Location:** Insert after `## Pipeline Execution Mode` section.

### 2.3 Update Version References

**In all files, update:**
- Header: `v6.0` → `v7.0`
- Filename references: Keep `v6.0` in filename for now (rename later)
- Internal version: `pipeline version: 7.0`

---

## 3. Phase 1: Brainstorm

**File:** `1-new-pipeline-terminal-v6.0.md`

### 3.1 Add Test Layer Planning Section

**Insert after "Part 2: User Story Definition" and before "Process":**

```markdown
---

## Test Layer Planning (ATDD + Pyramid)

**Every acceptance criterion should be testable. Plan which layer tests it:**

### Test Layer Decision Matrix

| Criterion Type | Unit Test | Integration Test | E2E Test |
|----------------|-----------|------------------|----------|
| Validation logic | ✓ | - | - |
| Calculation/transform | ✓ | - | - |
| Service interaction | - | ✓ | - |
| Data persistence | - | ✓ | ✓ |
| API integration | - | ✓ | ✓ |
| Keyboard shortcut | - | - | ✓ |
| Screen navigation | - | - | ✓ |
| Visual output | - | - | ✓ |

### Per-Story Test Planning

When creating acceptance criteria, annotate with test layer:

```markdown
**Acceptance Criteria:**
- [ ] Input validation rejects empty values [UNIT]
- [ ] Config saves to disk correctly [INTEGRATION]
- [ ] Form shows validation error message [E2E]
- [ ] Escape key returns to menu [E2E]
```

### Why Multiple Layers?

| When E2E Fails... | Without Lower Layers | With Lower Layers |
|-------------------|---------------------|-------------------|
| Find the bug | Search entire codebase | Unit test shows exact function |
| Fix iteration | Run full E2E (slow) | Run unit test (instant) |
| Regression check | Full suite | Targeted layer |

**For AI developers:** Fewer tokens spent debugging, faster iteration cycles.

---
```

### 3.2 Update User Story Format

**Modify the User Story Output template to include test layer annotations:**

```markdown
### US-001: [Title]

**As a** [user role]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] [Criterion 1] `[UNIT]`
- [ ] [Criterion 2] `[INTEGRATION]`
- [ ] [Criterion 3] `[E2E]`

**Keyboard:** [relevant shortcuts]
**Test Layers:** Unit: 1, Integration: 1, E2E: 1
```

### 3.3 Add Verification Todo

**Add to TODO list:**

```
{ content: "VERIFY: Each criterion tagged with test layer (UNIT/INTEGRATION/E2E)", status: "pending", activeForm: "Verifying test layers" },
```

### 3.4 Update "You Must" Section

**Add:**
```markdown
- Tag each acceptance criterion with test layer [UNIT], [INTEGRATION], or [E2E]
- Ensure at least one UNIT-testable criterion per story (if logic exists)
```

---

## 4. Phase 2: Test Specifications

**File:** `2-new-pipeline-terminal-v6.0.md`

### 4.1 Rename and Update Purpose

**Change header:**
```markdown
# Phase 2: Test Specifications (Terminal/TUI App)
```

**Change purpose:**
```markdown
**Purpose:** Generate test specs at ALL layers (Unit, Integration, E2E)
**Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md`
**Output:** `docs/test-specs.md` (replaces `docs/e2e-test-specs.md`)
**Stack:** Vitest (unit/integration), CLET + node-pty (E2E)
```

### 4.2 Add Testing Strategy Section

**Insert after "Pipeline Execution Mode":**

```markdown
---

## Testing Strategy: The Pyramid Approach

### Why Multiple Test Layers?

**E2E tests are the GUARANTEE. Lower layers are for DEBUGGING EFFICIENCY.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              E2E TESTS                                       │
│                    (Every user story, every edge case)                       │
│                       THE GUARANTEE - NON-NEGOTIABLE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                          INTEGRATION TESTS                                   │
│                (Services working together, real dependencies)                │
│                       FAST DEBUGGING - LOCATE BUGS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                             UNIT TESTS                                       │
│                   (Pure logic, calculations, reducers)                       │
│                      INSTANT FEEDBACK - PINPOINT BUGS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                           STATIC ANALYSIS                                    │
│                      (TypeScript, ESLint, Prettier)                          │
│                       CATCH TYPOS BEFORE RUNTIME                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Distribution Target

| Layer | Percentage | Speed | Purpose |
|-------|------------|-------|---------|
| Unit | 30-40% | <10ms each | Pinpoint exact function |
| Integration | 30-40% | <100ms each | Identify service issue |
| E2E | 20-30% | <5s each | Verify user journey |

### Framework Stack

| Layer | Framework | Location |
|-------|-----------|----------|
| Unit | Vitest + ink-testing-library | `tests/unit/` |
| Integration | Vitest | `tests/integration/` |
| E2E | CLET + node-pty + Vitest | `tests/e2e/` |

---
```

### 4.3 Rewrite Process Steps

**Replace existing process with:**

```markdown
---

## Process

### Step 1: Read User Stories

```bash
cat docs/user-stories.md
```

Identify:
- All stories and their acceptance criteria
- Test layer tags on each criterion
- Stories requiring each test type

**Checkpoint:** "Read user stories"

---

### Step 2: Generate Unit Test Specs

**For each `[UNIT]` tagged criterion:**

```markdown
### Unit Tests for US-001

**File:** `tests/unit/validators.test.ts`

**Specs:**
```typescript
describe('US-001: Input Validation', () => {
  it('[AC-1] rejects empty input', () => {
    expect(validateInput('')).toBe(false);
  });

  it('[AC-1] accepts valid input', () => {
    expect(validateInput('valid')).toBe(true);
  });

  // Edge cases
  it('[AC-1] Edge: handles whitespace-only input', () => {
    expect(validateInput('   ')).toBe(false);
  });
});
```

**Pure Functions to Test:**
- `validateInput(value: string): boolean`
- `formatOutput(data: object): string`
```

**Checkpoint:** "Unit specs generated"

---

### Step 3: Generate Integration Test Specs

**For each `[INTEGRATION]` tagged criterion:**

```markdown
### Integration Tests for US-002

**File:** `tests/integration/config-service.test.ts`

**Specs:**
```typescript
describe('US-002: Config Persistence', () => {
  it('[AC-2] saves config to disk', async () => {
    const service = new ConfigService(tempDir);
    await service.save({ key: 'value' });

    const loaded = await service.load();
    expect(loaded).toEqual({ key: 'value' });
  });

  it('[AC-2] creates config file if not exists', async () => {
    const service = new ConfigService(emptyDir);
    await service.save({ key: 'value' });

    expect(fs.existsSync(path.join(emptyDir, 'config.json'))).toBe(true);
  });

  // Edge cases
  it('[AC-2] Edge: handles corrupted config file', async () => {
    fs.writeFileSync(configPath, 'invalid json');
    const service = new ConfigService(tempDir);

    await expect(service.load()).rejects.toThrow('Invalid config');
  });
});
```

**Service Interactions to Test:**
- ConfigService + FileSystem
- ClaudeService + MockClaude
```

**Checkpoint:** "Integration specs generated"

---

### Step 4: Generate E2E Test Specs

**For each `[E2E]` tagged criterion (existing format, enhanced):**

```markdown
### E2E Tests for US-003

**File:** `tests/e2e/specs/epic1-shell.test.ts`

**Specs:**
```typescript
describe('US-003: Keyboard Navigation', () => {
  it('[AC-3] arrow keys navigate menu', async () => {
    await runner()
      .fork(CLI_PATH)
      .wait('stdout', /Main Menu/)
      .stdin('stdout', /Main Menu/, KEYS.DOWN)
      .wait('stdout', /► Option 2/)
      .wait('close', 0);
  });

  // Edge cases
  it('[AC-3] Edge: wraps at end of menu', async () => {
    await runner()
      .fork(CLI_PATH)
      .wait('stdout', /Main Menu/)
      .stdin('stdout', /Main Menu/, [KEYS.DOWN, KEYS.DOWN, KEYS.DOWN])
      .wait('stdout', /► Option 1/)  // Wrapped back
      .wait('close', 0);
  });
});
```

**Keyboard Sequence:**
1. Launch → Main Menu appears
2. DOWN → Selection moves to Option 2
3. DOWN, DOWN, DOWN → Wraps to Option 1
```

**Checkpoint:** "E2E specs generated"

---

### Step 5: Create Coverage Matrix

```markdown
## Coverage Matrix

| User Story | Unit Tests | Integration Tests | E2E Tests | Total |
|------------|------------|-------------------|-----------|-------|
| US-001 | 3 | 0 | 2 | 5 |
| US-002 | 0 | 4 | 1 | 5 |
| US-003 | 0 | 0 | 4 | 4 |
| **Total** | **3** | **4** | **7** | **14** |

## Test Distribution

- Unit: 3/14 (21%)
- Integration: 4/14 (29%)
- E2E: 7/14 (50%)

**Note:** Terminal apps are UI-heavy, so E2E percentage is higher than typical.
```

**Checkpoint:** "Coverage matrix created"

---

### Step 6: Verify and Review

Run verification:
```bash
# Count specs per layer
echo "Unit specs: $(grep -c 'describe.*US-' docs/test-specs.md | grep unit)"
echo "Integration specs: $(grep -c 'describe.*US-' docs/test-specs.md | grep integration)"
echo "E2E specs: $(grep -c 'describe.*US-' docs/test-specs.md | grep e2e)"
```

**Dispatch subagent reviewer with criteria:**
- [ ] Every `[UNIT]` criterion has unit test spec
- [ ] Every `[INTEGRATION]` criterion has integration test spec
- [ ] Every `[E2E]` criterion has E2E test spec
- [ ] Edge cases defined for each test
- [ ] Mock fixtures defined for Claude interactions

**Checkpoint:** "Specs reviewed and approved"

---
```

### 4.4 Update Output Format

**Replace `docs/e2e-test-specs.md` template with `docs/test-specs.md`:**

```markdown
# Test Specifications

**Project:** [App Name]
**Type:** Terminal/TUI Application
**Date:** [date]
**Total Tests:** [count]

---

## Testing Strategy

### Framework Stack
- **Unit Tests:** Vitest + ink-testing-library
- **Integration Tests:** Vitest
- **E2E Tests:** CLET + node-pty + Vitest

### Test Distribution
| Layer | Count | Percentage |
|-------|-------|------------|
| Unit | X | X% |
| Integration | X | X% |
| E2E | X | X% |

---

## Unit Test Specifications

### US-001: [Story Title]

**File:** `tests/unit/[file].test.ts`

```typescript
// Spec code
```

**Edge Cases:**
- [case]

---

## Integration Test Specifications

### US-002: [Story Title]

**File:** `tests/integration/[file].test.ts`

```typescript
// Spec code
```

**Edge Cases:**
- [case]

---

## E2E Test Specifications

### US-003: [Story Title]

**File:** `tests/e2e/specs/[file].test.ts`

```typescript
// Spec code
```

**Edge Cases:**
- [case]

---

## Mock Fixture Catalog

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `claude-success.json` | Successful Claude run | Integration, E2E |

---

## Coverage Matrix

| Story | Unit | Integration | E2E | Total |
|-------|------|-------------|-----|-------|
| US-001 | 2 | 0 | 1 | 3 |

---

## Test Independence Matrix

### Epic 1
- **Unit tests:** Can run alone ✅
- **Integration tests:** Need temp directory ✅
- **E2E tests:** Need built CLI ✅
```

### 4.5 Update TODO List

**Replace existing TODO list:**

```
TodoWrite([
  { content: "Read docs/user-stories.md (with test layer tags)", status: "in_progress", activeForm: "Reading user stories" },
  { content: "Generate Unit test specs for [UNIT] criteria", status: "pending", activeForm: "Generating unit specs" },
  { content: "Generate Integration test specs for [INTEGRATION] criteria", status: "pending", activeForm: "Generating integration specs" },
  { content: "Generate E2E test specs for [E2E] criteria", status: "pending", activeForm: "Generating E2E specs" },
  { content: "Design Mock Claude fixtures", status: "pending", activeForm: "Designing fixtures" },
  { content: "Add edge cases for ALL test layers", status: "pending", activeForm: "Adding edge cases" },
  { content: "Create coverage matrix (all layers)", status: "pending", activeForm: "Creating coverage matrix" },
  { content: "VERIFY: Test distribution (target: 30% unit, 40% int, 30% E2E)", status: "pending", activeForm: "Verifying distribution" },
  { content: "Write docs/test-specs.md", status: "pending", activeForm: "Writing test specs" },
  { content: "Run independent review (subagent)", status: "pending", activeForm: "Running review" },
  { content: "Fix issues if review fails", status: "pending", activeForm: "Fixing issues" }
])
```

---

## 5. Phase 3: Bootstrap

**File:** `3-new-pipeline-terminal-v6.0.md`

### 5.1 Update Project Structure

**Replace existing structure with:**

```markdown
## Project Structure

```
project/
├── src/
│   ├── components/           # Reusable Ink components
│   ├── screens/              # Full-screen views
│   ├── hooks/                # Custom React hooks
│   ├── services/             # Business logic (non-UI)
│   ├── utils/                # Pure utility functions [NEW]
│   │   ├── validators.ts     # Input validation
│   │   ├── formatters.ts     # Output formatting
│   │   └── index.ts
│   ├── types/                # TypeScript types
│   ├── App.tsx               # Root component
│   └── cli.tsx               # Entry point
├── tests/
│   ├── unit/                 # Unit tests [NEW]
│   │   ├── validators.test.ts
│   │   ├── formatters.test.ts
│   │   └── setup.ts
│   ├── integration/          # Integration tests [NEW]
│   │   ├── config-service.test.ts
│   │   ├── file-operations.test.ts
│   │   └── setup.ts
│   ├── e2e/                  # E2E tests (existing)
│   │   ├── specs/
│   │   ├── fixtures/
│   │   ├── helpers/
│   │   └── setup.ts
│   └── setup.ts              # Global test setup
├── bin/
│   └── cli.js
├── docs/
│   ├── brainstorm-notes.md
│   ├── user-stories.md
│   └── test-specs.md         # Renamed from e2e-test-specs.md
├── .pipeline/
│   └── manifest.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```
```

### 5.2 Update package.json Template

**Replace scripts section:**

```json
{
  "scripts": {
    "dev": "tsx watch src/cli.tsx",
    "build": "tsup src/cli.tsx --format esm --dts",
    "start": "node bin/cli.js",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:fast": "vitest run tests/unit tests/integration",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

### 5.3 Add Vitest Configuration

**Add new section for vitest.config.ts:**

```markdown
### Vitest Configuration

**`vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global setup
    setupFiles: ['./tests/setup.ts'],

    // Test organization
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/e2e/**/*.test.ts'
    ],

    // Separate configs per layer
    projects: [
      {
        name: 'unit',
        include: ['tests/unit/**/*.test.ts'],
        setupFiles: ['./tests/unit/setup.ts'],
        environment: 'node',
        testTimeout: 5000,
      },
      {
        name: 'integration',
        include: ['tests/integration/**/*.test.ts'],
        setupFiles: ['./tests/integration/setup.ts'],
        environment: 'node',
        testTimeout: 10000,
      },
      {
        name: 'e2e',
        include: ['tests/e2e/**/*.test.ts'],
        setupFiles: ['./tests/e2e/setup.ts'],
        environment: 'node',
        testTimeout: 30000,
      }
    ],

    // Coverage
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/types/**']
    }
  }
});
```
```

### 5.4 Add Unit Test Setup

**Add new section:**

```markdown
### Unit Test Setup

**`tests/unit/setup.ts`:**

```typescript
import { beforeEach, afterEach } from 'vitest';

// Reset any global state between tests
beforeEach(() => {
  // Clear mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup
});
```

**`tests/unit/validators.test.ts` (example skeleton):**

```typescript
/**
 * Unit Tests: Validators
 * User Stories: US-001, US-005
 *
 * Tests pure validation functions.
 * No I/O, no side effects, instant feedback.
 */
import { describe, it, expect } from 'vitest';
import { validateInput, validateConfig } from '../../src/utils/validators.js';

describe('US-001: Input Validation', () => {
  it('[AC-1] rejects empty input', () => {
    // FAIL: validateInput not implemented
    expect(validateInput('')).toBe(false);
  });

  it('[AC-1] accepts valid input', () => {
    // FAIL: validateInput not implemented
    expect(validateInput('valid')).toBe(true);
  });

  it('[AC-1] Edge: whitespace-only rejected', () => {
    expect(validateInput('   ')).toBe(false);
  });
});
```
```

### 5.5 Add Integration Test Setup

**Add new section:**

```markdown
### Integration Test Setup

**`tests/integration/setup.ts`:**

```typescript
import { beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tempDir: string;

beforeEach(() => {
  // Create temp directory for each test
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
});

afterEach(() => {
  // Cleanup temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
});

export { tempDir };
```

**`tests/integration/config-service.test.ts` (example skeleton):**

```typescript
/**
 * Integration Tests: Config Service
 * User Stories: US-002, US-010
 *
 * Tests service interactions with file system.
 * Uses real file I/O in temp directories.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '../../src/services/config.js';
import * as fs from 'fs';
import * as path from 'path';

describe('US-002: Config Persistence', () => {
  let tempDir: string;
  let configService: ConfigService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync('/tmp/test-config-');
    configService = new ConfigService(tempDir);
  });

  it('[AC-2] saves config to disk', async () => {
    // FAIL: ConfigService not implemented
    await configService.save({ key: 'value' });
    const loaded = await configService.load();
    expect(loaded).toEqual({ key: 'value' });
  });

  it('[AC-2] Edge: handles missing config gracefully', async () => {
    // FAIL: Default config not implemented
    const config = await configService.load();
    expect(config).toEqual({});
  });
});
```
```

### 5.6 Update TODO List

**Replace existing TODO list:**

```
TodoWrite([
  { content: "Read docs/user-stories.md and docs/test-specs.md", status: "in_progress", activeForm: "Reading input docs" },
  { content: "Create Ink project skeleton (npm init, TypeScript)", status: "pending", activeForm: "Creating project skeleton" },
  { content: "Set up package.json with ALL test scripts", status: "pending", activeForm: "Setting up dependencies" },
  { content: "Create src/ folder structure (+ utils/ for pure functions)", status: "pending", activeForm: "Creating folder structure" },
  { content: "Create tests/unit/ structure and setup", status: "pending", activeForm: "Creating unit test structure" },
  { content: "Create tests/integration/ structure and setup", status: "pending", activeForm: "Creating integration test structure" },
  { content: "Create tests/e2e/ structure and setup", status: "pending", activeForm: "Creating E2E test structure" },
  { content: "Implement Ink components skeleton", status: "pending", activeForm: "Implementing Ink components" },
  { content: "Create CLI entry point (bin/cli.js)", status: "pending", activeForm: "Creating CLI entry" },
  { content: "Implement Unit tests from specs", status: "pending", activeForm: "Implementing unit tests" },
  { content: "Implement Integration tests from specs", status: "pending", activeForm: "Implementing integration tests" },
  { content: "Implement E2E tests from specs (CLET)", status: "pending", activeForm: "Implementing E2E tests" },
  { content: "Create Mock Claude helpers and fixtures", status: "pending", activeForm: "Creating Mock Claude helpers" },
  { content: "BUILD: Run 'npm run build'", status: "pending", activeForm: "Building project" },
  { content: "VALIDATE: Run 'node bin/cli.js --help'", status: "pending", activeForm: "Validating CLI runs" },
  { content: "RED CHECK: Run unit tests - verify ALL FAIL", status: "pending", activeForm: "Verifying unit RED" },
  { content: "RED CHECK: Run integration tests - verify ALL FAIL", status: "pending", activeForm: "Verifying integration RED" },
  { content: "RED CHECK: Run E2E tests - verify ALL FAIL", status: "pending", activeForm: "Verifying E2E RED" },
  { content: "COVERAGE: Verify test count matches spec count", status: "pending", activeForm: "Verifying test coverage" },
  { content: "Create .pipeline/manifest.json", status: "pending", activeForm: "Creating manifest" },
  { content: "Git commit bootstrap", status: "pending", activeForm: "Committing bootstrap" }
])
```

### 5.7 Add RED State Verification for All Layers

**Add new section:**

```markdown
## Step 7: Verify RED State (ALL LAYERS)

### 7a. Unit Tests
```bash
npm run test:unit
```
**Expected:** ALL fail (0 passing)

### 7b. Integration Tests
```bash
npm run test:integration
```
**Expected:** ALL fail (0 passing)

### 7c. E2E Tests
```bash
npm run test:e2e
```
**Expected:** ALL fail (0 passing)

### 7d. Verify Total Coverage

```bash
# Count specs in docs/test-specs.md
UNIT_SPECS=$(grep -c "tests/unit" docs/test-specs.md)
INT_SPECS=$(grep -c "tests/integration" docs/test-specs.md)
E2E_SPECS=$(grep -c "tests/e2e" docs/test-specs.md)

# Count actual tests
UNIT_TESTS=$(grep -c "it\(" tests/unit/**/*.test.ts 2>/dev/null || echo 0)
INT_TESTS=$(grep -c "it\(" tests/integration/**/*.test.ts 2>/dev/null || echo 0)
E2E_TESTS=$(grep -c "it\(" tests/e2e/**/*.test.ts 2>/dev/null || echo 0)

echo "Coverage Check:"
echo "  Unit: $UNIT_TESTS tests / $UNIT_SPECS specs"
echo "  Integration: $INT_TESTS tests / $INT_SPECS specs"
echo "  E2E: $E2E_TESTS tests / $E2E_SPECS specs"
```

**BLOCKED if any layer has missing tests.**
```

---

## 6. Phase 4: Implement

**File:** `4-new-pipeline-terminal-v6.0.md`

### 6.1 Add Layered Testing Workflow

**Replace "Step 4: Run E2E Tests" with:**

```markdown
## Step 4: Run Tests (Pyramid Order)

**Run tests from FASTEST to SLOWEST for optimal debugging:**

### 4a. Unit Tests First (Instant Feedback)

```bash
npm run test:unit
```

**Why first?**
- Runs in <5 seconds
- If unit test fails, you know the EXACT function
- Fix before wasting time on slower tests

**If unit tests fail:**
1. Read the failing test
2. Fix the specific function
3. Re-run unit tests
4. Only proceed when unit tests pass

### 4b. Integration Tests Second (Service Interactions)

```bash
npm run test:integration
```

**Why second?**
- Runs in <30 seconds
- If integration fails but unit passes, issue is in SERVICE WIRING
- Narrower scope than E2E

**If integration tests fail:**
1. Unit tests passing = logic is correct
2. Issue is in how services connect
3. Check service initialization, dependencies
4. Re-run integration tests

### 4c. E2E Tests Last (Full User Journey)

```bash
npm run test:e2e -- tests/e2e/specs/epic[N]*.test.ts
```

**Why last?**
- Slowest layer (may take minutes)
- If E2E fails but lower layers pass, issue is in UI/KEYBOARD
- Most expensive to debug

**If E2E tests fail:**
1. Unit + Integration passing = logic and services work
2. Issue is in Ink components, keyboard handling, or output
3. Check useInput, Text rendering, screen transitions
```

### 6.2 Update Fix Loop

**Replace existing fix loop with:**

```markdown
## Step 5: Fix Loop (Layer-Aware)

### Debugging Strategy by Layer

| Unit Fails | Integration Fails | E2E Fails | Root Cause | Fix Location |
|------------|-------------------|-----------|------------|--------------|
| ✗ | - | - | Logic bug | `src/utils/*.ts` |
| ✓ | ✗ | - | Service wiring | `src/services/*.ts` |
| ✓ | ✓ | ✗ | UI/Keyboard | `src/components/*.tsx`, `src/screens/*.tsx` |

### Fix Iteration Cycle

```
1. Run failing layer test
2. Read error message
3. Fix the code
4. Re-run SAME layer test
5. If passes, run next layer up
6. Repeat until all pass
```

### After Each Fix

```bash
# Run the layer that was failing
npm run test:unit      # If fixing unit issue
npm run test:integration  # If fixing integration issue
npm run test:e2e -- tests/e2e/specs/epic[N]*  # If fixing E2E issue

# Once fixed, run next layer up
# Unit → Integration → E2E
```

### Speed Optimization

**Do NOT run full E2E suite after every small fix.**

| Situation | What to Run |
|-----------|-------------|
| Fixing validation logic | `npm run test:unit` only |
| Fixing service method | `npm run test:integration` only |
| Fixing keyboard handler | `npm run test:e2e -- [specific file]` |
| Epic complete | `npm run test` (full suite) |
```

### 6.3 Update Regression Check

**Replace regression section with:**

```markdown
## Step 6: Regression Check (Smart Strategy)

### After Each Epic: Fast Tests Only

```bash
# Run fast tests (should take <30 seconds)
npm run test:fast

# Run current epic E2E only
npm run test:e2e -- tests/e2e/specs/epic[N]*.test.ts
```

### End of Phase 4: Full Regression

**Only when ALL epics complete:**

```bash
# Full test suite
npm run test
```

**Expected:**
- Unit: All pass (<10s)
- Integration: All pass (<30s)
- E2E: All pass (<90s)
- Total: <2 minutes
```

### 6.4 Update TODO List

**Add layer-specific todos:**

```
TodoWrite([
  { content: "Read .pipeline/manifest.json for current epic", status: "in_progress", activeForm: "Reading manifest" },
  { content: "Identify tests to pass (unit, integration, E2E)", status: "pending", activeForm: "Identifying tests" },
  { content: "Plan implementation approach", status: "pending", activeForm: "Planning implementation" },
  { content: "Implement pure functions (for unit tests)", status: "pending", activeForm: "Implementing pure functions" },
  { content: "Implement services (for integration tests)", status: "pending", activeForm: "Implementing services" },
  { content: "Implement Ink components/screens (for E2E)", status: "pending", activeForm: "Implementing UI" },
  { content: "BUILD: Run 'npm run build'", status: "pending", activeForm: "Building project" },
  { content: "TEST UNIT: Run unit tests", status: "pending", activeForm: "Running unit tests" },
  { content: "TEST INTEGRATION: Run integration tests", status: "pending", activeForm: "Running integration tests" },
  { content: "TEST E2E: Run epic E2E tests", status: "pending", activeForm: "Running E2E tests" },
  { content: "Fix failures - iterate layer by layer", status: "pending", activeForm: "Fixing failures" },
  { content: "REGRESSION: Run fast tests (unit + integration)", status: "pending", activeForm: "Running fast regression" },
  { content: "Git commit epic", status: "pending", activeForm: "Committing epic" }
])
```

---

## 7. Phase 5: Finalize

**File:** `5-new-pipeline-terminal-v6.0.md`

### 7.1 Update Final Test Run

**Replace Step 4 with:**

```markdown
## Step 4: Run Final Test Suite (ALL LAYERS)

### 4a. Static Analysis

```bash
npm run typecheck
npm run lint
```

**Expected:** 0 errors

### 4b. Unit Tests

```bash
npm run test:unit
```

**Expected:**
- All pass
- Runtime: <10 seconds
- Coverage: All pure functions tested

### 4c. Integration Tests

```bash
npm run test:integration
```

**Expected:**
- All pass
- Runtime: <30 seconds
- Coverage: All service interactions tested

### 4d. E2E Tests

```bash
npm run test:e2e
```

**Expected:**
- All pass
- Runtime: <90 seconds
- Coverage: All user journeys tested

### 4e. Full Suite Verification

```bash
npm run test
```

**Expected output:**
```
✓ Unit tests: XX passed (Xs)
✓ Integration tests: XX passed (Xs)
✓ E2E tests: XX passed (Xs)

Total: XX tests passed
```
```

### 7.2 Add Test Distribution Verification

**Add new section:**

```markdown
## Step 4.5: Verify Test Distribution

**Check that test pyramid is balanced:**

```bash
UNIT=$(grep -r "it\(" tests/unit --include="*.ts" | wc -l)
INT=$(grep -r "it\(" tests/integration --include="*.ts" | wc -l)
E2E=$(grep -r "it\(" tests/e2e --include="*.ts" | wc -l)
TOTAL=$((UNIT + INT + E2E))

echo "Test Distribution:"
echo "  Unit:        $UNIT ($((UNIT * 100 / TOTAL))%)"
echo "  Integration: $INT ($((INT * 100 / TOTAL))%)"
echo "  E2E:         $E2E ($((E2E * 100 / TOTAL))%)"
echo "  Total:       $TOTAL"

# Check minimum thresholds
if [ $UNIT -lt 3 ]; then
  echo "⚠️  Warning: Very few unit tests. Consider adding more."
fi
```

**Target distribution for terminal apps:**
- Unit: 20-40%
- Integration: 20-40%
- E2E: 30-50%

**Note:** Terminal/TUI apps are UI-heavy, so higher E2E percentage is acceptable.
```

### 7.3 Update TODO List

```
TodoWrite([
  { content: "Code polish (remove debug logs, TODOs)", status: "in_progress", activeForm: "Polishing code" },
  { content: "Verify Mock Claude usage (no real API calls)", status: "pending", activeForm: "Verifying mock usage" },
  { content: "BUILD: Run 'npm run build'", status: "pending", activeForm: "Building project" },
  { content: "STATIC: Run typecheck and lint", status: "pending", activeForm: "Running static analysis" },
  { content: "TEST UNIT: Run unit tests - all must pass", status: "pending", activeForm: "Running unit tests" },
  { content: "TEST INTEGRATION: Run integration tests - all must pass", status: "pending", activeForm: "Running integration tests" },
  { content: "TEST E2E: Run E2E tests - all must pass", status: "pending", activeForm: "Running E2E tests" },
  { content: "VERIFY: Check test distribution (pyramid balance)", status: "pending", activeForm: "Verifying distribution" },
  { content: "Update README.md documentation", status: "pending", activeForm: "Updating documentation" },
  { content: "Set up npm package", status: "pending", activeForm: "Setting up npm package" },
  { content: "Git commit finalize", status: "pending", activeForm: "Committing finalize" },
  { content: "Create GitLab repo and push", status: "pending", activeForm: "Pushing to GitLab" }
])
```

---

## 8. Feature Pipeline

### 8.1 Phase 1-feature: `1-feature-pipeline-terminal-v6.0.md`

**Add same test layer planning as Phase 1 new:**

- Add "Test Layer Planning" section
- Update acceptance criteria format to include `[UNIT]`, `[INTEGRATION]`, `[E2E]` tags
- Add verification todo for test layer tags

### 8.2 Phase 2-feature: `2-feature-pipeline-terminal-v6.0.md`

**Major changes (similar to Phase 2 new):**

- Rename purpose to "Write tests at ALL layers"
- Add unit and integration spec generation
- Update baseline check to include all layers
- RED check must verify all layers fail

**Updated TODO list:**

```
TodoWrite([
  { content: "Read new stories from manifest", status: "in_progress", activeForm: "Reading stories" },
  { content: "BUILD: Run baseline", status: "pending", activeForm: "Building baseline" },
  { content: "BASELINE: Run ALL tests - must pass", status: "pending", activeForm: "Running baseline" },
  { content: "Generate Unit test specs for new stories", status: "pending", activeForm: "Generating unit specs" },
  { content: "Generate Integration test specs", status: "pending", activeForm: "Generating integration specs" },
  { content: "Generate E2E test specs", status: "pending", activeForm: "Generating E2E specs" },
  { content: "Append specs to docs/test-specs.md", status: "pending", activeForm: "Updating specs doc" },
  { content: "Create Mock fixtures (if needed)", status: "pending", activeForm: "Creating fixtures" },
  { content: "Implement Unit tests", status: "pending", activeForm: "Implementing unit tests" },
  { content: "Implement Integration tests", status: "pending", activeForm: "Implementing integration tests" },
  { content: "Implement E2E tests", status: "pending", activeForm: "Implementing E2E tests" },
  { content: "RED CHECK: All new tests FAIL", status: "pending", activeForm: "Verifying RED" },
  { content: "Git commit", status: "pending", activeForm: "Committing" }
])
```

### 8.3 Phase 3-feature: `3-feature-pipeline-terminal-v6.0.md`

**Add layered testing workflow:**

- Run unit tests first, then integration, then E2E
- Fix loop starts with fastest layer
- Regression uses fast tests during development

---

## 9. Fix Pipeline

**File:** `1-fix-pipeline-terminal-v6.0.md`

### 9.1 Add Test Layer Decision Tree

**Add new section after "Step 2a":**

```markdown
## Test Layer Decision for Bug Fixes

**Add regression test at the LOWEST layer that can catch the bug:**

### Decision Tree

```
Is the bug in pure logic (validation, calculation, formatting)?
├── YES → Add UNIT test
│         File: tests/unit/[relevant].test.ts
│         Speed: <10ms
│
└── NO → Does the bug involve service interaction (file I/O, config, API)?
         ├── YES → Add INTEGRATION test
         │         File: tests/integration/[relevant].test.ts
         │         Speed: <100ms
         │
         └── NO → Bug is in UI/keyboard/display
                  Add E2E test
                  File: tests/e2e/specs/epic[N]-[feature].test.ts
                  Speed: <5s
```

### Examples

| Bug | Test Layer | Why |
|-----|------------|-----|
| "Validation allows empty name" | Unit | Pure function, no I/O |
| "Config not saving" | Integration | Service + file system |
| "Keyboard shortcut not working" | E2E | User interaction |
| "Screen not rendering" | E2E | Visual output |
| "Calculation wrong" | Unit | Pure logic |

### Why Lowest Layer?

1. **Faster feedback:** Unit test runs in 10ms, E2E in 5s
2. **Precise location:** Unit test failure = exact function
3. **Cheaper to run:** Can run 500 unit tests in time of 1 E2E test
```

### 9.2 Update TODO List

```
TodoWrite([
  { content: "Read docs/user-stories.md - link bug to story", status: "in_progress", activeForm: "Linking to user story" },
  { content: "DECIDE: Which test layer for this bug (unit/integration/E2E)?", status: "pending", activeForm: "Deciding test layer" },
  { content: "Add regression test at chosen layer", status: "pending", activeForm: "Adding regression test" },
  { content: "BUILD: Run baseline", status: "pending", activeForm: "Building baseline" },
  { content: "BASELINE: Run tests - all must pass", status: "pending", activeForm: "Running baseline" },
  { content: "RED: Run new test - verify FAILS", status: "pending", activeForm: "Verifying RED" },
  { content: "Implement fix (minimal changes)", status: "pending", activeForm: "Implementing fix" },
  { content: "BUILD: Rebuild", status: "pending", activeForm: "Rebuilding" },
  { content: "GREEN: Run new test - verify PASSES", status: "pending", activeForm: "Verifying GREEN" },
  { content: "REGRESSION: Run full test suite", status: "pending", activeForm: "Running regression" },
  { content: "Create docs/fixes/FIX-XXX.md", status: "pending", activeForm: "Documenting fix" },
  { content: "Git commit", status: "pending", activeForm: "Committing" },
  { content: "Push to GitLab", status: "pending", activeForm: "Pushing" },
  { content: "Ask user to confirm fix", status: "pending", activeForm: "Getting confirmation" }
])
```

---

## 10. Implementation Order

### Phase 1: Global Changes (Do First)

1. Create template for "MANDATORY BEHAVIORS" section
2. Create template for "Context Management" section
3. Apply both to ALL 9 files

### Phase 2: Core Pipeline (New Project)

4. Update `1-new-pipeline-terminal-v6.0.md` (Medium)
5. Update `2-new-pipeline-terminal-v6.0.md` (Major - full rewrite)
6. Update `3-new-pipeline-terminal-v6.0.md` (Major - add test layers)
7. Update `4-new-pipeline-terminal-v6.0.md` (Medium)
8. Update `5-new-pipeline-terminal-v6.0.md` (Medium)

### Phase 3: Feature Pipeline

9. Update `1-feature-pipeline-terminal-v6.0.md` (Medium)
10. Update `2-feature-pipeline-terminal-v6.0.md` (Major)
11. Update `3-feature-pipeline-terminal-v6.0.md` (Medium)

### Phase 4: Fix Pipeline

12. Update `1-fix-pipeline-terminal-v6.0.md` (Medium)

---

## 11. Verification Checklist

### After Implementation, Verify:

- [ ] All 9 files have "MANDATORY BEHAVIORS" section
- [ ] All autonomous phases have "Context Management" section
- [ ] Phase 1 has test layer planning guidance
- [ ] Phase 2 generates specs for ALL test layers
- [ ] Phase 3 creates unit/, integration/, e2e/ test folders
- [ ] Phase 4 runs tests in pyramid order (unit → integration → E2E)
- [ ] Phase 5 verifies all layers pass
- [ ] Feature pipeline mirrors new project structure
- [ ] Fix pipeline has test layer decision tree
- [ ] All TODO lists updated with layer-specific tasks
- [ ] package.json template has test:unit, test:integration, test:e2e scripts
- [ ] vitest.config.ts template supports all test layers

### Test the Changes:

1. Run a test pipeline with the new commands
2. Verify unit test infrastructure is created
3. Verify integration test infrastructure is created
4. Verify E2E tests still work as before
5. Verify test pyramid is enforced in Phase 5

---

## Appendix: File Diffs Summary

### Files with Major Changes (Full Rewrite Sections)

| File | Sections to Rewrite |
|------|---------------------|
| `2-new-pipeline-terminal-v6.0.md` | Process steps, Output format, TODO list |
| `3-new-pipeline-terminal-v6.0.md` | Project structure, Test setup sections, TODO list |
| `2-feature-pipeline-terminal-v6.0.md` | Process steps, TODO list |

### Files with Medium Changes (Add Sections)

| File | Sections to Add |
|------|-----------------|
| `1-new-pipeline-terminal-v6.0.md` | Test Layer Planning, Mandatory Behaviors |
| `4-new-pipeline-terminal-v6.0.md` | Layered Testing Workflow, Mandatory Behaviors |
| `5-new-pipeline-terminal-v6.0.md` | Multi-layer Verification, Distribution Check |
| `1-feature-pipeline-terminal-v6.0.md` | Test Layer Planning |
| `3-feature-pipeline-terminal-v6.0.md` | Layered Testing Workflow |
| `1-fix-pipeline-terminal-v6.0.md` | Test Layer Decision Tree |

---

**End of Implementation Plan**
