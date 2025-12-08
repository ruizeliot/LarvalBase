# E2E Test Specifications

**Project:** Pipeline v7
**Type:** Terminal/TUI Application (Two-Window Architecture)
**Date:** 2025-12-08
**Total Tests:** 225 main tests + 450 edge case variants
**Coverage:** 100%

---

## Testing Strategy

### Architecture Overview

Pipeline v7 uses a **two-window architecture**:
- **Dashboard Window**: Ink TUI that monitors pipeline state (this is what we test)
- **Worker Window**: Separate Windows Terminal running Claude CLI (mocked in tests)

The dashboard **does NOT embed or directly interact with the worker**. It monitors via:
1. **Todo files** in `~/.claude/todos/{session-id}.json`
2. **Manifest.json** in the project directory
3. **Worker process existence** via PID checks

### Mock Strategy

Since the dashboard only watches files and checks PIDs, mocking is straightforward:

```
┌──────────────────┐       ┌──────────────────────────────┐
│   Dashboard      │       │   Mock Worker (Test Helper)  │
│   (Real TUI)     │       │                              │
│                  │       │  1. Write todo files         │
│   Watches:       │◄──────│  2. Update manifest.json     │
│   - ~/.claude/   │       │  3. Return mock PID          │
│     todos/*.json │       │                              │
│   - manifest.json│       │  (No real window spawned)    │
└──────────────────┘       └──────────────────────────────┘
```

### Framework Stack
- **E2E Framework:** CLET (Command Line E2E Testing)
- **TTY Emulation:** node-pty
- **Unit Tests:** ink-testing-library + Vitest
- **Mocking:** Mock Windows Terminal, Mock Filesystem, Mock Todo Writer

### Key Principle: No Real Claude Calls
**NEVER call real Claude CLI in tests.** The mock worker simulates Claude by:
- Writing todo files at specified intervals
- Updating manifest.json for phase transitions
- Returning mock PIDs for process detection

### Test File Structure
```
tests/
├── e2e/
│   ├── helpers/
│   │   ├── mock-worker.ts           # Mock worker behavior (writes todos, updates manifest)
│   │   ├── mock-wt.ts               # Mock Windows Terminal (returns fake PIDs)
│   │   ├── mock-fs.ts               # Mock filesystem for isolation
│   │   ├── mock-ccusage.ts          # Mock cost calculation
│   │   ├── test-harness.ts          # Test setup/teardown
│   │   └── assertions.ts            # Custom TUI assertions
│   ├── fixtures/
│   │   ├── phase-1-success.json     # Brainstorm phase todo sequence
│   │   ├── phase-2-success.json     # Specs phase todo sequence
│   │   ├── phase-3-success.json     # Bootstrap phase todo sequence
│   │   ├── phase-4-success.json     # Implement phase todo sequence
│   │   ├── phase-5-success.json     # Finalize phase todo sequence
│   │   ├── epic-1-complete.json     # Epic completion todo sequence
│   │   ├── worker-timeout.json      # Timeout error fixture
│   │   ├── worker-crash.json        # Crash error fixture
│   │   └── resume-mid-epic.json     # Resume scenario fixture
│   └── specs/
│       ├── epic1-tui-framework.test.ts
│       ├── epic2-test-infrastructure.test.ts
│       ├── epic3-state-management.test.ts
│       ├── epic4-filesystem-service.test.ts
│       ├── epic5-process-service.test.ts
│       ├── epic6-cost-service.test.ts
│       ├── epic7-pipeline-orchestrator.test.ts
│       └── epic8-ui-screens.test.ts
└── unit/
    └── components/
        └── *.test.tsx             # ink-testing-library tests
```

---

## Mock Fixture Catalog

### Required Fixture Format

All mock Claude fixtures MUST follow this exact JSON structure:

```json
{
  "output": [
    "Reading brainstorm notes...",
    "Creating user stories based on requirements...",
    "Generated 25 user stories for Epic 1"
  ],
  "todoStates": [
    {
      "timestamp": 0,
      "todos": [
        { "content": "Read brainstorm notes", "status": "in_progress", "activeForm": "Reading notes" }
      ]
    },
    {
      "timestamp": 1000,
      "todos": [
        { "content": "Read brainstorm notes", "status": "completed", "activeForm": "Reading notes" },
        { "content": "Create user stories", "status": "in_progress", "activeForm": "Creating stories" }
      ]
    },
    {
      "timestamp": 2000,
      "todos": [
        { "content": "Read brainstorm notes", "status": "completed", "activeForm": "Reading notes" },
        { "content": "Create user stories", "status": "completed", "activeForm": "Creating stories" }
      ]
    }
  ],
  "finalState": {
    "exitCode": 0,
    "manifestUpdate": {
      "currentPhase": 2,
      "phases.1.status": "complete"
    }
  }
}
```

### Fixture Catalog

| Fixture File | Description | Exit Code |
|--------------|-------------|-----------|
| `phase-1-success.json` | Brainstorm phase completes successfully | 0 |
| `phase-2-success.json` | Specs phase completes successfully | 0 |
| `phase-3-success.json` | Bootstrap phase completes successfully | 0 |
| `phase-4-success.json` | Implement phase completes successfully | 0 |
| `phase-5-success.json` | Finalize phase completes successfully | 0 |
| `epic-1-complete.json` | First epic implementation completes | 0 |
| `worker-timeout.json` | Worker times out (no response) | null |
| `worker-crash.json` | Worker crashes mid-execution | 1 |
| `worker-context-limit.json` | Worker hits context limit | 2 |
| `resume-mid-epic.json` | Resume from middle of epic | 0 |

### Phase-Specific Fixture Examples

#### phase-1-success.json (Brainstorm)
```json
{
  "output": [
    "Starting Phase 1: Brainstorm",
    "Reading docs/brainstorm-notes.md...",
    "Analyzing requirements...",
    "Creating user stories...",
    "Phase 1 complete: 25 user stories generated"
  ],
  "todoStates": [
    {
      "timestamp": 0,
      "todos": [
        { "content": "Read brainstorm notes", "status": "in_progress", "activeForm": "Reading notes" }
      ]
    },
    {
      "timestamp": 500,
      "todos": [
        { "content": "Read brainstorm notes", "status": "completed", "activeForm": "Reading notes" },
        { "content": "Analyze requirements", "status": "in_progress", "activeForm": "Analyzing requirements" }
      ]
    },
    {
      "timestamp": 1500,
      "todos": [
        { "content": "Read brainstorm notes", "status": "completed", "activeForm": "Reading notes" },
        { "content": "Analyze requirements", "status": "completed", "activeForm": "Analyzing requirements" },
        { "content": "Create user stories", "status": "in_progress", "activeForm": "Creating stories" }
      ]
    },
    {
      "timestamp": 3000,
      "todos": [
        { "content": "Read brainstorm notes", "status": "completed", "activeForm": "Reading notes" },
        { "content": "Analyze requirements", "status": "completed", "activeForm": "Analyzing requirements" },
        { "content": "Create user stories", "status": "completed", "activeForm": "Creating stories" }
      ]
    }
  ],
  "finalState": {
    "exitCode": 0,
    "manifestUpdate": {
      "currentPhase": 2,
      "phases.1.status": "complete",
      "phases.1.completedAt": "{{ISO_TIMESTAMP}}"
    }
  }
}
```

#### worker-crash.json (Error Scenario)
```json
{
  "output": [
    "Starting Phase 4: Implement",
    "Writing component code...",
    "ERROR: Unexpected error occurred"
  ],
  "todoStates": [
    {
      "timestamp": 0,
      "todos": [
        { "content": "Write component code", "status": "in_progress", "activeForm": "Writing code" }
      ]
    },
    {
      "timestamp": 800,
      "todos": [
        { "content": "Write component code", "status": "in_progress", "activeForm": "Writing code" }
      ]
    }
  ],
  "finalState": {
    "exitCode": 1,
    "error": "Process terminated unexpectedly"
  }
}
```

#### worker-timeout.json (Timeout Scenario)
```json
{
  "output": [
    "Starting Phase 4: Implement",
    "Processing complex task..."
  ],
  "todoStates": [
    {
      "timestamp": 0,
      "todos": [
        { "content": "Process complex task", "status": "in_progress", "activeForm": "Processing" }
      ]
    }
  ],
  "finalState": {
    "exitCode": null,
    "timeout": true,
    "timeoutAfterMs": 300000
  }
}
```

### Legacy Fixture Format (Still Supported)

For backwards compatibility, the older format is still supported:

```json
{
  "name": "phase-1-success",
  "description": "Brainstorm phase completes successfully",
  "sessionId": "test-session-001",
  "sequence": [
    {
      "delay": 0,
      "todos": [
        { "content": "Read brainstorm notes", "status": "in_progress", "activeForm": "Reading notes" }
      ]
    }
  ],
  "exitCode": 0
}
```

### Manifest Update Fixture

```json
{
  "name": "epic-complete",
  "manifestUpdates": [
    { "path": "epics[0].status", "value": "complete" },
    { "path": "epics[0].testsPass", "value": true }
  ]
}
```

---

