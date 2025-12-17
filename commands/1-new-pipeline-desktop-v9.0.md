---
name: 1-new-pipeline-desktop-v9.0
description: Phase 1 - Creative brainstorm and user story definition (new project)
---

# Phase 1: Brainstorm & User Stories (New Project)

**Base Rules:** See `worker-base-desktop-v9.0.md` for shared worker rules.

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

## Visual Communication Rules

**CRITICAL: After the first question, EVERY interaction must include ASCII visuals.**

### Types of Visuals

| Context | Visual Type | Example |
|---------|-------------|---------|
| Layout options | Window mockup | `┌─────┬─────┐` boxes |
| Component choice | Side-by-side comparison | Option A vs Option B |
| User flow | Arrow diagram | `[A] → [B] → [C]` |
| Data structure | Tree/hierarchy | `├── Parent` indented |
| Feature scope | Table | IN/OUT columns |
| Navigation | Menu mockup | Nested items |

### Visual Templates

**Window Layout:**
```
┌─────────────────────────────────────────┐
│  App Name                    [_][□][X]  │
├──────────┬──────────────────────────────┤
│          │                              │
│  Sidebar │     Main Content Area        │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

**Side-by-Side Comparison:**
```
┌─── Option A ────┐    ┌─── Option B ────┐
│                 │    │                 │
│  [Sidebar]      │    │    [Top Nav]    │
│  [Content]      │    │    [Content]    │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
  Classic layout         Modern minimal
```

**User Flow:**
```
[Launch] ──→ [Dashboard] ──→ [Select Item] ──→ [Edit]
                │                                 │
                ↓                                 ↓
           [Settings]                        [Save/Cancel]
```

**Feature Scope Table:**
```
┌─────────────────────────────┬─────────────────────────────┐
│        IN (v1 MVP)          │       OUT (Future)          │
├─────────────────────────────┼─────────────────────────────┤
│ ✓ Basic CRUD                │ ✗ Cloud sync                │
│ ✓ Local storage             │ ✗ Collaboration             │
│ ✓ Search/filter             │ ✗ Mobile app                │
└─────────────────────────────┴─────────────────────────────┘
```

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

## Steps 1-7: Design Phase (Same as v8.0)

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

## Steps 8-12: Story Generation (Same as v8.0)

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

Reference: `Pipeline-Office/docs/implicit-ui-stories-checklist.md`

---

## Step 13: VERIFY Completeness Pairs (NEW in v9.0)

**CRITICAL: Check every action has its pair. Missing pairs = broken UX.**

### Completeness Pairs Table

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
| Undo | Redo (or explicit "no undo") |
| Lock | Unlock |
| Pin | Unpin |

### How to Verify

1. List ALL actions from user stories
2. For each action, check if the pair exists
3. If pair is missing, ADD a user story for it

**Example:**
```
Found: US-003 "User can add nodes to canvas"
Missing: "User can delete nodes from canvas"
ACTION: Add US-003b "User can delete nodes from canvas"

Found: US-007 "User can place nodes via drag-drop"
Missing: "User can move placed nodes"
ACTION: Add US-007b "User can move existing nodes on canvas"
```

### Verification Output

```
Completeness Pairs Check:
┌─────────────────────────────┬─────────────────────────────┬────────┐
│ Action Found                │ Pair Required               │ Status │
├─────────────────────────────┼─────────────────────────────┼────────┤
│ US-003: Add nodes           │ Delete nodes                │ ✅ US-015 │
│ US-007: Place nodes         │ Move nodes                  │ ❌ MISSING │
│ US-011: Connect nodes       │ Disconnect nodes            │ ✅ US-016 │
│ US-020: Open panel          │ Close panel                 │ ✅ US-021 │
│ US-025: Start simulation    │ Stop simulation             │ ✅ US-026 │
└─────────────────────────────┴─────────────────────────────┴────────┘

Added: US-007b "User can move existing nodes on canvas"
```

**Checkpoint:** Update user stories with missing pairs.

---

## Step 14: VERIFY UI Element Coverage (NEW in v9.0)

**CRITICAL: Every visible UI element must have a user story. No placeholder elements allowed.**

### What to Check

1. Review ALL mockups from Steps 3-7
2. List EVERY interactive element:
   - Menu items (File, Edit, View, Help, etc.)
   - Buttons
   - Form fields
   - Clickable areas
   - Drag targets
   - Context menus
3. Verify each element has a corresponding user story

### How to Verify

For each UI element visible in mockups:
- Does a user story describe what happens when user interacts with it?
- If NO → Either add a story OR remove the element from mockups

**The Rule:** If it appears in a mockup, it MUST work. If you can't implement it, don't show it.

### Example Check

```
Mockup shows:
┌─────────────────────────────────────────┐
│  File  Edit  View  Simulation  Help     │
├─────────────────────────────────────────┤

