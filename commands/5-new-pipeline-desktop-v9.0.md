---
name: 5-new-pipeline-desktop-v9.0
description: Phase 5 - Polish, verify all tests pass, 3-layer quality audit, final build
---

# Phase 5: Finalize (Multi-Layer Verification + Quality Audit)

**Base Rules:** See `worker-base-desktop-v9.0.md` for shared worker rules.

**Purpose:** Polish code, run 3-layer quality audit, verify security, deliver working app
**Input:** Working app with all tests passing
**Output:** Production-ready Tauri app + quality audit report
**Mode:** Autonomous (no user interaction)


---

## ⛔ FORBIDDEN PATTERNS (Gate 2 Checks This)

**The orchestrator runs Gate 2 after Phase 5. These patterns cause REJECTION.**

### Empty Handlers
```bash
grep -rn "onClick={() => {}}" src --include="*.tsx"
grep -rn "onDragStart={() => {}}" src --include="*.tsx"
grep -rn "onChange={() => {}}" src --include="*.tsx"
```
**Expected:** Zero matches.

### Console.log Placeholders
```bash
grep -rn "onClick={() => console" src --include="*.tsx"
```
**Expected:** Zero matches.

### Test-Only Code Paths
```bash
grep -rn "NODE_ENV.*===.*test" src --include="*.ts" --include="*.tsx"
```
**Expected:** Zero matches.

### Buttons Without onClick
**Manual check required** - review all `<button>` elements have handlers.

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Code polish (remove TODOs, console.logs)", status: "in_progress", activeForm: "Polishing code" },
  { content: "2. Security audit (CSP, XSS, secrets)", status: "pending", activeForm: "Running security audit" },
  { content: "3. LINT: Verify design token compliance", status: "pending", activeForm: "Checking design tokens" },
  { content: "4. CHECK: Verify no empty handlers (Gate 2)", status: "pending", activeForm: "Checking handlers" },
  { content: "5. BUILD: Run tauri build", status: "pending", activeForm: "Building app" },
  { content: "6. UNIT: Run full Unit test suite", status: "pending", activeForm: "Running Unit tests" },
  { content: "7. INTEGRATION: Run full Integration suite", status: "pending", activeForm: "Running Integration tests" },
  { content: "8. E2E: Run full E2E suite against built .exe", status: "pending", activeForm: "Running E2E tests" },
  { content: "9. VISUAL: Verify all baselines match", status: "pending", activeForm: "Running Visual tests" },
  { content: "10. A11Y: Run accessibility audit", status: "pending", activeForm: "Running Accessibility tests" },
  { content: "11. LAYER 1: Automated quality checks", status: "pending", activeForm: "Running Layer 1 audit" },
  { content: "12. LAYER 2: Smoke test (click everything)", status: "pending", activeForm: "Running Layer 2 audit" },
  { content: "13. LAYER 3: Nielsen heuristics evaluation", status: "pending", activeForm: "Running Layer 3 audit" },
  { content: "14. Create docs/quality-audit.md", status: "pending", activeForm: "Writing audit report" },
  { content: "15. VERIFY: All layers pass (100%)", status: "pending", activeForm: "Verifying coverage" },
  { content: "16. Create README.md documentation", status: "pending", activeForm: "Writing README" },
  { content: "17. Git commit finalize", status: "pending", activeForm: "Committing" },
  { content: "18. Create GitLab repo and push", status: "pending", activeForm: "Pushing to GitLab" }
])
```

---

## Steps 1-4: Pre-Build Checks

### Step 1: Code Polish
```bash
grep -rn "TODO\|FIXME\|XXX" src src-tauri/src --include="*.ts" --include="*.tsx" --include="*.rs"
grep -rn "console\.log" src --include="*.ts" --include="*.tsx"
grep -rn ": any" src --include="*.ts" --include="*.tsx"
```
**Fix:** Remove TODOs, console.logs, add proper types.

### Step 2: Security Audit

#### Tauri Permissions
```bash
cat src-tauri/capabilities/default.json
```
**Expected:** Specific permissions, no wildcards.

#### XSS Vulnerabilities
```bash
grep -r "innerHTML\|dangerouslySetInnerHTML" src --include="*.tsx"
```
**Expected:** Zero occurrences.

#### Secrets in Code
```bash
grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" src src-tauri/src
```
**Expected:** Zero hardcoded secrets.

### Step 3: Design Token Compliance
```bash
npm run lint:styles
```
**Expected:** Zero violations.

### Step 4: Empty Handler Check (Gate 2 Preparation)

```bash
echo "=== Gate 2 Pre-Check ==="