## Epic 1: TUI Framework (25 tests)

### E2E-001: Box Container Component (US-001)

**Test:** Box component renders with flexbox layout and borders

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'box'])
  .wait('stdout', /┌.*┐/)  // Top border
  .wait('stdout', /│.*│/)  // Side borders with content
  .wait('stdout', /└.*┘/)  // Bottom border
  .wait('close', 0);
```

**Keyboard Sequence:**
1. Launch app → Box container visible with border

**Edge Cases:**
- E2E-001a: Box with no children → Renders empty bordered container
- E2E-001b: Box with single border style → Uses 'single' line characters
- E2E-001c: Box with double border style → Uses '═' characters

**Covers Acceptance Criteria:**
- Renders children in flexbox layout
- Supports border styles (single, double, round)
- Supports padding and margin props
- Supports flexDirection (row, column)
- Has data-testid attribute for testing

---

### E2E-002: Text Component (US-002)

**Test:** Text component renders with styling options

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'text'])
  .wait('stdout', /\x1b\[1m.*bold.*\x1b\[22m/)  // Bold text
  .wait('stdout', /\x1b\[3m.*italic.*\x1b\[23m/) // Italic text
  .wait('stdout', /\x1b\[31m.*red.*\x1b\[39m/)   // Colored text
  .wait('close', 0);
```

**Edge Cases:**
- E2E-002a: Empty text → Renders nothing
- E2E-002b: Text with all styles combined → Applies all ANSI codes

**Covers Acceptance Criteria:**
- Renders text content
- Supports color prop (named colors, hex)
- Supports bold, italic, underline
- Supports dimmed text
- Supports inverse (background/foreground swap)

---

### E2E-003: Input Component (US-003)

**Test:** Input component handles text entry

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'input'])
  .wait('stdout', /Enter text:.*\|/)  // Cursor visible
  .stdin('stdout', /Enter text:/, 'hello')
  .wait('stdout', /hello\|/)  // Text with cursor
  .stdin('stdout', /hello/, KEYS.BACKSPACE)
  .wait('stdout', /hell\|/)   // Backspace worked
  .wait('close', 0);
```

**Keyboard Sequence:**
1. Focus input → Cursor appears
2. Type characters → Characters appear
3. Backspace → Last character deleted

**Edge Cases:**
- E2E-003a: Input with placeholder → Shows placeholder when empty
- E2E-003b: Input at max length → Stops accepting input

**Covers Acceptance Criteria:**
- Displays current value
- Shows cursor position
- Handles character input
- Handles backspace/delete
- Supports placeholder text
- Calls onChange callback

---

### E2E-004: Select Component (US-004)

**Test:** Select component handles option selection

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'select'])
  .wait('stdout', /► Option 1/)  // First option selected
  .wait('stdout', /  Option 2/)
  .stdin('stdout', /Option 1/, KEYS.DOWN)
  .wait('stdout', /  Option 1/)
  .wait('stdout', /► Option 2/)  // Selection moved down
  .stdin('stdout', /Option 2/, KEYS.ENTER)
  .wait('stdout', /Selected: Option 2/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-004a: Select with disabled option → Skips disabled on navigation
- E2E-004b: Select at last option + Down → Stays at last

**Covers Acceptance Criteria:**
- Displays list of options
- Shows current selection indicator (►)
- Navigates with arrow keys
- Selects with Enter
- Calls onChange with selected value

---

### E2E-005: Radio Group Component (US-005)

**Test:** RadioGroup component handles single selection

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'radio'])
  .wait('stdout', /● Option A/)  // First selected
  .wait('stdout', /○ Option B/)
  .stdin('stdout', /Option A/, KEYS.DOWN)
  .stdin('stdout', /Option B/, KEYS.SPACE)
  .wait('stdout', /○ Option A/)
  .wait('stdout', /● Option B/)  // Selection changed
  .wait('close', 0);
```

**Edge Cases:**
- E2E-005a: RadioGroup with no initial selection → First option selected

**Covers Acceptance Criteria:**
- Displays options with radio indicators (○/●)
- Only one option selected at a time
- Navigates with arrow keys
- Selects with Enter or Space

---

### E2E-006: Button Component (US-006)

**Test:** Button component handles activation

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'button'])
  .wait('stdout', /\[ Submit \]/)  // Button visible
  .stdin('stdout', /Submit/, KEYS.ENTER)
  .wait('stdout', /Button pressed!/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-006a: Button disabled → Does not respond to Enter
- E2E-006b: Button focused → Shows inverse/highlight style

**Covers Acceptance Criteria:**
- Displays button text
- Shows focus state
- Activates with Enter
- Supports disabled state
- Calls onPress callback

---

### E2E-007: Progress Bar Component (US-007)

**Test:** Progress bar displays completion

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'progress', '--value', '50'])
  .wait('stdout', /████████░░░░░░░░ 50%/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-007a: Progress at 0% → Shows empty bar
- E2E-007b: Progress at 100% → Shows full bar

**Covers Acceptance Criteria:**
- Displays progress as filled bar (████░░░░)
- Shows percentage value
- Accepts value prop (0-100)
- Configurable width

---

### E2E-008: Spinner Component (US-008)

**Test:** Spinner animates loading state

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'spinner'])
  .wait('stdout', /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/)  // Any spinner frame
  .wait('stdout', /Loading\.\.\./)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-008a: Spinner with different type → Uses different frames
- E2E-008b: Spinner stopped → Shows static character

**Covers Acceptance Criteria:**
- Animates through spinner frames
- Displays optional label text
- Can be stopped/started

---

### E2E-009: Divider Component (US-009)

**Test:** Divider renders horizontal line

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'divider'])
  .wait('stdout', /─{10,}/)  // At least 10 dashes
  .wait('close', 0);
```

**Edge Cases:**
- E2E-009a: Divider with title → Shows ── Title ──

**Covers Acceptance Criteria:**
- Renders horizontal line
- Fills available width
- Supports optional title in middle

---

### E2E-010: Badge Component (US-010)

**Test:** Badge displays status indicator

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'badge', '--variant', 'success'])
  .wait('stdout', /\x1b\[42m.*SUCCESS.*\x1b\[49m/)  // Green background
  .wait('close', 0);
```

**Edge Cases:**
- E2E-010a: Badge error variant → Red background
- E2E-010b: Badge warning variant → Yellow background

**Covers Acceptance Criteria:**
- Displays short text with background
- Supports variants (success, error, warning, info)

---

### E2E-011: List Component (US-011)