Element Coverage:
- File menu: ✅ US-FILE-001 (New, Open, Save, Export)
- Edit menu: ❌ NOT COVERED
- View menu: ❌ NOT COVERED
- Simulation menu: ✅ US-SIM-001 (Start, Stop, Settings)
- Help menu: ❌ NOT COVERED

ACTION OPTIONS:
a) Add user stories for Edit, View, Help menus
b) Remove Edit, View, Help from mockup (if not needed for v1)
```

### Verification Output

```
UI Element Coverage Check:
┌─────────────────────┬────────────────────┬────────┐
│ UI Element          │ User Story         │ Status │
├─────────────────────┼────────────────────┼────────┤
│ File menu           │ US-FILE-001        │ ✅     │
│ Edit menu           │ NONE               │ ❌ REMOVE │
│ View menu           │ NONE               │ ❌ REMOVE │
│ Simulation menu     │ US-SIM-001         │ ✅     │
│ Help menu           │ NONE               │ ❌ REMOVE │
│ Settings button     │ US-SET-001         │ ✅     │
│ Add Node button     │ US-003             │ ✅     │
└─────────────────────┴────────────────────┴────────┘

Decision: Removed Edit, View, Help menus from design (not in v1 scope)
Updated mockups to reflect actual functionality.
```

**Checkpoint:** Either add missing stories OR update mockups to remove uncovered elements.

---

## Step 15: ASK Onboarding Level (NEW in v9.0)

**Ask user about onboarding preference. Default to Minimal if user doesn't care.**

### Use AskUserQuestion

```
AskUserQuestion({
  questions: [{
    question: "What level of onboarding/tutorial should the app have?",
    header: "Onboarding",
    multiSelect: false,
    options: [
      {
        label: "Minimal (Recommended)",
        description: "Empty states with guidance, tooltips on key elements, Help menu with keyboard shortcuts. Low implementation overhead."
      },
      {
        label: "Full Tutorial",
        description: "First-launch walkthrough with step highlights, demo scenario, re-launchable from Help menu. Higher implementation cost."
      },
      {
        label: "None (Expert Users)",
        description: "Just a keyboard shortcuts list in Help menu. For power users who prefer no guidance."
      }
    ]
  }]
})
```

### Based on Answer, Add Onboarding Epic

**If Minimal (default):**
```markdown
## Epic: Onboarding (Minimal)

### US-ONBOARD-001: Empty states provide guidance
**As a** new user
**I want** empty screens to show helpful messages
**So that** I know what to do when starting out

**Acceptance Criteria:**
- [E2E] Empty canvas shows "Drag items from palette to get started"
- [E2E] Empty list shows "No items yet" with call-to-action

### US-ONBOARD-002: Tooltips explain key UI elements
**As a** new user
**I want** tooltips on important UI elements
**So that** I understand what each control does

**Acceptance Criteria:**
- [E2E] Hovering over palette items shows tooltip with description
- [E2E] Hovering over toolbar buttons shows tooltip with name + shortcut

### US-ONBOARD-003: Help menu shows keyboard shortcuts
**As a** user
**I want** to see all keyboard shortcuts in one place
**So that** I can learn to use the app efficiently

**Acceptance Criteria:**
- [E2E] Help > Keyboard Shortcuts opens dialog
- [E2E] Dialog lists all shortcuts grouped by category
```

**If Full Tutorial:**
```markdown
## Epic: Onboarding (Full Tutorial)

### US-ONBOARD-001: First-launch tutorial starts automatically
**As a** new user
**I want** a guided tutorial on first launch
**So that** I learn the basics without reading a manual

**Acceptance Criteria:**
- [E2E] First launch detects no prior usage (localStorage)
- [E2E] Tutorial overlay appears with "Welcome" message
- [E2E] Step-by-step guide with UI element highlights
- [E2E] Skip button available at any step

### US-ONBOARD-002: Tutorial can be relaunched
**As a** returning user
**I want** to relaunch the tutorial from Help menu
**So that** I can refresh my memory

