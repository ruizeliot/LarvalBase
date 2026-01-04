# Worker Base Rules v10.0

**This file contains shared rules for ALL desktop pipeline workers.**
**Phase-specific CLAUDE.md files include this content.**

---

# Shared Rules (All Agents)

These rules apply to ALL pipeline agents (orchestrator and workers). They MUST be followed at all times.

---

## Rule 1: WebSearch First

**Always search for anything technical. Don't rely on training knowledge.**

### When to Search

| Situation | Action |
|-----------|--------|
| Before implementing ANY technical solution | WebSearch first |
| Before claiming something is a "limitation" | WebSearch to verify |
| When encountering an error message | WebSearch the exact error |
| When using a library/API | WebSearch for current documentation |
| When unsure about syntax or patterns | WebSearch for examples |
| Before saying "this doesn't work" | WebSearch for workarounds |

### Examples

```
BAD:  "I'll use React.memo for optimization" (from memory)
GOOD: WebSearch "React.memo best practices 2025" → then implement

BAD:  "Wheel scroll doesn't work in WebView2, this is a known issue"
GOOD: WebSearch "WebView2 wheel scroll issue" → cite source if true

BAD:  "I'll configure Tauri like this..." (guessing)
GOOD: WebSearch "Tauri v2 configuration example" → follow docs
```

### The Rule

**If you're about to write code based on memory, STOP and search first.**

Training data has a cutoff date. Libraries change. Best practices evolve. Always verify with current sources.

---

## Rule 2: Self-Reflection After Every Task

**After completing each task, run this checklist before moving on.**

### Fixed Checklist

Ask yourself:

- [ ] **Did I search before implementing?**
  - If NO: Go back and search, then verify my implementation is correct.

- [ ] **Did I check existing code patterns first?**
  - If NO: Read similar code in the project to match style.

- [ ] **Did I avoid placeholders?**
  - No empty handlers: `onClick={() => {}}`
  - No console.log stubs: `onClick={() => console.log('TODO')}`
  - No "not implemented" alerts
  - If I added a button, it MUST do something real.

- [ ] **Did I implement both halves of completeness pairs?**
  - Add → Delete
  - Open → Close
  - Connect → Disconnect
  - Select → Deselect
  - Show → Hide
  - Enable → Disable
  - If I implemented one, I MUST implement the other.

- [ ] **Did I handle edge cases?**
  - Empty state (no items)
  - Boundaries (min/max values)
  - Invalid input
  - Rapid actions (double-click, spam)
  - Interruption (action during loading)

- [ ] **Did I use real actions, not synthetic events?**
  - In E2E tests: Use WebdriverIO `.click()`, `.setValue()`, `.dragAndDrop()`
  - NOT: `browser.execute(() => el.dispatchEvent(...))`

- [ ] **Did I test what was asked, not something easier?**
  - If the test was hard, I didn't change the test to test something simpler.
  - The original requirement is still being verified.

- [ ] **If I struggled, did I search for solutions rather than guess repeatedly?**
  - After 2-3 failed attempts, I should WebSearch for solutions.
  - Random guessing wastes time and tokens.

- [ ] **If I claimed a limitation, did I verify it exists?**
  - I searched and found documentation/issues confirming the limitation.
  - I have a source URL to cite.

### Open Reflection

After the checklist, ask:

1. **What did I just do?** (Brief summary)
2. **Did I cut any corners?** (Be honest)
3. **What could I have missed?** (Think critically)

### Action on Failure

**If any checklist item is NO:**
- STOP
- Fix the issue
- Re-run the checklist
- Only then move to the next task

---

## Rule 3: Research Before Claiming Limitations

**You MUST search online BEFORE claiming something is a "known limitation" or "doesn't work."**

### Forbidden Pattern

```
"This is a known WebDriver limitation" ← WITHOUT searching first
"X doesn't support Y" ← WITHOUT documentation
"This won't work because..." ← WITHOUT verification
```

### Required Pattern

```
1. WebSearch "[tool] [action] [environment]"
2. If search finds solution → Use it
3. If search confirms limitation → Document the source URL
4. If search finds nothing → Try implementation anyway (assumption may be wrong)
```

---

# Worker-Specific Rules

## Worker Self-Reflection Additions

**After each task, also verify these worker-specific items:**

- [ ] **Did I update todos after completing each task?**
  - Mark todo as `completed` immediately when done
  - Only one todo should be `in_progress` at a time

- [ ] **Did I run tests before committing?**
  - All tests must pass before commit
  - Never commit failing tests

- [ ] **Did I commit at phase end with proper format?**
  - Use conventional commit format
  - Include test counts in body

---

## 1. Orchestrator Communication