# Empty handlers
EMPTY=$(grep -rn "onClick={() => {}}\|onDragStart={() => {}}\|onChange={() => {}}" src --include="*.tsx" | wc -l)
echo "Empty handlers: $EMPTY"

# Console placeholders
CONSOLE=$(grep -rn "onClick={() => console" src --include="*.tsx" | wc -l)
echo "Console placeholders: $CONSOLE"

# Test-only paths
TEST_ONLY=$(grep -rn "NODE_ENV.*===.*test" src --include="*.ts" --include="*.tsx" | wc -l)
echo "Test-only paths: $TEST_ONLY"

# All must be zero
if [ "$EMPTY" -gt 0 ] || [ "$CONSOLE" -gt 0 ] || [ "$TEST_ONLY" -gt 0 ]; then
  echo "❌ GATE 2 WILL FAIL - Fix before proceeding"
  exit 1
else
  echo "✅ Gate 2 pre-check passed"
fi
```

---

## Steps 5-10: Build and Test Suite

### Step 5: Build
```bash
npm run tauri build
```

### Steps 6-10: Run All Test Layers
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run test:a11y
```

**All must pass before quality audit.**

---

## Step 11: LAYER 1 - Automated Quality Checks (NEW in v9.0)

**Run automated checks that Gate 2 will verify:**

### 11a: Empty Handler Detection

```bash
echo "=== Layer 1.1: Empty Handler Detection ==="
EMPTY_COUNT=$(grep -rn "onClick={() => {}}\|onDragStart={() => {}}\|onChange={() => {}}\|onClick={() => console" src --include="*.tsx" | wc -l)

if [ "$EMPTY_COUNT" -gt 0 ]; then
  echo "❌ FAIL: $EMPTY_COUNT empty/placeholder handlers found"
  grep -rn "onClick={() => {}}\|onDragStart={() => {}}\|onChange={() => {}}\|onClick={() => console" src --include="*.tsx"
  LAYER1_EMPTY="FAIL"
else
  echo "✅ PASS: No empty handlers"
  LAYER1_EMPTY="PASS"
fi
```

### 11b: Test-Only Code Paths Detection

```bash
echo "=== Layer 1.2: Test-Only Code Paths ==="
TEST_ONLY_COUNT=$(grep -rn "NODE_ENV.*===.*test\|import.meta.env.MODE.*test" src --include="*.ts" --include="*.tsx" | wc -l)

if [ "$TEST_ONLY_COUNT" -gt 0 ]; then
  echo "❌ FAIL: $TEST_ONLY_COUNT test-only code paths found"
  LAYER1_TEST="FAIL"
else
  echo "✅ PASS: No test-only code paths"
  LAYER1_TEST="PASS"
fi
```

### 11c: Accessibility Audit

```bash
echo "=== Layer 1.3: Accessibility (axe-core) ==="
npm run test:a11y
# Capture results
LAYER1_A11Y=$([[ $? -eq 0 ]] && echo "PASS" || echo "FAIL")
```

### 11d: Visual Regression

```bash
echo "=== Layer 1.4: Visual Regression ==="
npm run test:visual
LAYER1_VISUAL=$([[ $? -eq 0 ]] && echo "PASS" || echo "FAIL")
```

