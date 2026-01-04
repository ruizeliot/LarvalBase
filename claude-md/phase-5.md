# Phase 5: Finalize (Worker CLAUDE.md)

**Pipeline Version:** 10.0
**Phase:** 5 - Finalize (Multi-Layer Verification + Quality Audit)
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

## 2. FORBIDDEN PATTERNS (Gate 2 Checks This)

### 🔴 MOCKING SYSTEM APIS (Most Critical - AUTO-REJECT)

```bash
# Mocking Tauri plugins - INSTANT REJECTION
grep -rn "jest.mock.*@tauri-apps" src tests
grep -rn "vi.mock.*@tauri-apps" src tests

# Hardcoded mock data in production code
grep -rn "mockScenario\|mockData\|fakeData" src
```

**Expected:** Zero matches. ANY match = app passed tests but doesn't work.

### Empty Handlers

```bash
grep -rn "onClick={() => {}}" src --include="*.tsx"
grep -rn "onClick={() => console" src --include="*.tsx"
```

**Expected:** Zero matches.

### Test-Only Code Paths

```bash
grep -rn "NODE_ENV.*===.*test" src
```

**Expected:** Zero matches.

---

# Phase 5: Finalize (Multi-Layer Verification + Quality Audit)

**Purpose:** Polish code, run 3-layer quality audit, verify security, deliver working app
**Input:** Working app with all tests passing
**Output:** Production-ready Tauri app + quality audit report
**Mode:** Autonomous (no user interaction)

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Code polish (remove TODOs, console.logs)", status: "in_progress", activeForm: "Polishing code" },
  { content: "2. Security audit (CSP, XSS, secrets)", status: "pending", activeForm: "Running security audit" },
  { content: "3. MOCK AUDIT: Verify ZERO mocks of system APIs", status: "pending", activeForm: "Checking for mocks" },
  { content: "4. LINT: Verify design token compliance", status: "pending", activeForm: "Checking design tokens" },
  { content: "5. CHECK: Verify no empty handlers (Gate 2)", status: "pending", activeForm: "Checking handlers" },
  { content: "6. BUILD: Run tauri build", status: "pending", activeForm: "Building app" },
  { content: "7. UNIT: Run full Unit test suite", status: "pending", activeForm: "Running Unit tests" },
  { content: "8. INTEGRATION: Run full Integration suite", status: "pending", activeForm: "Running Integration tests" },
  { content: "9. E2E: Run full E2E suite against built .exe", status: "pending", activeForm: "Running E2E tests" },
  { content: "10. VISUAL: Verify all baselines match", status: "pending", activeForm: "Running Visual tests" },
  { content: "11. A11Y: Run accessibility audit", status: "pending", activeForm: "Running Accessibility tests" },
  { content: "12. LAYER 1: Automated quality checks (includes mock detection)", status: "pending", activeForm: "Running Layer 1 audit" },
  { content: "13. LAYER 2: Smoke test (click everything)", status: "pending", activeForm: "Running Layer 2 audit" },
  { content: "14. LAYER 3: Nielsen heuristics evaluation", status: "pending", activeForm: "Running Layer 3 audit" },
  { content: "15. Create docs/quality-audit.md", status: "pending", activeForm: "Writing audit report" },
  { content: "16. VERIFY: All layers pass (100%)", status: "pending", activeForm: "Verifying coverage" },
  { content: "17. Create README.md documentation", status: "pending", activeForm: "Writing README" },
  { content: "18. Git commit finalize", status: "pending", activeForm: "Committing" },
  { content: "19. Create GitLab repo and push", status: "pending", activeForm: "Pushing to GitLab" }
])
```

---

## Steps 1-5: Pre-Build Checks

### Step 1: Code Polish
```bash
grep -rn "TODO\|FIXME\|XXX" src src-tauri/src
grep -rn "console\.log" src
grep -rn ": any" src
```
**Fix:** Remove TODOs, console.logs, add proper types.

### Step 2: Security Audit
- Check Tauri permissions (no wildcards)
- Check for XSS vulnerabilities
- Check for hardcoded secrets

### Step 3: MOCK AUDIT (CRITICAL)

**🔴 This is the MOST IMPORTANT check. If mocks exist, the app doesn't work for real.**

```bash
echo "=== Mock Audit ==="

JEST_MOCKS=$(grep -rn "jest.mock.*@tauri-apps" src tests 2>/dev/null | wc -l)
VI_MOCKS=$(grep -rn "vi.mock.*@tauri-apps" src tests 2>/dev/null | wc -l)
MOCK_DATA=$(grep -rn "mockScenario\|mockData\|fakeData" src 2>/dev/null | wc -l)
TEST_PATHS=$(grep -rn "NODE_ENV.*===.*test" src 2>/dev/null | wc -l)

TOTAL=$((JEST_MOCKS + VI_MOCKS + MOCK_DATA + TEST_PATHS))

