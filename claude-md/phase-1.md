# Phase 1: Brainstorm & User Stories (Worker CLAUDE.md)

**Pipeline Version:** 10.0
**Phase:** 1 - Brainstorm
**Mode:** Interactive (uses AskUserQuestion)

---

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

## 6. Git Discipline

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

---

## 7. Error Handling Strategy

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

---

# Phase 1: Brainstorm & User Stories

**Purpose:** Turn a rough idea into a fully-formed design through collaborative dialogue
**Input:** User's idea (or just a project directory name)
**Output:** `docs/brainstorm-notes.md`, `docs/user-stories.md`
**Mode:** Interactive (this phase DOES use AskUserQuestion)

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. UNDERSTAND: Ask what the app is about", status: "in_progress", activeForm: "Understanding concept" },
  { content: "2. RESEARCH: Find similar apps and patterns", status: "pending", activeForm: "Researching similar apps" },
  { content: "3. SKETCH: Present layout options with mockups", status: "pending", activeForm: "Sketching layouts" },
  { content: "4. REFINE: Drill into chosen layout", status: "pending", activeForm: "Refining layout" },
  { content: "5. STORYBOARD: Map user journey visually", status: "pending", activeForm: "Mapping user flow" },
  { content: "6. STYLE: Define visual design system", status: "pending", activeForm: "Defining visual style" },
  { content: "7. DECIDE: Confirm final mockup and scope", status: "pending", activeForm: "Confirming design" },
  { content: "8. Finalize docs/brainstorm-notes.md", status: "pending", activeForm: "Finalizing brainstorm notes" },
  { content: "9. Define epics from confirmed design", status: "pending", activeForm: "Defining epics" },
  { content: "10. VERIFY: Epic independence", status: "pending", activeForm: "Verifying epics" },
  { content: "11. Generate user stories (including visual quality)", status: "pending", activeForm: "Generating stories" },
  { content: "12. Generate implicit UI control stories", status: "pending", activeForm: "Adding control stories" },
  { content: "13. VERIFY: Completeness pairs (add missing halves)", status: "pending", activeForm: "Checking completeness pairs" },
  { content: "14. VERIFY: UI element coverage (every element has story)", status: "pending", activeForm: "Checking UI coverage" },
  { content: "15. ASK: Onboarding level question", status: "pending", activeForm: "Asking onboarding preference" },
  { content: "16. VERIFY: 1 story = 1 E2E test", status: "pending", activeForm: "Verifying granularity" },
  { content: "17. Create docs/user-stories.md", status: "pending", activeForm: "Creating user stories doc" },
  { content: "18. Get user approval to proceed", status: "pending", activeForm: "Getting approval" }
])
```

---

## Core Principles

- **Visual-first communication** - Every interaction after the first question MUST include ASCII art
- **Proactive suggestions** - Always lead with your recommendation, never just ask open questions
- **Research-informed design** - Use WebSearch to find similar apps and proven patterns
- **One question at a time** - Never overwhelm
- **Everything is circular** - Can loop back at any point until final approval
- **Checkpoint saves** - Save progress to brainstorm-notes.md after each step
- **YAGNI ruthlessly** - Remove unnecessary features
- **Completeness pairs** - If you add an action, add its pair (add/delete, show/hide, etc.)
- **No placeholder promises** - Only show UI elements that will be implemented

---

## Opening Question (NO TOOLS, NO VISUALS)

**First message is conversational - no AskUserQuestion, no ASCII art.**

Read project context, then open naturally:
- Reference directory name and any existing files
- Ask ONE simple question: What is this app about?

**Example:**
> I see this is 'task-tracker-desktop'. What's the core idea? What problem does it solve for you?

**That's it for the first message. Wait for their answer.**

---

## Steps 1-7: Design Phase

### Step 1: UNDERSTAND (Text Only)
After user describes their idea:
- Acknowledge their vision
- Ask 1-2 clarifying questions if needed
- Keep this step brief - we'll dig deeper after research

**Checkpoint:** Create `docs/brainstorm-notes.md` with initial concept

### Step 2: RESEARCH (WebSearch Required)
**CRITICAL: Before showing ANY mockups, research the space.**

```
WebSearch: "[app type] desktop app UI examples 2025"
WebSearch: "[app type] best practices UX patterns"
WebSearch: "popular [app type] apps features comparison"
```

**Checkpoint:** Append research findings to brainstorm-notes.md

### Step 3: SKETCH (Always Visual)
Present layout options with detailed mockups. **Always lead with recommendation.**

**Checkpoint:** Append chosen layout to brainstorm-notes.md

### Step 4: REFINE (Always Visual)
Drill into the chosen layout. Show detailed mockups for each area.

**Checkpoint:** Append refined details to brainstorm-notes.md

### Step 5: STORYBOARD (Always Visual)
Map the complete user journey with flow diagrams.

**Checkpoint:** Append flow diagrams to brainstorm-notes.md

### Step 6: STYLE (Always Visual) - CRITICAL
**This step ensures beautiful apps. Do NOT skip or rush.**

Present complete visual design system: colors, typography, spacing, border radius, interactive states.

**Checkpoint:** Append design system to brainstorm-notes.md

### Step 7: DECIDE (Always Visual)
Present final mockup and scope confirmation.

**Checkpoint:** Finalize brainstorm-notes.md

---

## Steps 8-18: Story Generation

### Step 8: Finalize brainstorm-notes.md
Transform checkpoints into structured document.

### Step 9: Define Epics
Break design into independent implementation units.

### Step 10: VERIFY Epic Independence
Each epic must be testable independently.

### Step 11: Generate User Stories
Create stories per epic with acceptance criteria.
**MANDATORY: Include Visual Quality stories (US-VIS-001 to US-VIS-004).**

### Step 12: Generate Implicit UI Control Stories
**MANDATORY: Include stories for HOW users interact.**

### Step 13: VERIFY Completeness Pairs
**CRITICAL: Check every action has its pair. Missing pairs = broken UX.**

### Step 14: VERIFY UI Element Coverage
**CRITICAL: Every visible UI element must have a user story.**

### Step 15: ASK Onboarding Level
**Ask user about onboarding preference. Default to Minimal if user doesn't care.**

### Step 16: VERIFY 1:1 E2E Mapping
Each story = exactly 1 E2E test. Split if needed.

### Step 17: Create user-stories.md
Full user stories document with index.

### Step 18: Presentation & Approval
Present complete design showcase and get user approval.

---

## Phase 1 Rules

### You Must (Phase 1)
- Start with ONE simple text question (no visuals, no tools)
- Use WebSearch BEFORE showing first mockup (research the space)
- Include ASCII visual in EVERY interaction after the first question
- Always lead with your recommendation and explain why
- Use WebSearch at decision points to find proven patterns
- **Complete the STYLE step with full design system**
- **Include Visual Quality user stories (US-VIS-001 to US-VIS-004)**
- **Include Implicit UI Control stories (US-CTRL-*)**
- **Verify ALL completeness pairs - add missing halves**
- **Verify ALL UI elements have stories - remove uncovered elements**
- **Ask onboarding level question - add onboarding epic**
- Verify 1:1 story-to-E2E mapping
- Allow looping back at any point
- Present design in sections before approval

### You Must NOT (Phase 1)
- Use AskUserQuestion for first question
- Show any interaction (after the first) without ASCII visuals
- Ask open questions without providing your recommendation first
- Skip the research step - always WebSearch before sketching
- **Skip the STYLE step or accept "looks fine" without complete design system**
- **Omit Visual Quality user stories**
- **Omit Implicit UI Control stories**
- **Leave completeness pairs incomplete**
- **Leave UI elements without user stories (or keep them in mockups)**
- **Skip onboarding question**
- Put ASCII art inside AskUserQuestion options (show inline)
- Rush through without validation
- Write code or tests (that's Phase 2+)

---

**Execute now. Research first. Be visual. Always recommend. Verify completeness.**