### 11e: Design Token Lint

```bash
echo "=== Layer 1.5: Design Token Compliance ==="
npm run lint:styles
LAYER1_LINT=$([[ $? -eq 0 ]] && echo "PASS" || echo "FAIL")
```

### Layer 1 Summary

```
Layer 1 (Automated) Results:
- Empty handlers: [PASS/FAIL]
- Test-only paths: [PASS/FAIL]
- Accessibility: [PASS/FAIL]
- Visual regression: [PASS/FAIL]
- Design tokens: [PASS/FAIL]
```

**All must PASS to proceed.**

---

## Step 12: LAYER 2 - Smoke Test (NEW in v9.0)

**Click EVERY interactive element in the app. Manual verification via E2E smoke test.**

### Run Smoke Test Suite

```bash
echo "=== Layer 2: Smoke Test ==="
npm run test:e2e -- --spec './e2e/specs/smoke.e2e.js'
```

### Smoke Test Checklist

The smoke test should verify:

| Category | Items to Click/Test |
|----------|---------------------|
| Menu Bar | File, Edit, View, Simulation, Help - EVERY item |
| Toolbar | EVERY button |
| Palette | EVERY draggable item |
| Canvas | Drag, drop, move, connect, disconnect |
| Dialogs | EVERY dialog opens and closes |
| Forms | EVERY form submits correctly |
| Keyboard | Tab navigation, Enter, Escape, shortcuts |
| Completeness Pairs | Add↔Delete, Place↔Move, Open↔Close, etc. |
| Edge Cases | Double-click, rapid clicks, Escape mid-drag |

### Smoke Test Results

```
Layer 2 (Smoke Test) Results:
- Menu items: X/X working
- Toolbar buttons: X/X working
- Palette items: X/X draggable
- Dialogs: X/X open/close
- Forms: X/X submit
- Keyboard nav: PASS/FAIL
- Completeness pairs: X/X complete
- Edge cases: X/X handled
```

**All must PASS to proceed.**

---

## Step 13: LAYER 3 - Nielsen Heuristics Evaluation (NEW in v9.0)

**Evaluate the app against Nielsen's 10 Usability Heuristics.**

### Evaluation Process

For each heuristic, give a rating:
- ✅ **Pass** - Meets the heuristic well
- ⚠️ **Minor** - Small issues, acceptable for v1
- ❌ **Major** - Significant issue, needs fixing before release

### The 10 Heuristics

#### 1. Visibility of System Status
*Does the app keep users informed about what's going on?*

- [ ] Loading states show progress
- [ ] Actions provide immediate feedback
- [ ] Simulation shows current state clearly
- [ ] Error states are visible

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 2. Match Between System and Real World
*Does the app use familiar language and concepts?*

- [ ] Labels use domain terminology users expect
- [ ] Icons are recognizable
- [ ] Metaphors match real-world expectations
- [ ] Information appears in natural order

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 3. User Control and Freedom
*Can users easily undo/redo and exit unwanted states?*

- [ ] Undo/Redo available
- [ ] Cancel buttons on dialogs
- [ ] Easy to go back/exit
- [ ] Escape closes modals

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 4. Consistency and Standards
*Does the app follow platform conventions?*

- [ ] Consistent terminology throughout
- [ ] Standard keyboard shortcuts
- [ ] Consistent component styling
- [ ] Predictable behavior

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 5. Error Prevention
*Does the app prevent errors before they happen?*

- [ ] Constraints on inputs
- [ ] Confirmation for destructive actions
- [ ] Disabled states for invalid actions
- [ ] Clear affordances

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 6. Recognition Rather Than Recall
*Is information visible or easily retrievable?*

- [ ] No need to remember info between screens
- [ ] Instructions visible when needed
- [ ] Tooltips on complex controls
- [ ] Labels on all interactive elements

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 7. Flexibility and Efficiency of Use
*Does the app support both novice and expert users?*