if [ "$TOTAL" -gt 0 ]; then
  echo "❌ MOCK AUDIT FAILED: $TOTAL mock patterns found"
  exit 1
else
  echo "✅ MOCK AUDIT PASSED: Zero mocks of system APIs"
fi
```

### Step 4: Design Token Compliance
```bash
npm run lint:styles
```

### Step 5: Empty Handler Check
```bash
grep -rn "onClick={() => {}}" src --include="*.tsx"
```
**Expected:** Zero matches.

---

## Steps 6-11: Build and Test Suite

### Step 6: Build
```bash
npm run tauri build
```

### Steps 7-11: Run All Test Layers
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run test:a11y
```

**All must pass before quality audit.**

---

## Steps 12-14: 3-Layer Quality Audit

### Step 12: LAYER 1 - Automated Quality Checks

- Mock detection (CRITICAL)
- Empty handler detection
- Test-only code paths
- Accessibility audit
- Visual regression
- Design token lint

**All must PASS.**

### Step 13: LAYER 2 - Smoke Test

Click EVERY interactive element:
- All menu items
- All toolbar buttons
- All palette items
- All dialogs
- All forms
- Keyboard navigation
- Completeness pairs
- Edge cases

```bash
npm run test:e2e -- --spec './e2e/specs/smoke.e2e.js'
```

### Step 14: LAYER 3 - Nielsen Heuristics Evaluation

Evaluate against Nielsen's 10 Usability Heuristics:

1. Visibility of System Status
2. Match Between System and Real World
3. User Control and Freedom
4. Consistency and Standards
5. Error Prevention
6. Recognition Rather Than Recall
7. Flexibility and Efficiency of Use
8. Aesthetic and Minimalist Design
9. Help Users Recognize/Recover from Errors
10. Help and Documentation

**Rate each:** ✅ Pass | ⚠️ Minor | ❌ Major

**Gate 2 requires:** Zero major issues (❌).

---

## Step 15: Create Quality Audit Report

Create `docs/quality-audit.md` with:
- Summary table (all 3 layers)
- Layer 1 automated check results
- Layer 2 smoke test coverage
- Layer 3 heuristics ratings
- Conclusion

---

## Steps 16-19: Document, Commit, Push

### Step 16: Verify Coverage
```bash
E2E_SPEC=$(grep -oE "E2E-[0-9]+" docs/functionality-specs.md | sort -u | wc -l)
USER_STORY=$(grep -oE "US-[0-9]+" docs/user-stories.md | sort -u | wc -l)
```
**E2E count must equal story count.**

### Step 17: Create README.md
Include testing commands and quality assurance section.

### Step 18: Git Commit
```bash
git commit -m "finalize: production-ready release with quality audit"
```

### Step 19: GitLab Push
Create repository and push.

---

## Completion Output

```
════════════════════════════════════════════════════════════════
PIPELINE COMPLETE!
════════════════════════════════════════════════════════════════

📊 Test Summary:
   Unit: X/X passing ✅
   Integration: Y/Y passing ✅
   E2E: Z/Z passing ✅

🎨 Visual Quality:
   Design Tokens: Compliant ✅
   Visual Baselines: All matching ✅
   Accessibility: Zero violations ✅

🔍 Quality Audit (v9.0):
   Layer 1 (Automated): PASS ✅
     - Mocks of system APIs: 0 ← CRITICAL
     - Empty handlers: 0
     - Test-only paths: 0

   Layer 2 (Smoke Test): PASS ✅
     - All menu items work
     - All buttons respond
     - Completeness pairs verified

   Layer 3 (Nielsen Heuristics): PASS ✅
     - Major issues: 0
     - Minor issues: [N]

📄 Reports:
   - docs/quality-audit.md

📦 Build Output:
   src-tauri/target/release/bundle/

🚀 GitLab: https://gitlab.com/.../[name]
════════════════════════════════════════════════════════════════
```

---

## Phase 5 Rules

### You Must (Phase 5)
- **Run MOCK AUDIT first** - verify zero mocks of system APIs
- Polish code (no TODOs, console.logs)
- Verify security checklist
- Verify design token compliance
- **Run 3-layer quality audit:**
  - **Layer 1: Automated (MOCKS, empty handlers, a11y, visual, lint)**
  - **Layer 2: Smoke test (click EVERYTHING)**
  - **Layer 3: Nielsen heuristics (10 points)**
- **Create docs/quality-audit.md**
- Run ALL test layers
- Verify 1:1 story-to-E2E mapping
- Create README.md with testing commands

### You Must NOT (Phase 5)
- **⛔ NEVER proceed if any mocks of system APIs exist** - app won't work
- Skip security verification
- Skip any test layer
- **Skip quality audit layers**
- **Proceed with major Nielsen issues (❌)**
- Deliver with failing tests
- Deliver with empty handlers or placeholders
- **Deliver app that passes tests but has mock code in production**

---

**Execute now. Polish, audit (3 layers), test, document, finalize.**