**Acceptance Criteria:**
- [E2E] Help > Show Tutorial relaunches the walkthrough
- [E2E] Demo scenario can be started from Help menu

### US-ONBOARD-003: Help menu shows keyboard shortcuts
(same as Minimal)
```

**If None:**
```markdown
## Epic: Onboarding (Expert Mode)

### US-ONBOARD-001: Help menu shows keyboard shortcuts
(same as Minimal - this is the minimum)
```

**Checkpoint:** Add onboarding epic to user stories. Record decision in manifest.

---

## Step 16: VERIFY 1:1 E2E Mapping

Each story = exactly 1 E2E test. Split if needed.

---

## Step 17: Create user-stories.md

Full user stories document with index.

---

## Step 18: Presentation & Approval

**Present complete design showcase (same format as v8.0) plus v9.0 additions:**

```
════════════════════════════════════════════════════════════════
                    [APP NAME] - Complete Design
════════════════════════════════════════════════════════════════

[... existing visual showcase ...]


🔄 COMPLETENESS PAIRS VERIFIED
─────────────────────────────────────────────────────────────────
All actions have their pairs:
- Add ↔ Delete nodes ✅
- Place ↔ Move nodes ✅
- Connect ↔ Disconnect ✅
- Open ↔ Close panels ✅
- Start ↔ Stop simulation ✅


🖱️ UI ELEMENT COVERAGE
─────────────────────────────────────────────────────────────────
All visible elements have user stories.
Removed from design (not in v1):
- Edit menu
- View menu


📚 ONBOARDING LEVEL: Minimal
─────────────────────────────────────────────────────────────────
- Empty states with guidance
- Tooltips on key elements
- Help > Keyboard Shortcuts


📊 IMPLEMENTATION PLAN
─────────────────────────────────────────────────────────────────
┌─────┬───────────────────┬──────────┬────────────────────────┐
│ #   │ Epic              │ Stories  │ What it delivers       │
├─────┼───────────────────┼──────────┼────────────────────────┤
│ 1   │ App Shell         │ 4        │ Window, layout, nav    │
│ 2   │ [Core Feature]    │ 6        │ Main functionality     │
│ 3   │ [Feature B]       │ 4        │ Secondary feature      │
│ 4   │ Onboarding        │ 3        │ Empty states, tooltips │
│ VIS │ Visual Quality    │ 4        │ Design enforcement     │
│ CTL │ UI Controls       │ 3+       │ Real user interactions │
├─────┼───────────────────┼──────────┼────────────────────────┤
│     │ TOTAL             │ 24+      │                        │
└─────┴───────────────────┴──────────┴────────────────────────┘

════════════════════════════════════════════════════════════════
```

**After showing the visual showcase, ask:**
```
This is your complete [App Name] design:
- [N] screens
- [N] key components
- [N] user stories across [N] epics
- Completeness pairs: All verified ✅
- UI coverage: All elements covered ✅
- Onboarding: [Minimal/Full/None]

Everything above will be implemented exactly as shown.

✅ Approve and proceed to Phase 2 (Technical Specs)?
✏️ Or let me know what to revise.
```

---

## Final Summary (after approval)

```
════════════════════════════════════════════════════════════════
Phase 1 Complete: [App Name]
════════════════════════════════════════════════════════════════

📁 Files Created:
   - docs/brainstorm-notes.md
   - docs/user-stories.md

📊 Summary:
┌─────────────────────┬─────────┐
│ Epics               │ [N]     │
│ User stories        │ [N]     │
│ E2E tests           │ [N]     │
│ Visual stories      │ 4       │
│ Control stories     │ 3+      │
│ Onboarding stories  │ 3       │
└─────────────────────┴─────────┘

🔄 Completeness Pairs: All verified ✅
🖱️ UI Coverage: All elements covered ✅
📚 Onboarding Level: [Minimal/Full/None]
🎨 Design System: Defined (colors, typography, spacing)
🖼️ Screens: [N] mockups approved
✅ Ready for Phase 2

════════════════════════════════════════════════════════════════
```

---

## Phase-Specific Rules

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

## WebSearch Triggers

Use WebSearch when:
- User describes their app idea (search for similar apps)
- Choosing between layout patterns
- Designing specific components (sidebar, navigation, forms)
- User mentions a feature you're unsure how to visualize
- Stuck on how to handle a UX pattern

---

**Execute now. Research first. Be visual. Always recommend. Verify completeness.**