- [ ] Keyboard shortcuts for common actions
- [ ] Customization options if applicable
- [ ] Multiple ways to accomplish tasks
- [ ] Accelerators for frequent operations

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 8. Aesthetic and Minimalist Design
*Is the interface clean without unnecessary elements?*

- [ ] No irrelevant information
- [ ] Visual hierarchy is clear
- [ ] Consistent spacing and alignment
- [ ] No visual clutter

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 9. Help Users Recognize, Diagnose, and Recover from Errors
*Are error messages helpful?*

- [ ] Error messages in plain language
- [ ] Errors explain the problem
- [ ] Errors suggest solutions
- [ ] Errors don't blame the user

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

#### 10. Help and Documentation
*Is help available when needed?*

- [ ] Help menu exists
- [ ] Keyboard shortcuts listed
- [ ] Tooltips on controls
- [ ] Onboarding for new users (if applicable)

Rating: [ ✅ / ⚠️ / ❌ ]
Notes: [observations]

### Layer 3 Summary

```
Layer 3 (Nielsen Heuristics) Results:
1. Visibility of Status: [rating]
2. Match Real World: [rating]
3. User Control: [rating]
4. Consistency: [rating]
5. Error Prevention: [rating]
6. Recognition vs Recall: [rating]
7. Flexibility: [rating]
8. Aesthetic Design: [rating]
9. Error Recovery: [rating]
10. Help & Docs: [rating]

Major Issues: [count]
Minor Issues: [count]
```

**Gate 2 requires: Zero major issues (❌).**

---

## Step 14: Create Quality Audit Report (NEW in v9.0)

Create `docs/quality-audit.md`:

```markdown
# Quality Audit Report

**Date:** [date]
**Version:** 1.0
**Pipeline:** v9.0

---

## Summary

| Layer | Status | Details |
|-------|--------|---------|
| Layer 1 (Automated) | PASS/FAIL | [count] issues |
| Layer 2 (Smoke Test) | PASS/FAIL | [count] items tested |
| Layer 3 (Heuristics) | PASS/FAIL | [major]/[minor] issues |

**Overall:** PASS / FAIL

---

## Layer 1: Automated Checks

| Check | Result | Details |
|-------|--------|---------|
| Empty handlers | ✅ | 0 found |
| Test-only paths | ✅ | 0 found |
| Accessibility | ✅ | 0 violations |
| Visual regression | ✅ | All baselines match |
| Design tokens | ✅ | 0 arbitrary values |

---

## Layer 2: Smoke Test

| Category | Tested | Passed | Notes |
|----------|--------|--------|-------|
| Menu items | X | X | |
| Toolbar buttons | X | X | |
| Palette items | X | X | |
| Dialogs | X | X | |
| Forms | X | X | |
| Keyboard nav | X | X | |
| Completeness pairs | X | X | |
| Edge cases | X | X | |

---

## Layer 3: Nielsen Heuristics

| # | Heuristic | Rating | Notes |
|---|-----------|--------|-------|
| 1 | Visibility of Status | ✅ | |
| 2 | Match Real World | ✅ | |
| 3 | User Control | ✅ | |
| 4 | Consistency | ✅ | |
| 5 | Error Prevention | ⚠️ | [note] |
| 6 | Recognition vs Recall | ✅ | |
| 7 | Flexibility | ✅ | |
| 8 | Aesthetic Design | ✅ | |
| 9 | Error Recovery | ✅ | |
| 10 | Help & Docs | ✅ | |

**Major Issues (❌):** 0
**Minor Issues (⚠️):** 1

---

## Conclusion

This release passes the v9.0 quality audit with:
- Zero forbidden patterns
- Full smoke test coverage
- No major usability issues

**Approved for release.**
```

---

## Step 15: Verify Coverage