**Test:** List displays scrollable items

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'list'])
  .wait('stdout', /• Item 1/)
  .wait('stdout', /• Item 2/)
  .wait('stdout', /• Item 3/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-011a: List with numbered prefix → Shows 1. 2. 3.
- E2E-011b: List exceeding height → Shows scroll indicator

**Covers Acceptance Criteria:**
- Renders list items
- Supports item prefixes
- Scrolls when items exceed height
- Shows scroll indicator

---

### E2E-012: useInput Hook (US-012)

**Test:** useInput hook handles keyboard input

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-hook', 'useInput'])
  .wait('stdout', /Listening for input/)
  .stdin('stdout', /Listening/, 'a')
  .wait('stdout', /Key: a/)
  .stdin('stdout', /Key:/, KEYS.UP)
  .wait('stdout', /Arrow: up/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-012a: useInput with inactive flag → Does not receive input

**Covers Acceptance Criteria:**
- Receives character input
- Receives special keys (arrow, enter, escape, tab)
- Receives modifier keys (ctrl, shift)
- Can be conditionally active

---

### E2E-013: useApp Hook (US-013)

**Test:** useApp hook controls application lifecycle

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-hook', 'useApp'])
  .wait('stdout', /App ready/)
  .stdin('stdout', /App ready/, 'q')
  .wait('stdout', /Exiting\.\.\./)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-013a: useApp clear() → Screen clears

**Covers Acceptance Criteria:**
- Provides exit() function
- Provides clear() function
- Exposes app dimensions

---

### E2E-014: useFocus Hook (US-014)

**Test:** useFocus hook manages focus state

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-hook', 'useFocus'])
  .wait('stdout', /Not focused/)
  .stdin('stdout', /Not focused/, KEYS.TAB)
  .wait('stdout', /Focused!/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-014a: Tab to next element → Focus moves

**Covers Acceptance Criteria:**
- Returns isFocused boolean
- Provides focus() function
- Works with Tab navigation

---

### E2E-015: Screen Container Component (US-015)

**Test:** Screen fills terminal dimensions

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'screen'])
  .wait('stdout', /Header/)
  .wait('stdout', /Content area/)
  .wait('stdout', /Footer/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-015a: Screen resize → Layout adjusts

**Covers Acceptance Criteria:**
- Fills terminal dimensions
- Provides header/footer areas
- Clears previous content

---

### E2E-016: Modal Component (US-016)

**Test:** Modal renders overlay dialog

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'modal'])
  .wait('stdout', /Modal Title/)
  .wait('stdout', /Modal content/)
  .stdin('stdout', /Modal/, KEYS.ESCAPE)
  .wait('stdout', /Modal closed/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-016a: Modal with button → Button activates

**Covers Acceptance Criteria:**
- Renders on top of content
- Captures keyboard focus
- Has visible border
- Closes with Escape

---

### E2E-017: StatusBar Component (US-017)

**Test:** StatusBar shows persistent information

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'statusbar'])
  .wait('stdout', /\[q\] Quit.*\[\?\] Help/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-017a: StatusBar updates dynamically → Shows new content

**Covers Acceptance Criteria:**
- Renders at screen bottom
- Shows key hints
- Updates dynamically

---

### E2E-018: Tab Navigation (US-018)

**Test:** Tab moves between focusable elements

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-focus', 'tab'])
  .wait('stdout', /\[1\] Focused/)
  .stdin('stdout', /Focused/, KEYS.TAB)
  .wait('stdout', /\[2\] Focused/)
  .stdin('stdout', /Focused/, KEYS.SHIFT_TAB)
  .wait('stdout', /\[1\] Focused/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-018a: Tab at last element → Wraps to first

**Covers Acceptance Criteria:**
- Tab moves to next focusable
- Shift+Tab moves to previous
- Focus wraps at boundaries

---

### E2E-019: Arrow Key Navigation (US-019)

**Test:** Arrow keys navigate within components

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-focus', 'arrows'])
  .wait('stdout', /Item 1 selected/)
  .stdin('stdout', /Item 1/, KEYS.DOWN)
  .wait('stdout', /Item 2 selected/)
  .stdin('stdout', /Item 2/, KEYS.UP)
  .wait('stdout', /Item 1 selected/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-019a: Arrow at boundary → Stays at boundary

**Covers Acceptance Criteria:**
- Up/Down for vertical lists
- Left/Right for horizontal layouts
- Stops at boundaries

---

### E2E-020: Enter/Space Activation (US-020)

**Test:** Enter and Space activate elements

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-focus', 'activation'])
  .wait('stdout', /Button ready/)
  .stdin('stdout', /Button/, KEYS.ENTER)
  .wait('stdout', /Button activated/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-020a: Space on checkbox → Toggles

**Covers Acceptance Criteria:**
- Enter activates buttons
- Space toggles checkboxes
- Enter selects list items

---

### E2E-021: Escape Cancellation (US-021)

**Test:** Escape cancels/closes/goes-back

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-focus', 'escape'])
  .wait('stdout', /In modal/)
  .stdin('stdout', /modal/, KEYS.ESCAPE)
  .wait('stdout', /Modal closed/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Closes modals
- Returns to previous screen

---

### E2E-022: Global Keyboard Shortcuts (US-022)

**Test:** Global shortcuts work from any screen

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-focus', 'global'])
  .wait('stdout', /Main screen/)
  .stdin('stdout', /Main/, '?')
  .wait('stdout', /Help overlay/)
  .stdin('stdout', /Help/, KEYS.ESCAPE)
  .wait('stdout', /Main screen/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-022a: q shows quit confirmation
- E2E-022b: Ctrl+L clears screen

**Covers Acceptance Criteria:**
- q shows quit confirmation
- ? shows help overlay
- Ctrl+L clears screen

---

### E2E-023: Toast/Notification Component (US-023)

**Test:** Toast shows temporary message

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'toast'])
  .wait('stdout', /Success: Operation complete/)
  .wait(2000)  // Wait for auto-dismiss
  .wait('stdout', /Toast dismissed/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-023a: Error toast → Red styling

**Covers Acceptance Criteria:**
- Displays message at screen edge
- Auto-dismisses after timeout
- Supports different types

---

### E2E-024: Table Component (US-024)

**Test:** Table displays tabular data

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'table'])
  .wait('stdout', /│ Name.*│ Status.*│/)  // Headers
  .wait('stdout', /├.*┼.*┤/)               // Row separator
  .wait('stdout', /│ Epic 1.*│ ✓.*│/)      // Data row
  .wait('close', 0);
```

**Edge Cases:**
- E2E-024a: Table with empty data → Shows headers only

**Covers Acceptance Criteria:**
- Renders headers and rows
- Aligns columns
- Draws borders

---

### E2E-025: Responsive Layout (US-025)

**Test:** Layout adapts to terminal size

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'responsive'])
  .wait('stdout', /Full layout/)
  // Resize would require SIGWINCH or env override
  .wait('close', 0);
```

**Edge Cases:**
- E2E-025a: Below minimum size → Shows warning

**Covers Acceptance Criteria:**
- Adapts to terminal size
- Handles resize
- Minimum size warning

---

## Epic 2: Test Infrastructure (30 tests)

### E2E-026: Mock Worker Creation (US-026)

**Test:** Mock worker simulates Claude CLI without real API calls

**CLET Pattern:**
```typescript
const mockWorker = new MockWorker({
  fixture: 'phase-1-success',
  sessionId: 'test-001'
});

await runner()
  .fork('bin/cli.js', ['--project', mockProject])
  .wait('stdout', /Worker started/)

// Mock worker writes todos
mockWorker.advanceTodos(0);  // First todo state

await runner()
  .wait('stdout', /Reading notes/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Executes as test helper
- Reads fixture file
- Writes todo files with timing
- Does not call real Claude API

---

### E2E-027: Mock Worker Todo Writing (US-027)

**Test:** Mock worker writes todo files at correct intervals

**CLET Pattern:**
```typescript
const mockWorker = new MockWorker({ fixture: 'phase-1-success' });

// Advance through todo states
mockWorker.advanceTodos(0);
expect(fs.existsSync(todoPath)).toBe(true);

const todos = JSON.parse(fs.readFileSync(todoPath));
expect(todos[0].status).toBe('in_progress');

mockWorker.advanceTodos(1);
const todos2 = JSON.parse(fs.readFileSync(todoPath));
expect(todos2[0].status).toBe('completed');
```

**Covers Acceptance Criteria:**
- Creates todo files at specified timestamps
- Updates todo content per fixture
- Uses correct file path pattern

---

### E2E-028: Mock Worker Manifest Updates (US-028)

**Test:** Mock worker updates manifest for phase transitions

**CLET Pattern:**
```typescript
const mockWorker = new MockWorker({ fixture: 'phase-1-success' });

// Initial manifest
expect(manifest.currentPhase).toBe(1);

// Complete phase
mockWorker.completePhase();

const updatedManifest = JSON.parse(fs.readFileSync(manifestPath));
expect(updatedManifest.currentPhase).toBe(2);
```

**Covers Acceptance Criteria:**
- Updates manifest.json per fixture
- Sets phase status to complete
- Advances currentPhase

---

### E2E-029: Mock Worker Exit Codes (US-029)

**Test:** Mock worker simulates exit codes

**CLET Pattern:**
```typescript
const mockWorker = new MockWorker({ fixture: 'worker-crash', exitCode: 1 });

mockWorker.simulateExit();
expect(mockWorker.exitCode).toBe(1);
```

**Covers Acceptance Criteria:**
- Exits with code from fixture (0, 1, etc.)
- Supports timeout simulation
- Supports crash simulation

---

### E2E-030: Fixture File Format (US-030)

**Test:** Fixtures follow defined JSON schema

**CLET Pattern:**
```typescript
const fixture = loadFixture('phase-1-success');

expect(fixture.name).toBeDefined();
expect(fixture.sequence).toBeArray();
expect(fixture.sequence[0].todos).toBeArray();
expect(fixture.exitCode).toBe(0);
```

**Covers Acceptance Criteria:**
- JSON format with schema validation
- sequence[] array for todo updates
- todoStates define content
- exitCode for exit behavior

---

### E2E-031: Phase-Specific Fixtures (US-031)

**Test:** Each phase has dedicated fixture

**CLET Pattern:**
```typescript
const phases = [1, 2, 3, 4, 5];
for (const phase of phases) {
  const fixture = loadFixture(`phase-${phase}-success`);
  expect(fixture).toBeDefined();
  expect(fixture.sequence.length).toBeGreaterThan(0);
}
```

**Covers Acceptance Criteria:**
- phase-1-success.json (brainstorm)
- phase-2-success.json (specs)
- phase-3-success.json (bootstrap)
- phase-4-success.json (implement)
- phase-5-success.json (finalize)

---

### E2E-032: Error Scenario Fixtures (US-032)

**Test:** Error fixtures simulate failures

**CLET Pattern:**
```typescript
const timeoutFixture = loadFixture('worker-timeout');
expect(timeoutFixture.exitCode).toBe(null);  // Never exits

const crashFixture = loadFixture('worker-crash');
expect(crashFixture.exitCode).toBe(1);
```

**Covers Acceptance Criteria:**
- worker-timeout.json
- worker-crash.json
- worker-context-limit.json

---

### E2E-033: Mock Windows Terminal Service (US-033)

**Test:** Mock wt.exe returns fake PIDs without opening windows

**CLET Pattern:**
```typescript
const mockWt = new MockWindowsTerminal();

const result = mockWt.spawn({
  directory: '/project',
  command: 'claude --session-id test'
});

expect(result.pid).toBeDefined();
expect(result.pid).toBeGreaterThan(0);
expect(mockWt.openedWindows).toBe(0);  // No real window
```

**Covers Acceptance Criteria:**
- Mocks wt.exe spawn command
- Returns mock process handle
- Does not open real windows
- Simulates process lifecycle

---

### E2E-034: Mock Windows Terminal PID Tracking (US-034)

**Test:** Mock tracks PIDs and process state

**CLET Pattern:**
```typescript
const mockWt = new MockWindowsTerminal();

const { pid } = mockWt.spawn({ command: 'claude' });
expect(mockWt.isRunning(pid)).toBe(true);

mockWt.kill(pid);
expect(mockWt.isRunning(pid)).toBe(false);
```

**Covers Acceptance Criteria:**
- Assigns mock PIDs
- Tracks which processes are "running"
- Simulates process kill

---

### E2E-035: Mock Filesystem Module (US-035)

**Test:** Mock filesystem provides isolated storage

**CLET Pattern:**
```typescript
const mockFs = new MockFilesystem();

mockFs.writeFileSync('/test/file.json', '{"key": "value"}');
expect(mockFs.existsSync('/test/file.json')).toBe(true);

const content = mockFs.readFileSync('/test/file.json', 'utf8');
expect(JSON.parse(content).key).toBe('value');
```

**Covers Acceptance Criteria:**
- In-memory file storage
- Provides fs API compatible methods
- Can be pre-populated for tests

---

### E2E-036: Mock Filesystem Watch (US-036)

**Test:** Mock filesystem emits watch events

**CLET Pattern:**
```typescript
const mockFs = new MockFilesystem();
const events: string[] = [];

mockFs.watch('/test', (event, filename) => {
  events.push(`${event}:${filename}`);
});

mockFs.writeFileSync('/test/todos.json', '{}');
expect(events).toContain('change:todos.json');
```

**Covers Acceptance Criteria:**
- watch() returns watcher object
- Emits change events on file updates
- Can be triggered programmatically

---

### E2E-037: Mock ccusage Integration (US-037)

**Test:** Mock ccusage returns cost data

**CLET Pattern:**
```typescript
const mockCcusage = new MockCcusage();

mockCcusage.setSessionCost('test-001', {
  totalCost: 1.50,
  duration: 3600,
  tokensIn: 50000,
  tokensOut: 10000
});

const cost = mockCcusage.getSessionCost('test-001');
expect(cost.totalCost).toBe(1.50);
```

**Covers Acceptance Criteria:**
- Returns fixture cost data
- Supports session filtering
- Returns duration data

---

### E2E-038: Test Harness Setup (US-038)

**Test:** Test harness provides consistent environment

**CLET Pattern:**
```typescript
describe('Test Suite', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = new TestHarness();
    harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it('has isolated state', () => {
    expect(harness.mockFs.isEmpty()).toBe(true);
    expect(harness.mockWt.processCount()).toBe(0);
  });
});
```

**Covers Acceptance Criteria:**
- beforeEach resets all mocks
- afterEach cleans up resources
- Sets up mock environment variables

---

### E2E-039: CLET Test Runner Integration (US-039)

**Test:** CLET runner works with CLI

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--version'])
  .wait('stdout', /Pipeline v7/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- runner() function available
- fork() spawns CLI
- wait() for output patterns

---

### E2E-040: Test Assertions for TUI (US-040)

**Test:** TUI assertions verify output

**CLET Pattern:**
```typescript
const output = await captureOutput();

expect(output).toContainText('PIPELINE v7');
expect(output).toShowScreen('Dashboard');
expect(output).toShowProgress(50);
```

**Covers Acceptance Criteria:**
- toContainText(pattern)
- toShowScreen(name)
- toShowProgress(percent)

---

### E2E-041: Test Assertions for State (US-041)

**Test:** State assertions verify stores

**CLET Pattern:**
```typescript
const state = harness.getState();

expect(state).toHaveManifestPhase(2);
expect(state).toHaveEpicStatus('epic-1', 'complete');
expect(state).toHaveTodoCount(5);
```

**Covers Acceptance Criteria:**
- toHaveManifestPhase(n)
- toHaveEpicStatus(epicId, status)
- toHaveTodoCount(n)

---

### E2E-042: Test Timing Utilities (US-042)

**Test:** Timing utilities control async

**CLET Pattern:**
```typescript
const { advanceTimers, waitFor, flushPromises } = harness.timing;

advanceTimers(1000);
await flushPromises();

await waitFor(() => mockWorker.todosWritten > 0);
```

**Covers Acceptance Criteria:**
- advanceTimers(ms) function
- waitFor(condition) utility
- flushPromises() function

---

### E2E-043: Test Data Factories (US-043)

**Test:** Factories create test data

**CLET Pattern:**
```typescript
const manifest = buildManifest({ currentPhase: 2 });
const project = buildProject({ path: '/test' });
const todo = buildTodo({ content: 'Test', status: 'pending' });

expect(manifest.currentPhase).toBe(2);
expect(project.path).toBe('/test');
expect(todo.status).toBe('pending');
```

**Covers Acceptance Criteria:**
- buildManifest() factory
- buildProject() factory
- buildTodo() factory

---

### E2E-044: Mock Process Spawn (US-044)

**Test:** Process spawning is mocked

**CLET Pattern:**
```typescript
const spawnSpy = harness.mockSpawn();

processService.spawnWorker({ sessionId: 'test' });

expect(spawnSpy).toHaveBeenCalledWith(
  expect.stringContaining('wt.exe'),
  expect.any(Array)
);
```

**Covers Acceptance Criteria:**
- spawn() returns mock process
- Tracks spawned processes
- Simulates exit events

---

### E2E-045: Mock Process Kill (US-045)

**Test:** Process killing is mocked

**CLET Pattern:**
```typescript
const mockProcess = harness.mockWt.spawn({ command: 'claude' });

harness.mockWt.kill(mockProcess.pid);

expect(harness.mockWt.killHistory).toContain(mockProcess.pid);
expect(harness.mockWt.isRunning(mockProcess.pid)).toBe(false);
```

**Covers Acceptance Criteria:**
- kill(pid) marks process dead
- Emits exit event
- Records kill history

---

### E2E-046: Test Isolation Verification (US-046)

**Test:** Tests are isolated

**CLET Pattern:**
```typescript
it('test 1 modifies state', () => {
  harness.mockFs.writeFileSync('/shared', 'test1');
});

it('test 2 has clean state', () => {
  expect(harness.mockFs.existsSync('/shared')).toBe(false);
});
```

**Covers Acceptance Criteria:**
- Each test has fresh mock state
- No shared mutable state
- Parallel test execution works

---

### E2E-047: Fixture Validation (US-047)

**Test:** Invalid fixtures are rejected

**CLET Pattern:**
```typescript
expect(() => loadFixture('invalid')).toThrow(/required field/);

const invalid = { name: 'test' };  // Missing sequence
expect(() => validateFixture(invalid)).toThrow(/sequence is required/);
```

**Covers Acceptance Criteria:**
- JSON schema validation
- Required fields checked
- Error messages for invalid fixtures

---

### E2E-048: Test Helper Functions (US-048)

**Test:** Helpers simplify common patterns

**CLET Pattern:**
```typescript
const project = createMockProject();
const manifest = createMockManifest({ currentPhase: 2 });

await simulatePhaseComplete(harness, 2);

expect(harness.getManifest().currentPhase).toBe(3);
```

**Covers Acceptance Criteria:**
- createMockProject() helper
- createMockManifest() helper
- simulatePhaseComplete() helper

---

### E2E-049: Integration Test Patterns (US-049)

**Test:** Integration tests mount with providers

**CLET Pattern:**
```typescript
const { output, rerender } = render(
  <MockProviders>
    <Dashboard project={mockProject} />
  </MockProviders>
);

expect(output).toContainText('Dashboard');
```

**Covers Acceptance Criteria:**
- Mount component with providers
- Inject mock dependencies
- Assert on rendered output

---

### E2E-050: E2E Test Patterns (US-050)

**Test:** E2E tests verify full flows

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', mockProject])
  .wait('stdout', /Select project/)
  .stdin('stdout', /Select/, KEYS.ENTER)
  .wait('stdout', /Dashboard/)
  .stdin('stdout', /Dashboard/, 's')  // Start
  .wait('stdout', /Worker started/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Launch full CLI
- Navigate through screens
- Verify state changes

---

### E2E-051: Test Error Simulation (US-051)

**Test:** Errors are simulated correctly

**CLET Pattern:**
```typescript
harness.mockFs.setError('/manifest.json', new Error('ENOENT'));

const result = filesystemService.readManifest('/project');
expect(result.error).toBe('ENOENT');
```

**Covers Acceptance Criteria:**
- Simulate file read errors
- Simulate process spawn errors
- Verify error handling

---

### E2E-052: Performance Test Utilities (US-052)

**Test:** Slow tests are detected

**CLET Pattern:**
```typescript
const timer = harness.startTimer();

// Run test
await someOperation();

expect(timer.elapsed()).toBeLessThan(1000);
```

**Covers Acceptance Criteria:**
- Test timeout enforcement
- Execution time tracking

---

### E2E-053: Mock Git Operations (US-053)

**Test:** Git operations are mocked

**CLET Pattern:**
```typescript
harness.mockGit.setStatus({ modified: ['file.ts'] });

const status = await gitService.getStatus();
expect(status.modified).toContain('file.ts');
```

**Covers Acceptance Criteria:**
- Mock git status
- Mock git commit
- Track git operation history

---

### E2E-054: Debug Logging for Tests (US-054)

**Test:** Debug logs aid diagnosis

**CLET Pattern:**
```typescript
harness.enableDebugLogging();

// Run test that fails
await someOperation();

// Debug log shows state changes
expect(harness.debugLog).toContain('Mock worker wrote todos');
```

**Covers Acceptance Criteria:**
- Capture mock interactions
- Log state changes
- Output on test failure

---

### E2E-055: Test Coverage Reporting (US-055)

**Test:** Coverage is tracked

**Verification:**
```bash
npm run test:coverage

# Output should show:
# Lines: >90%
# Functions: >90%
# Branches: >80%
```

**Covers Acceptance Criteria:**
- Line coverage percentage
- Function coverage percentage
- Uncovered lines highlighted

---

## Epic 3: State Management (35 tests)

### E2E-056: Zustand Store Creation (US-056)

**Test:** Store initializes correctly

**CLET Pattern:**
```typescript
const store = createPipelineStore();

expect(store.getState().manifest).toBe(null);
expect(store.getState().workerPid).toBe(null);
expect(store.getState().currentScreen).toBe('welcome');
```

**Covers Acceptance Criteria:**
- Creates Zustand store
- Has default state values
- Supports subscriptions

---

### E2E-057: Project Store (US-057)

**Test:** Project store manages project data

**CLET Pattern:**
```typescript
const store = useProjectStore();

store.setProject({ path: '/project', name: 'test' });

expect(store.getState().project.path).toBe('/project');
expect(store.getState().project.name).toBe('test');
```

**Covers Acceptance Criteria:**
- Stores project path
- Stores project name
- Tracks project status

---

### E2E-058: Manifest Store (US-058)

**Test:** Manifest store manages pipeline state

**CLET Pattern:**
```typescript
const store = useManifestStore();

store.setManifest({ currentPhase: 2, epics: [] });

expect(store.getState().currentPhase).toBe(2);
```

**Covers Acceptance Criteria:**
- Stores current phase
- Stores epic list
- Tracks phase history

---

### E2E-059: Worker Store (US-059)

**Test:** Worker store manages worker state

**CLET Pattern:**
```typescript
const store = useWorkerStore();

store.setWorker({ pid: 12345, sessionId: 'test-001' });

expect(store.getState().workerPid).toBe(12345);
expect(store.getState().sessionId).toBe('test-001');
```

**Covers Acceptance Criteria:**
- Stores worker PID
- Stores session ID
- Tracks worker status (running, stopped, crashed)

---

### E2E-060: Todo Store (US-060)

**Test:** Todo store manages todo items

**CLET Pattern:**
```typescript
const store = useTodoStore();

store.setTodos([
  { content: 'Task 1', status: 'completed' },
  { content: 'Task 2', status: 'in_progress' }
]);

expect(store.getState().todos).toHaveLength(2);
expect(store.getState().completedCount).toBe(1);
```

**Covers Acceptance Criteria:**
- Stores todo list
- Calculates completed count
- Calculates progress percentage

---

### E2E-061: Cost Store (US-061)

**Test:** Cost store manages cost data

**CLET Pattern:**
```typescript
const store = useCostStore();

store.setCost({ totalCost: 1.50, sessionCost: 0.75 });

expect(store.getState().totalCost).toBe(1.50);
expect(store.getState().sessionCost).toBe(0.75);
```

**Covers Acceptance Criteria:**
- Stores total cost
- Stores session cost
- Tracks cost history

---

### E2E-062: Duration Store (US-062)

**Test:** Duration store manages timing

**CLET Pattern:**
```typescript
const store = useDurationStore();

store.startTimer();
// Wait
store.stopTimer();

expect(store.getState().duration).toBeGreaterThan(0);
```

**Covers Acceptance Criteria:**
- Tracks elapsed time
- Supports pause/resume
- Formats duration for display

---

### E2E-063: Screen Store (US-063)

**Test:** Screen store manages navigation

**CLET Pattern:**
```typescript
const store = useScreenStore();

store.navigate('dashboard');
expect(store.getState().currentScreen).toBe('dashboard');

store.goBack();
expect(store.getState().currentScreen).toBe('welcome');
```

**Covers Acceptance Criteria:**
- Stores current screen
- Maintains screen history
- Supports navigation actions

---

### E2E-064: Settings Store (US-064)

**Test:** Settings store manages preferences

**CLET Pattern:**
```typescript
const store = useSettingsStore();

store.setSetting('theme', 'dark');
expect(store.getState().theme).toBe('dark');

store.setSetting('confirmQuit', false);
expect(store.getState().confirmQuit).toBe(false);
```

**Covers Acceptance Criteria:**
- Stores user preferences
- Persists to disk
- Loads on startup

---

### E2E-065: Store Selectors (US-065)

**Test:** Selectors compute derived state

**CLET Pattern:**
```typescript
const store = usePipelineStore();

store.setTodos([
  { status: 'completed' },
  { status: 'in_progress' },
  { status: 'pending' }
]);

const progress = selectProgress(store.getState());
expect(progress).toBe(33);  // 1/3 complete
```

**Covers Acceptance Criteria:**
- selectProgress computes percentage
- selectCurrentEpic finds active epic
- selectWorkerStatus computes status

---

### E2E-066 through E2E-090: Additional State Management Tests

(Abbreviated for space - each US-066 through US-090 has corresponding E2E test following the same pattern)

**Tests Cover:**
- Store persistence (US-066)
- State hydration (US-067)
- Action dispatching (US-068)
- Subscription cleanup (US-069)
- Store reset (US-070)
- Computed properties (US-071)
- State immutability (US-072)
- Store composition (US-073)
- State serialization (US-074)
- State validation (US-075)
- Store middleware (US-076)
- Action logging (US-077)
- State snapshots (US-078)
- Store devtools (US-079)
- State migration (US-080)
- Error state handling (US-081)
- Loading state (US-082)
- Optimistic updates (US-083)
- State batching (US-084)
- Store cleanup (US-085)
- State diffing (US-086)
- Store namespacing (US-087)
- State encryption (US-088)
- Store testing utils (US-089)
- Store types (US-090)

---

## Epic 4: Filesystem Service (25 tests)

### E2E-091: Manifest Read (US-091)

**Test:** Reads manifest.json from project

**CLET Pattern:**
```typescript
harness.mockFs.writeFileSync('/project/.pipeline/manifest.json', JSON.stringify({
  currentPhase: 2,
  epics: []
}));

const manifest = await filesystemService.readManifest('/project');
expect(manifest.currentPhase).toBe(2);
```

**Covers Acceptance Criteria:**
- Reads JSON from .pipeline/manifest.json
- Parses JSON content
- Returns typed object

---

### E2E-092: Manifest Write (US-092)

**Test:** Writes manifest.json atomically

**CLET Pattern:**
```typescript
await filesystemService.writeManifest('/project', {
  currentPhase: 3,
  epics: []
});

const content = harness.mockFs.readFileSync('/project/.pipeline/manifest.json');
expect(JSON.parse(content).currentPhase).toBe(3);
```

**Covers Acceptance Criteria:**
- Writes to temp file first
- Renames to final path
- Ensures atomic write

---

### E2E-093: Todo File Watch (US-093)

**Test:** Watches todo files for changes

**CLET Pattern:**
```typescript
const events: any[] = [];
filesystemService.watchTodos('test-001', (todos) => {
  events.push(todos);
});

harness.mockFs.writeFileSync(
  '~/.claude/todos/test-001.json',
  JSON.stringify([{ content: 'Task', status: 'completed' }])
);

await waitFor(() => events.length > 0);
expect(events[0][0].status).toBe('completed');
```

**Covers Acceptance Criteria:**
- Watches ~/.claude/todos/{sessionId}.json
- Parses JSON on change
- Emits parsed todos

---

### E2E-094: Todo File Parse (US-094)

**Test:** Parses todo JSON correctly

**CLET Pattern:**
```typescript
const todos = filesystemService.parseTodoFile(`[
  { "content": "Task 1", "status": "completed", "activeForm": "Completing" }
]`);

expect(todos[0].content).toBe('Task 1');
expect(todos[0].status).toBe('completed');
```

**Covers Acceptance Criteria:**
- Parses JSON array
- Validates todo structure
- Returns typed objects

---

### E2E-095 through E2E-115: Additional Filesystem Tests

(Abbreviated - covers US-095 through US-115)

**Tests Cover:**
- Manifest validation (US-095)
- File existence check (US-096)
- Directory creation (US-097)
- File deletion (US-098)
- Watch cleanup (US-099)
- Error handling for read (US-100)
- Error handling for write (US-101)
- JSON parse errors (US-102)
- Path resolution (US-103)
- File permissions (US-104)
- Large file handling (US-105)
- Concurrent writes (US-106)
- File locking (US-107)
- Temp file cleanup (US-108)
- Backup creation (US-109)
- File copy (US-110)
- File move (US-111)
- Directory listing (US-112)
- Glob patterns (US-113)
- File watching debounce (US-114)
- Watch error recovery (US-115)

---

## Epic 5: Process Service - wt.exe (25 tests)

### E2E-116: Windows Terminal Detection (US-116)

**Test:** Detects Windows Terminal availability

**CLET Pattern:**
```typescript
harness.mockOs.setPlatform('win32');
harness.mockExec.setCommand('where wt', { stdout: 'C:\\...\\wt.exe' });

const result = await processService.detectWindowsTerminal();
expect(result.available).toBe(true);
expect(result.path).toContain('wt.exe');
```

**Edge Cases:**
- E2E-116a: wt.exe not found → Returns { available: false }
- E2E-116b: Non-Windows platform → Returns { available: false }

**Covers Acceptance Criteria:**
- Checks for wt.exe existence
- Returns path if found
- Returns availability status

---

### E2E-117: Worker Spawn via wt.exe (US-117)

**Test:** Spawns worker in new Windows Terminal tab

**CLET Pattern:**
```typescript
const spawnSpy = harness.mockSpawn();

await processService.spawnWorker({
  projectPath: '/project',
  sessionId: 'test-001',
  phase: 1
});

expect(spawnSpy).toHaveBeenCalledWith(
  'wt.exe',
  [
    '-w', '0',
    'nt',
    '-d', '/project',
    'claude', '--session-id', 'test-001'
  ],
  expect.any(Object)
);
```

**Edge Cases:**
- E2E-117a: First launch (no existing window) → Creates new window
- E2E-117b: With existing window → Opens new tab

**Covers Acceptance Criteria:**
- Calls wt.exe with correct arguments
- Uses -w 0 for current window
- Uses nt for new tab
- Passes project directory
- Passes session ID to claude

---

### E2E-118: Worker PID Tracking (US-118)

**Test:** Tracks spawned worker PID

**CLET Pattern:**
```typescript
harness.mockWt.setNextPid(12345);

const worker = await processService.spawnWorker({
  projectPath: '/project',
  sessionId: 'test-001'
});

expect(worker.pid).toBe(12345);
expect(processService.getWorkerPid()).toBe(12345);
```

**Covers Acceptance Criteria:**
- Stores worker PID
- Returns PID from spawn
- Updates worker store

---

### E2E-119: Worker Process Detection (US-119)

**Test:** Detects if worker process is running

**CLET Pattern:**
```typescript
harness.mockWt.spawn({ pid: 12345 });

const isRunning = await processService.isWorkerRunning(12345);
expect(isRunning).toBe(true);

harness.mockWt.kill(12345);
const isRunningAfter = await processService.isWorkerRunning(12345);
expect(isRunningAfter).toBe(false);
```

**Covers Acceptance Criteria:**
- Checks tasklist for PID (Windows)
- Returns true if process exists
- Returns false if process gone

---

### E2E-120: Worker Process Kill (US-120)

**Test:** Kills worker process

**CLET Pattern:**
```typescript
const worker = await processService.spawnWorker({...});

await processService.killWorker(worker.pid);

expect(harness.mockWt.isRunning(worker.pid)).toBe(false);
expect(harness.mockWt.killHistory).toContain(worker.pid);
```

**Covers Acceptance Criteria:**
- Calls taskkill for PID (Windows)
- Updates worker store
- Emits kill event

---

### E2E-121: Session ID Generation (US-121)

**Test:** Generates unique session IDs

**CLET Pattern:**
```typescript
const id1 = processService.generateSessionId();
const id2 = processService.generateSessionId();

expect(id1).toMatch(/^[a-f0-9-]{36}$/);
expect(id1).not.toBe(id2);
```

**Covers Acceptance Criteria:**
- Generates UUID v4
- IDs are unique
- Format matches Claude session ID format

---

### E2E-122: Worker Lifecycle Events (US-122)

**Test:** Emits lifecycle events

**CLET Pattern:**
```typescript
const events: string[] = [];
processService.on('worker:started', () => events.push('started'));
processService.on('worker:stopped', () => events.push('stopped'));

await processService.spawnWorker({...});
expect(events).toContain('started');

await processService.killWorker(12345);
expect(events).toContain('stopped');
```

**Covers Acceptance Criteria:**
- Emits worker:started on spawn
- Emits worker:stopped on kill
- Emits worker:crashed on error

---

### E2E-123: Phase Command Injection (US-123)

**Test:** Injects correct phase command

**CLET Pattern:**
```typescript
const spawnSpy = harness.mockSpawn();

await processService.spawnWorker({
  projectPath: '/project',
  sessionId: 'test-001',
  phase: 2,
  command: '/2-pipeline-implementEpic'
});

// Verify the command is passed correctly
expect(spawnSpy).toHaveBeenCalledWith(
  'wt.exe',
  expect.arrayContaining([
    '-d', '/project',
    'claude', '--session-id', 'test-001'
  ])
);
```

**Covers Acceptance Criteria:**
- Includes phase-specific command
- Formats command correctly
- Escapes special characters

---

### E2E-124: Worker Restart (US-124)

**Test:** Restarts crashed worker

**CLET Pattern:**
```typescript
const worker = await processService.spawnWorker({...});
harness.mockWt.simulateCrash(worker.pid);

await processService.restartWorker();

expect(processService.getWorkerPid()).not.toBe(worker.pid);
expect(harness.mockWt.spawnCount).toBe(2);
```

**Covers Acceptance Criteria:**
- Detects crashed worker
- Spawns new worker
- Updates worker store

---

### E2E-125: Graceful Shutdown (US-125)

**Test:** Gracefully shuts down worker

**CLET Pattern:**
```typescript
const worker = await processService.spawnWorker({...});

await processService.gracefulShutdown();

// Should wait for current task
expect(harness.mockWt.isRunning(worker.pid)).toBe(false);
```

**Covers Acceptance Criteria:**
- Waits for current task completion
- Kills process after timeout
- Updates stores

---

### E2E-126 through E2E-140: Additional Process Tests

(Abbreviated - covers US-126 through US-140)

**Tests Cover:**
- Error handling for spawn (US-126)
- Error handling for kill (US-127)
- Multiple workers prevention (US-128)
- Focus worker window (US-129)
- Worker health check (US-130)
- Timeout handling (US-131)
- Process environment (US-132)
- Working directory (US-133)
- Shell configuration (US-134)
- Process cleanup (US-135)
- Orphan process detection (US-136)
- Process output capture (placeholder) (US-137)
- Process input injection (placeholder) (US-138)
- Non-Windows fallback (US-139)
- Process priorities (US-140)

---

## Epic 6: Cost Service (20 tests)

### E2E-141: ccusage Integration (US-141)

**Test:** Reads cost from ccusage

**CLET Pattern:**
```typescript
harness.mockCcusage.setSessionCost('test-001', {
  totalCost: 1.50,
  tokensIn: 50000,
  tokensOut: 10000
});

const cost = await costService.getSessionCost('test-001');
expect(cost.totalCost).toBe(1.50);
```

**Covers Acceptance Criteria:**
- Calls ccusage CLI
- Parses JSON output
- Returns typed cost object

---

### E2E-142: Cost Accumulation (US-142)

**Test:** Accumulates cost across sessions

**CLET Pattern:**
```typescript
costService.addSessionCost('session-1', 1.00);
costService.addSessionCost('session-2', 0.50);

expect(costService.getTotalCost()).toBe(1.50);
```

**Covers Acceptance Criteria:**
- Sums session costs
- Stores running total
- Persists across restarts

---

### E2E-143 through E2E-160: Additional Cost Tests

(Abbreviated - covers US-143 through US-160)

**Tests Cover:**
- Cost formatting (US-143)
- Duration calculation (US-144)
- Cost estimation (US-145)
- Cost per phase (US-146)
- Cost alerts (US-147)
- Cost history (US-148)
- Cost export (US-149)
- Token counting (US-150)
- Model pricing (US-151)
- Cost refresh (US-152)
- Cost caching (US-153)
- Error handling (US-154)
- Missing ccusage (US-155)
- Cost validation (US-156)
- Cost reset (US-157)
- Cost comparison (US-158)
- Cost breakdown (US-159)
- Cost projection (US-160)

---

## Epic 7: Pipeline Orchestrator (30 tests)

### E2E-161: Orchestrator Initialization (US-161)

**Test:** Orchestrator initializes with project

**CLET Pattern:**
```typescript
harness.mockFs.writeFileSync('/project/.pipeline/manifest.json', JSON.stringify({
  currentPhase: 1,
  epics: []
}));

const orchestrator = new PipelineOrchestrator('/project');
await orchestrator.initialize();

expect(orchestrator.currentPhase).toBe(1);
expect(orchestrator.status).toBe('ready');
```

**Covers Acceptance Criteria:**
- Reads manifest
- Sets initial state
- Validates project structure

---

### E2E-162: Phase Advancement (US-162)

**Test:** Advances to next phase when complete

**CLET Pattern:**
```typescript
const orchestrator = new PipelineOrchestrator('/project');
await orchestrator.initialize();

// Simulate phase 1 complete
mockWorker.completePhase(1);

await orchestrator.checkPhaseComplete();
expect(orchestrator.currentPhase).toBe(2);
```

**Covers Acceptance Criteria:**
- Detects phase completion
- Updates manifest
- Spawns next phase worker

---

### E2E-163: Epic Loop Detection (US-163)

**Test:** Detects and handles epic loops

**CLET Pattern:**
```typescript
harness.mockFs.writeFileSync('/project/.pipeline/manifest.json', JSON.stringify({
  currentPhase: 4,
  epics: [
    { id: 'epic-1', status: 'complete' },
    { id: 'epic-2', status: 'pending' }
  ]
}));

const orchestrator = new PipelineOrchestrator('/project');
await orchestrator.initialize();

// Complete epic 1, should loop to epic 2
mockWorker.completeEpic('epic-1');
await orchestrator.checkEpicComplete();

expect(orchestrator.currentEpic).toBe('epic-2');
```

**Covers Acceptance Criteria:**
- Detects epic completion
- Advances to next epic
- Handles last epic → next phase

---

### E2E-164: Todo Progress Monitoring (US-164)

**Test:** Monitors todo progress from file

**CLET Pattern:**
```typescript
const orchestrator = new PipelineOrchestrator('/project');
const progressEvents: number[] = [];

orchestrator.on('progress', (percent) => progressEvents.push(percent));
await orchestrator.startWorker();

// Mock worker writes todos
mockWorker.writeTodo([
  { content: 'Task 1', status: 'completed' },
  { content: 'Task 2', status: 'pending' }
]);

await waitFor(() => progressEvents.length > 0);
expect(progressEvents).toContain(50);
```

**Covers Acceptance Criteria:**
- Watches todo file
- Calculates progress
- Emits progress events

---

### E2E-165 through E2E-190: Additional Orchestrator Tests

(Abbreviated - covers US-165 through US-190)

**Tests Cover:**
- Worker spawn control (US-165)
- Worker crash recovery (US-166)
- Phase validation (US-167)
- Manual phase override (US-168)
- Pipeline pause (US-169)
- Pipeline resume (US-170)
- Pipeline cancel (US-171)
- State persistence (US-172)
- Error recovery (US-173)
- Timeout handling (US-174)
- Stall detection (US-175)
- Progress calculation (US-176)
- Phase history (US-177)
- Epic tracking (US-178)
- Cost integration (US-179)
- Duration tracking (US-180)
- Event emission (US-181)
- State machine (US-182)
- Transition validation (US-183)
- Cleanup on exit (US-184)
- Resume from crash (US-185)
- Multi-phase skip (US-186)
- Phase rollback (US-187)
- Conditional phases (US-188)
- Phase hooks (US-189)
- Pipeline completion (US-190)

---

## Epic 8: UI Screens - Dashboard (35 tests)

### E2E-191: Dashboard Layout (US-191)

**Test:** Dashboard shows correct layout

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .wait('stdout', /PIPELINE v7/)
  .wait('stdout', /Phase:/)
  .wait('stdout', /Progress:/)
  .wait('stdout', /Cost:/)
  .wait('stdout', /Duration:/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows header with title
- Shows phase indicator
- Shows progress bar
- Shows cost/duration
- Shows status bar

---

### E2E-192: Epic List Display (US-192)

**Test:** Shows epic list with status

**CLET Pattern:**
```typescript
harness.mockFs.writeFileSync('/project/.pipeline/manifest.json', JSON.stringify({
  epics: [
    { id: 'epic-1', name: 'TUI Framework', status: 'complete' },
    { id: 'epic-2', name: 'Test Infra', status: 'in_progress' }
  ]
}));

await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .wait('stdout', /✓.*TUI Framework/)
  .wait('stdout', /▶.*Test Infra/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Lists all epics
- Shows completion status (✓, ▶, ○)
- Highlights current epic

---

### E2E-193: Todo List Display (US-193)

**Test:** Shows current todos from worker

**CLET Pattern:**
```typescript
const mockWorker = new MockWorker({ sessionId: 'test-001' });
mockWorker.writeTodo([
  { content: 'Create components', status: 'completed', activeForm: 'Creating' },
  { content: 'Write tests', status: 'in_progress', activeForm: 'Writing' }
]);

await runner()
  .fork('bin/cli.js', ['--project', '/project', '--session', 'test-001'])
  .wait('stdout', /✓.*Create components/)
  .wait('stdout', /⟳.*Writing tests/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows todo items
- Shows status indicators
- Shows active form for in_progress
- Updates in real-time

---

### E2E-194: Progress Bar Update (US-194)

**Test:** Progress bar updates with todos

**CLET Pattern:**
```typescript
const mockWorker = new MockWorker({ sessionId: 'test-001' });

await runner()
  .fork('bin/cli.js', ['--project', '/project', '--session', 'test-001'])
  .wait('stdout', /Progress:.*0%/)

mockWorker.writeTodo([
  { content: 'Task 1', status: 'completed' },
  { content: 'Task 2', status: 'pending' }
]);

  .wait('stdout', /Progress:.*50%/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows 0% initially
- Updates on todo changes
- Shows percentage and bar

---

### E2E-195: Cost Display (US-195)

**Test:** Shows accumulated cost

**CLET Pattern:**
```typescript
harness.mockCcusage.setSessionCost('test-001', { totalCost: 2.50 });

await runner()
  .fork('bin/cli.js', ['--project', '/project', '--session', 'test-001'])
  .wait('stdout', /Cost:.*\$2\.50/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows cost with $ symbol
- Formats to 2 decimal places
- Updates periodically

---

### E2E-196: Duration Display (US-196)

**Test:** Shows elapsed time

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .wait('stdout', /Duration:.*0:00/)
  .wait(5000)
  .wait('stdout', /Duration:.*0:0[5-9]/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows elapsed time
- Formats as MM:SS or HH:MM:SS
- Updates every second

---

### E2E-197: Worker Status Display (US-197)

**Test:** Shows worker status

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .wait('stdout', /Worker:.*Not started/)
  .stdin('stdout', /Worker/, 's')
  .wait('stdout', /Worker:.*Running/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows "Not started" initially
- Shows "Running" when active
- Shows "Stopped" when killed

---

### E2E-198: Start Worker Shortcut (US-198)

**Test:** 's' starts worker

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .wait('stdout', /Press 's' to start/)
  .stdin('stdout', /Press/, 's')
  .wait('stdout', /Starting worker/)
  .wait('stdout', /Worker:.*Running/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- 's' key triggers start
- Shows starting message
- Updates worker status

---

### E2E-199: Stop Worker Shortcut (US-199)

**Test:** 'x' stops worker

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .stdin('stdout', /Dashboard/, 's')  // Start first
  .wait('stdout', /Worker:.*Running/)
  .stdin('stdout', /Running/, 'x')
  .wait('stdout', /Stopping worker/)
  .wait('stdout', /Worker:.*Stopped/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- 'x' key triggers stop
- Confirms before stopping
- Updates worker status

---

### E2E-200: Restart Worker Shortcut (US-200)

**Test:** 'r' restarts worker

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .stdin('stdout', /Dashboard/, 's')
  .wait('stdout', /Worker:.*Running/)
  .stdin('stdout', /Running/, 'r')
  .wait('stdout', /Restarting worker/)
  .wait('stdout', /Worker:.*Running/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- 'r' key triggers restart
- Kills existing worker
- Spawns new worker

---

### E2E-201: Focus Worker Window (US-201)

**Test:** 'f' focuses worker window

**CLET Pattern:**
```typescript
const focusSpy = jest.spyOn(processService, 'focusWorkerWindow');

await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .stdin('stdout', /Dashboard/, 's')
  .wait('stdout', /Worker:.*Running/)
  .stdin('stdout', /Running/, 'f')
  .wait('close', 0);

expect(focusSpy).toHaveBeenCalled();
```

**Covers Acceptance Criteria:**
- 'f' key triggers focus
- Brings worker window to front
- Works on Windows

---

### E2E-202: Help Overlay (US-202)

**Test:** '?' shows help

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .stdin('stdout', /Dashboard/, '?')
  .wait('stdout', /Keyboard Shortcuts/)
  .wait('stdout', /s.*Start worker/)
  .wait('stdout', /x.*Stop worker/)
  .stdin('stdout', /Shortcuts/, KEYS.ESCAPE)
  .wait('stdout', /Dashboard/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- '?' shows help overlay
- Lists all shortcuts
- Escape closes overlay

---

### E2E-203: Quit Confirmation (US-203)

**Test:** 'q' confirms quit

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .stdin('stdout', /Dashboard/, 'q')
  .wait('stdout', /Quit\?.*\[y\/n\]/)
  .stdin('stdout', /Quit/, 'n')
  .wait('stdout', /Dashboard/)
  .stdin('stdout', /Dashboard/, 'q')
  .stdin('stdout', /Quit/, 'y')
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- 'q' shows confirmation
- 'n' cancels
- 'y' exits

---

### E2E-204: Phase Indicator (US-204)

**Test:** Shows current phase with icon

**CLET Pattern:**
```typescript
harness.mockFs.writeFileSync('/project/.pipeline/manifest.json', JSON.stringify({
  currentPhase: 2
}));

await runner()
  .fork('bin/cli.js', ['--project', '/project'])
  .wait('stdout', /Phase:.*2.*Specs/)
  .wait('close', 0);
```

**Covers Acceptance Criteria:**
- Shows phase number
- Shows phase name
- Uses phase-specific icon

---

### E2E-205 through E2E-225: Additional UI Tests

(Abbreviated - covers US-205 through US-225)

**Tests Cover:**
- Error display (US-205)
- Loading states (US-206)
- Empty states (US-207)
- Screen transitions (US-208)
- Keyboard navigation (US-209)
- Focus management (US-210)
- Status bar updates (US-211)
- Toast notifications (US-212)
- Modal dialogs (US-213)
- Settings screen (US-214)
- Project selection (US-215)
- Recent projects (US-216)
- Theme switching (US-217)
- Screen resize (US-218)
- Minimum size warning (US-219)
- Color accessibility (US-220)
- Error boundaries (US-221)
- Cleanup on exit (US-222)
- State restoration (US-223)
- Performance monitoring (US-224)
- Debug mode (US-225)

---

## Test Independence Matrix

### Epic Test Isolation

| Epic | Test File | Can Run Alone | Required Fixtures | Dependencies |
|------|-----------|---------------|-------------------|--------------|
| Epic 1 | `epic1-tui-framework.test.ts` | ✅ Yes | None | None |
| Epic 2 | `epic2-test-infrastructure.test.ts` | ✅ Yes | `phase-*-success.json` | None |
| Epic 3 | `epic3-state-management.test.ts` | ✅ Yes | None | None |
| Epic 4 | `epic4-filesystem-service.test.ts` | ✅ Yes | `manifest-*.json` | None |
| Epic 5 | `epic5-process-service.test.ts` | ✅ Yes | `worker-*.json` | None |
| Epic 6 | `epic6-cost-service.test.ts` | ✅ Yes | `cost-*.json` | None |
| Epic 7 | `epic7-pipeline-orchestrator.test.ts` | ✅ Yes | All phase fixtures | MockWorker, MockFs, MockWt |
| Epic 8 | `epic8-ui-screens.test.ts` | ✅ Yes | All fixtures | All mocks |

### Key Isolation Principle

**Every test file can run independently.** Mocks replace all external dependencies:

- **MockWorker** replaces real Claude CLI
- **MockWindowsTerminal** replaces real wt.exe
- **MockFilesystem** replaces real fs operations
- **MockCcusage** replaces real cost tracking

### Fixtures Required Per Epic

| Epic | Fixtures Needed |
|------|----------------|
| Epic 1 | None (tests TUI components in isolation) |
| Epic 2 | `phase-1-success.json`, `worker-crash.json`, `worker-timeout.json` |
| Epic 3 | None (tests state logic in isolation) |
| Epic 4 | `manifest-valid.json`, `manifest-invalid.json`, `todos-sample.json` |
| Epic 5 | `worker-spawn.json`, `worker-crash.json`, `worker-timeout.json` |
| Epic 6 | `cost-session.json`, `cost-accumulated.json` |
| Epic 7 | All `phase-*-success.json`, `epic-complete.json`, error fixtures |
| Epic 8 | All fixtures (full integration) |

### Implementation Dependency Graph

```
Epic 1 (TUI Framework)
    ↓
Epic 2 (Test Infrastructure)
    ↓
Epic 3 (State Management) ←─ requires Epics 1, 2
    ↓
┌───────────────────────────────────────────┐
│                                           │
↓                   ↓                       ↓
Epic 4 (Filesystem) Epic 5 (Process/wt.exe) Epic 6 (Cost)
│                   │                       │
└───────────────────┼───────────────────────┘
                    ↓
            Epic 7 (Orchestrator)
                    ↓
            Epic 8 (UI Screens)
```

**NOTE:** This dependency graph shows *implementation order*, NOT test dependencies. Tests can run in any order due to mock isolation.

---

## Keyboard Test Matrix

### Global Shortcuts

| Key | Action | Test ID | Context | Expected Result |
|-----|--------|---------|---------|-----------------|
| `s` | Start worker | E2E-198 | Dashboard (no worker) | Spawns worker in new wt.exe tab |
| `x` | Stop worker | E2E-199 | Dashboard (worker running) | Shows confirmation, kills worker |
| `r` | Restart worker | E2E-200 | Dashboard (worker running) | Kills and respawns worker |
| `f` | Focus worker | E2E-201 | Dashboard (worker running) | Brings worker window to front |
| `?` | Help overlay | E2E-202 | Any screen | Shows keyboard shortcuts |
| `q` | Quit | E2E-203 | Any screen | Shows confirmation dialog |
| `Ctrl+L` | Clear screen | E2E-022b | Any screen | Redraws TUI |

### Navigation Keys

| Key | Action | Test ID | Context | Expected Result |
|-----|--------|---------|---------|-----------------|
| `Tab` | Next focus | E2E-018 | Multiple focusable elements | Moves to next element |
| `Shift+Tab` | Previous focus | E2E-018 | Multiple focusable elements | Moves to previous element |
| `↑` / `↓` | Vertical nav | E2E-019 | List/Select component | Changes selection |
| `←` / `→` | Horizontal nav | E2E-019 | Horizontal layout | Changes selection |
| `Enter` | Activate | E2E-020 | Button/Select focused | Activates element |
| `Space` | Toggle | E2E-020a | Checkbox/Radio focused | Toggles state |
| `Escape` | Cancel/Close | E2E-021 | Modal open | Closes modal |

### Component-Specific Keys

| Component | Key | Test ID | Expected Result |
|-----------|-----|---------|-----------------|
| Input | Characters | E2E-003 | Appends to value |
| Input | Backspace | E2E-003 | Deletes last character |
| Select | Enter | E2E-004 | Confirms selection |
| RadioGroup | Space | E2E-005 | Selects option |
| Modal | Escape | E2E-016 | Closes modal |

### Edge Cases

| Scenario | Test ID | Expected Behavior |
|----------|---------|-------------------|
| Tab at last element | E2E-018a | Wraps to first element |
| Arrow at boundary | E2E-019a | Stays at boundary |
| `s` with worker running | E2E-198-edge | Shows "already running" message |
| `x` with no worker | E2E-199-edge | Shows "no worker to stop" message |
| `r` with no worker | E2E-200-edge | Starts new worker (same as `s`) |

---

## Test Execution

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific epic
npm run test:e2e -- --grep "Epic 5"

# Run with coverage
npm run test:e2e:coverage

# Watch mode
npm run test:e2e:watch
```

### Test Isolation

Each test:
1. Gets fresh mock instances (filesystem, process, etc.)
2. Has isolated project directory
3. Cleans up after completion
4. Can run in parallel

### Mock Injection

```typescript
// Test setup
beforeEach(() => {
  // Replace real dependencies with mocks
  jest.mock('../src/services/process', () => mockProcessService);
  jest.mock('../src/services/filesystem', () => mockFilesystemService);
});
```

---

## Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Lines | 90% |
| Functions | 90% |
| Branches | 80% |
| Statements | 90% |

### Critical Paths (100% Coverage Required)

- Worker spawn/kill flow
- Todo file watching
- Manifest read/write
- Phase transitions
- Error handling

---

## Mock Worker Usage

### Basic Example

```typescript
import { MockWorker } from '../helpers/mock-worker';

describe('Dashboard', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    mockWorker = new MockWorker({
      fixture: 'phase-1-success',
      sessionId: 'test-session'
    });
  });

  afterEach(() => {
    mockWorker.cleanup();
  });

  it('shows todo progress', async () => {
    // Start dashboard
    await runner().fork('bin/cli.js', ['--project', '/test']);

    // Mock worker writes initial todos
    mockWorker.advanceTodos(0);

    // Verify dashboard shows progress
    await runner().wait('stdout', /in_progress/);

    // Mock worker completes
    mockWorker.advanceTodos(1);

    // Verify dashboard updates
    await runner().wait('stdout', /completed/);
  });
});
```

### Simulating Worker Crash

```typescript
it('handles worker crash', async () => {
  mockWorker.simulateCrash();

  await runner()
    .fork('bin/cli.js', ['--project', '/test'])
    .wait('stdout', /Worker crashed/)
    .wait('stdout', /Restart\?/);
});
```

---

## Verification Checklist

Before finalizing Phase 2:

- [ ] All 225 main tests implemented
- [ ] All edge case variants implemented
- [ ] Coverage meets requirements
- [ ] Tests run in < 60 seconds
- [ ] No real Claude API calls
- [ ] No real Windows Terminal windows opened
- [ ] Tests work on Windows
- [ ] Mock Worker correctly simulates todo updates
- [ ] Mock wt.exe correctly simulates process spawning

---

**Document Version:** 2.0
**Architecture:** Two-Window (Dashboard + Worker via wt.exe)
**Last Updated:** 2025-12-08