**CRITICAL: The orchestrator tracks your progress via the todo list.**

### Todo List Rules
- Initialize todos at phase startup (phase command provides the list)
- Mark todos as `in_progress` when starting a task
- Mark todos as `completed` when finished
- Do NOT add new todos beyond initialized list
- Do NOT remove todos from the list
- One todo `in_progress` at a time (helps orchestrator track)

### Completion Detection
- When ALL todos are `completed`, orchestrator detects phase complete
- Orchestrator handles manifest updates - you do NOT update manifest
- Orchestrator handles spawning next phase - you do NOT continue

---

## 2. FORBIDDEN PATTERNS (Gate Enforcement)

**The orchestrator runs gates after certain phases. These patterns cause REJECTION.**

### No Placeholder Rule (Gate 2)

**STRICTLY FORBIDDEN - Causes automatic gate failure:**

```tsx
// Empty handlers - FORBIDDEN
onClick={() => {}}
onDragStart={() => {}}
onChange={() => {}}

// Console.log placeholders - FORBIDDEN
onClick={() => console.log('TODO')}

// Alert placeholders - FORBIDDEN
onClick={() => alert('Not implemented')}

// Buttons without handlers - FORBIDDEN
<button>Edit</button>  // No onClick = forbidden

// Menu promises without delivery - FORBIDDEN
aria-haspopup="menu"  // With no actual menu
```

**The Rule:** If it looks interactive, it MUST be interactive. If you can't implement it now, DON'T add the element.

**Detection Commands (run before committing):**
```bash
# Empty handlers
grep -rn "onClick={() => {}}" src --include="*.tsx"
grep -rn "onDragStart={() => {}}" src --include="*.tsx"

# Console.log placeholders
grep -rn "onClick={() => console" src --include="*.tsx"

# Buttons without onClick
grep -rn "<button[^>]*>[^<]*</button>" src --include="*.tsx" | grep -v "onClick"
```

### No Test-Only Code Paths (Gate 2)

```tsx
// FORBIDDEN
if (process.env.NODE_ENV === 'test') { ... }
if (import.meta.env.MODE === 'test') { ... }

// REQUIRED - Same code path for test and production
const result = await invoke('command_name');
```

### No Synthetic Events in E2E (Gate 1)

```javascript
// FORBIDDEN in E2E tests
browser.execute(() => { el.dispatchEvent(new MouseEvent(...)) })
browser.execute(() => { el.dispatchEvent(new DragEvent(...)) })
browser.execute(() => { store.addNode(...) })  // Direct store access

// REQUIRED - Real WebdriverIO actions
$('selector').click()
$('source').dragAndDrop($('target'))
$('input').setValue('text')
browser.keys(['Delete'])
```

---

## 3. Completeness Pairs

**Actions that MUST be implemented together. If you implement one, you MUST implement both.**

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
| Zoom in | Zoom out |
| Undo | Redo (or explicit "no undo" decision) |
| Lock | Unlock |
| Pin | Unpin |
| Favorite | Unfavorite |
| Subscribe | Unsubscribe |

**Enforcement by Phase:**
- Phase 1: Verify stories exist for both halves
- Phase 2: Verify E2E tests cover both halves
- Phase 4: Verify implementation includes both halves
- Phase 5: Verify smoke test confirms both halves work

**Self-Check:** When implementing any of these actions, ask: "Did I implement the pair?"

---

## 4. Edge Case Matrix

**Every E2E test must cover at least 2 edge cases from this matrix:**

| Category | Edge Cases |
|----------|------------|
| Empty state | No items, first item, single item |
| Boundaries | Min value, max value, at limit |
| Invalid input | Empty string, special chars, too long |
| Rapid actions | Double-click, spam clicks, drag cancel |
| Interruption | Action during loading, mid-drag escape |
| State conflicts | Delete while editing, move while drag |

**Phase 2 must include edge cases in test specs.**
**Phase 4 must handle edge cases in implementation.**

---

## 5. Code Patterns First

**Read existing code BEFORE implementing anything.**

### Why This Matters
- Reduces Edit tool calls from 60+ to ~20
- Prevents style inconsistencies
- Catches existing utilities you can reuse
- Reveals project conventions

### What to Check
```bash
# Tauri command patterns
cat src-tauri/src/lib.rs | head -100

# React component patterns
find src/components -name "*.tsx" | head -3 | xargs cat

# Invoke patterns
grep -r "invoke" src --include="*.tsx" | head -20

# State management patterns
grep -r "useState\|useStore\|createStore" src --include="*.tsx" | head -10
```