```bash
E2E_SPEC=$(grep -oE "E2E-[0-9]+" docs/test-specs.md | sort -u | wc -l)
USER_STORY=$(grep -oE "US-[0-9]+" docs/user-stories.md | sort -u | wc -l)

if [ "$E2E_SPEC" -eq "$USER_STORY" ]; then
  echo "✅ 1:1 E2E Mapping Verified"
fi
```

---

## Steps 16-18: Document, Commit, Push

### Step 16: Create README.md

Create a complete README with project overview, features, tech stack, and testing commands.

**Include quality audit section:**

```markdown
## Quality Assurance

This project includes a 3-layer quality audit:

1. **Automated Checks** - Empty handlers, accessibility, visual regression
2. **Smoke Tests** - Every interactive element tested
3. **Nielsen Heuristics** - 10-point usability evaluation

See `docs/quality-audit.md` for the full report.
```

### Step 17: Git Commit

```bash
git add .
git commit -m "$(cat <<'EOF'
finalize: production-ready release with quality audit

Code Quality:
- Polished and refactored
- Security requirements verified
- Design tokens compliant

Test Results:
- Unit: X/X passing
- Integration: Y/Y passing
- E2E: Z/Z passing
- Visual: All baselines match
- A11Y: Zero violations

Quality Audit (v9.0):
- Layer 1 (Automated): PASS
- Layer 2 (Smoke Test): PASS
- Layer 3 (Nielsen): PASS (0 major, N minor)

See docs/quality-audit.md for full report.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 18: GitLab Push

**Get project name:**
```bash
PROJECT_NAME=$(jq -r '.name' package.json)
echo "Project: $PROJECT_NAME"
```

**Create GitLab repository via API:**
```bash
curl --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data "{\"name\": \"$PROJECT_NAME\", \"namespace_id\": 120382085, \"visibility\": \"private\"}" \
  "https://gitlab.com/api/v4/projects"
```

**Note:** namespace_id 120382085 = anthohunt-ai-assistant-group/pipeline-projects

**Add remote and push:**
```bash
git remote add origin "https://oauth2:$GITLAB_TOKEN@gitlab.com/anthohunt-ai-assistant-group/pipeline-projects/$PROJECT_NAME.git"
git push -u origin master
echo "✓ Pushed to GitLab: https://gitlab.com/anthohunt-ai-assistant-group/pipeline-projects/$PROJECT_NAME"
```

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
     - Empty handlers: 0
     - Test-only paths: 0
     - A11Y violations: 0

   Layer 2 (Smoke Test): PASS ✅
     - All menu items work
     - All buttons respond
     - All forms submit
     - Completeness pairs verified

   Layer 3 (Nielsen Heuristics): PASS ✅
     - Major issues: 0
     - Minor issues: [N]

📄 Reports:
   - docs/quality-audit.md

📦 Build Output:
   src-tauri/target/release/bundle/

📝 Documentation: README.md ✅
🔒 Security: All checks passed ✅
🚀 GitLab: https://gitlab.com/anthohunt-ai-assistant-group/pipeline-projects/[name]

════════════════════════════════════════════════════════════════
```

---

## Phase-Specific Rules

### You Must (Phase 5)
- Polish code (no TODOs, console.logs)
- Verify security checklist
- Verify design token compliance
- **Run 3-layer quality audit:**
  - **Layer 1: Automated (empty handlers, a11y, visual, lint)**
  - **Layer 2: Smoke test (click EVERYTHING)**
  - **Layer 3: Nielsen heuristics (10 points)**
- **Create docs/quality-audit.md**
- Run ALL test layers
- Verify 1:1 story-to-E2E mapping
- Create README.md with testing commands

### You Must NOT (Phase 5)
- Skip security verification
- Skip any test layer
- **Skip quality audit layers**
- **Proceed with major Nielsen issues (❌)**
- Deliver with failing tests
- Deliver with empty handlers or placeholders

---

**Execute now. Polish, audit (3 layers), test, document, finalize.**