### Pattern Checklist
- [ ] How are Tauri commands structured?
- [ ] How are components organized?
- [ ] What state management is used?
- [ ] What styling approach (Tailwind, CSS modules)?
- [ ] What naming conventions?

---

## 6. Autonomous Execution Mode

**For phases 2-5: No user interaction.**

### Rules
- Do NOT ask user questions - make reasonable decisions
- Do NOT wait for user input
- Do NOT use AskUserQuestion tool
- Complete the phase - keep trying until success
- If stuck on error for 3+ attempts, try different approach

### Decision Making
When facing ambiguity:
1. Check existing code for precedent
2. WebSearch for best practices
3. Choose simplest solution that works
4. Document decision in commit message

### Exception: Phase 1
Phase 1 (brainstorm) IS interactive - uses AskUserQuestion for design decisions.

---

## 7. Parallel Tool Execution

**Maximize efficiency with parallel calls.**

### When to Parallelize
- Multiple independent file reads
- Multiple independent searches
- Multiple independent bash commands

### When NOT to Parallelize
- Operations with dependencies
- Commands that modify same file
- Sequential git operations

---

## 8. Git Discipline

**Commit at phase end with conventional format.**

### Commit Format
```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<body with details>

<test counts if applicable>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Commit Types by Phase
| Phase | Type | Example |
|-------|------|---------|
| 1 | `docs` | `docs: define user stories for [App]` |
| 2 | `test` | `test: add multi-layer test specs` |
| 3 | `feat` | `feat: bootstrap skeleton with RED tests` |
| 4 | `feat` | `feat(epic-N): implement [Epic Name]` |
| 5 | `chore` | `chore: finalize for production` |

### Include in Body
- What was done
- Test counts (Unit: X, Integration: Y, E2E: Z)
- Any notable decisions

---

## 9. Error Handling Strategy

### Build Errors
1. Read the FULL error message
2. WebSearch the error if unfamiliar
3. Check if it's a known Tauri/Rust issue
4. Fix root cause, not symptoms

### Test Failures
1. Read which test failed and why
2. Check if test is correct (don't modify test to pass!)
3. Fix implementation to satisfy test
4. Re-run specific test before full suite

### Stuck Loop Detection
If same error persists after 3 attempts:
1. Step back and re-read error
2. WebSearch for alternative solutions
3. Try completely different approach
4. If still stuck, document in commit and flag for review

---

## 10. Test Cheating Detection

**FORBIDDEN: Changing what a test verifies to avoid implementing the hard part.**

### What is Test Cheating?

When a test fails, you might be tempted to:
1. Change the test to test something easier
2. Implement the easier thing instead
3. Declare success because "tests pass"

**This is CHEATING.** The original functionality was never implemented or tested.

### The Rule (Simple Version)

| ALLOWED | FORBIDDEN |
|---------|-----------|
| Fix implementation to pass the test | Change what the test verifies |
| Fix typos/bugs in test code | Change test from "wheel zoom" to "keyboard zoom" |
| Modify test AND impl if testing SAME thing | Modify test AND impl to test DIFFERENT thing |

**Key Question:** "Is my test still verifying the ORIGINAL requirement?"

### Self-Check Before Committing

1. **"Does my test still verify the ORIGINAL requirement?"**
   - YES → OK to commit
   - NO → You changed the requirement. Revert.

2. **"Did I modify docs/test-specs.md or docs/user-stories.md?"**
   - In Phase 4/5: This will be REJECTED by Gate 2
   - In Phase 1/2: This is expected

3. **"Am I testing what the user story says, or something easier?"**
   - If easier → You're cheating. Implement the hard thing.

---

## Summary: Universal "You Must"

- Use WebSearch for unfamiliar tech/errors
- **WebSearch BEFORE claiming any limitation exists**
- Read existing code patterns before implementing
- Follow test pyramid order (Unit → Integration → E2E)
- Commit at phase completion
- Keep todos updated in real-time
- **Implement BOTH halves of completeness pairs**
- **Run empty handler detection before committing**
- **Handle edge cases from the matrix**

---

## Summary: Universal "You Must NOT"

- **Add placeholder/empty handlers** (`onClick={() => {}}`)
- **Add UI elements without functionality**
- **Implement one action without its pair** (e.g., Add without Delete)
- **Use synthetic events in E2E tests**
- **Call store/API directly in E2E tests**
- **Change what a test verifies** (test cheating)
- **Modify docs/test-specs.md or docs/user-stories.md during Phase 4/5**
- **Claim something is a "limitation" without WebSearch first**
- Skip any test layer
- Update manifest (orchestrator does this)
- Continue to next phase (orchestrator spawns that)
- Guess at APIs without checking docs
- Make multiple random attempts without research
- Leave regressions unfixed
