# E2E Test Specifications

**Project:** Pipeline v7
**Type:** Terminal/TUI Application
**Date:** 2025-12-07
**Total Tests:** 286 main tests + 572 edge case variants
**Coverage:** 100%

---

## Testing Strategy

### Framework Stack
- **E2E Framework:** CLET (Command Line E2E Testing)
- **TTY Emulation:** node-pty
- **Unit Tests:** ink-testing-library + Vitest
- **Mocking:** Custom Mock Claude binary, Mock PTY, Mock Filesystem

### Mock Claude Pattern
For tests involving Claude CLI worker processes:
- Mock binary: `tests/e2e/helpers/mock-claude.js`
- Fixtures: `tests/e2e/fixtures/*.json`
- **NEVER call real Claude CLI in tests**

### Test File Structure
```
tests/
├── e2e/
│   ├── helpers/
│   │   ├── mock-claude.js         # Mock Claude binary
│   │   ├── mock-pty.ts            # Mock PTY emulator
│   │   ├── mock-fs.ts             # Mock filesystem
│   │   ├── test-harness.ts        # Test setup/teardown
│   │   └── assertions.ts          # Custom TUI assertions
│   ├── fixtures/
│   │   ├── phase-1-success.json   # Brainstorm phase fixture
│   │   ├── phase-2-success.json   # Specs phase fixture
│   │   ├── phase-3-success.json   # Bootstrap phase fixture
│   │   ├── phase-4-success.json   # Implement phase fixture
│   │   ├── phase-5-success.json   # Finalize phase fixture
│   │   ├── epic-1-complete.json   # Epic completion fixture
│   │   ├── claude-timeout.json    # Timeout error fixture
│   │   ├── claude-crash.json      # Crash error fixture
│   │   └── resume-mid-epic.json   # Resume scenario fixture
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

## Epic 1: TUI Framework (30 tests)

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
- E2E-001d: Box with round border style → Uses rounded corners

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
- E2E-002c: Text with hex color → Converts to nearest ANSI color

**Covers Acceptance Criteria:**
- Renders text content
- Supports color prop (named colors, hex)
- Supports bold, italic, underline, strikethrough
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
- E2E-003c: Input with special characters → Renders correctly

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
  .wait('stdout', /  Option 3/)
  .stdin('stdout', /Option 1/, KEYS.DOWN)
  .wait('stdout', /  Option 1/)
  .wait('stdout', /► Option 2/)  // Selection moved down
  .stdin('stdout', /Option 2/, KEYS.ENTER)
  .wait('stdout', /Selected: Option 2/)
  .wait('close', 0);
```

**Keyboard Sequence:**
1. Render → First option highlighted with ►
2. Down arrow → Selection moves to next
3. Enter → Option selected, callback fires

**Edge Cases:**
- E2E-004a: Select with disabled option → Skips disabled on navigation
- E2E-004b: Select at last option + Down → Stays at last (no wrap by default)
- E2E-004c: Select with single option → Option pre-selected

**Covers Acceptance Criteria:**
- Displays list of options
- Shows current selection indicator (►)
- Navigates with arrow keys
- Selects with Enter
- Calls onChange with selected value
- Supports disabled options

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
- E2E-005b: RadioGroup Enter key → Selects current option

**Covers Acceptance Criteria:**
- Displays options with radio indicators (○/●)
- Only one option selected at a time
- Navigates with arrow keys
- Selects with Enter or Space
- Calls onChange with selected value

---

### E2E-006: Checkbox Component (US-006)

**Test:** Checkbox component toggles state

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'checkbox'])
  .wait('stdout', /☐ Enable feature/)  // Unchecked
  .stdin('stdout', /Enable feature/, KEYS.SPACE)
  .wait('stdout', /☑ Enable feature/)  // Checked
  .stdin('stdout', /Enable feature/, KEYS.ENTER)
  .wait('stdout', /☐ Enable feature/)  // Unchecked again
  .wait('close', 0);
```

**Edge Cases:**
- E2E-006a: Checkbox initially checked → Shows ☑
- E2E-006b: Checkbox disabled → Cannot toggle

**Covers Acceptance Criteria:**
- Displays checkbox indicator (☐/☑)
- Toggles with Enter or Space
- Supports label text
- Calls onChange with boolean value

---

### E2E-007: Button Component (US-007)

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
- E2E-007a: Button disabled → Does not respond to Enter
- E2E-007b: Button focused → Shows inverse/highlight style

**Covers Acceptance Criteria:**
- Displays button text
- Shows focus state (border or inverse)
- Activates with Enter
- Supports disabled state
- Calls onPress callback

---

### E2E-008: Progress Bar Component (US-008)

**Test:** Progress bar displays completion

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'progress', '--value', '50'])
  .wait('stdout', /████████░░░░░░░░ 50%/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-008a: Progress at 0% → Shows empty bar
- E2E-008b: Progress at 100% → Shows full bar
- E2E-008c: Progress with custom width → Adjusts bar length

**Covers Acceptance Criteria:**
- Displays progress as filled bar (████░░░░)
- Shows percentage value
- Accepts value prop (0-100)
- Configurable width
- Configurable fill/empty characters

---

### E2E-009: Spinner Component (US-009)

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
- E2E-009a: Spinner with different type → Uses different frames
- E2E-009b: Spinner stopped → Shows static character

**Covers Acceptance Criteria:**
- Animates through spinner frames
- Supports different spinner types (dots, line, arc)
- Displays optional label text
- Can be stopped/started

---

### E2E-010: Divider Component (US-010)

**Test:** Divider renders horizontal line

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'divider'])
  .wait('stdout', /─{10,}/)  // At least 10 dashes
  .wait('close', 0);
```

**Edge Cases:**
- E2E-010a: Divider with title → Shows ── Title ──
- E2E-010b: Divider with double style → Uses ═ characters

**Covers Acceptance Criteria:**
- Renders horizontal line
- Supports different line styles (─, ═, -)
- Fills available width
- Supports optional title in middle

---

### E2E-011: Spacer Component (US-011)

**Test:** Spacer expands to fill space

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'spacer'])
  .wait('stdout', /Left.*Right/)  // Items pushed apart
  .wait('close', 0);
```

**Edge Cases:**
- E2E-011a: Spacer in column layout → Fills vertical space

**Covers Acceptance Criteria:**
- Expands to fill available space
- Works in both row and column flex directions

---

### E2E-012: Badge Component (US-012)

**Test:** Badge displays status indicator

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'badge', '--variant', 'success'])
  .wait('stdout', /\x1b\[42m.*SUCCESS.*\x1b\[49m/)  // Green background
  .wait('close', 0);
```

**Edge Cases:**
- E2E-012a: Badge error variant → Red background
- E2E-012b: Badge warning variant → Yellow background
- E2E-012c: Badge custom color → Uses specified color

**Covers Acceptance Criteria:**
- Displays short text in colored background
- Supports predefined variants (success, error, warning, info)
- Supports custom colors

---

### E2E-013: Table Component (US-013)

**Test:** Table displays tabular data

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'table'])
  .wait('stdout', /│ Name.*│ Age.*│/)  // Headers
  .wait('stdout', /├.*┼.*┤/)           // Row separator
  .wait('stdout', /│ Alice.*│ 30.*│/)  // Data row
  .wait('close', 0);
```

**Edge Cases:**
- E2E-013a: Table with empty data → Shows headers only
- E2E-013b: Table with right-aligned column → Numbers aligned right

**Covers Acceptance Criteria:**
- Renders headers and rows
- Aligns columns (left, center, right)
- Supports column widths (fixed, auto)
- Draws borders between cells

---

### E2E-014: List Component (US-014)

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
- E2E-014a: List with numbered prefix → Shows 1. 2. 3.
- E2E-014b: List exceeding height → Shows scroll indicator

**Covers Acceptance Criteria:**
- Renders list items
- Supports item prefixes (•, -, numbers)
- Scrolls when items exceed height
- Shows scroll indicator

---

### E2E-015: useInput Hook (US-015)

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
  .stdin('stdout', /Arrow:/, KEYS.CTRL_C)
  .wait('stdout', /Ctrl\+C detected/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-015a: useInput with inactive flag → Does not receive input
- E2E-015b: useInput with escape → Reports escape key

**Covers Acceptance Criteria:**
- Receives character input
- Receives special key info (arrow, enter, escape, tab)
- Receives modifier keys (ctrl, shift, meta)
- Can be conditionally active

---

### E2E-016: useApp Hook (US-016)

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
- E2E-016a: useApp clear() → Screen clears

**Covers Acceptance Criteria:**
- Provides exit() function
- Provides clear() function for screen
- Exposes app dimensions

---

### E2E-017: useFocus Hook (US-017)

**Test:** useFocus hook manages focus state

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-hook', 'useFocus'])
  .wait('stdout', /Field 1.*\[focused\]/)
  .stdin('stdout', /Field 1/, KEYS.TAB)
  .wait('stdout', /Field 2.*\[focused\]/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-017a: useFocus programmatic focus → focus() moves focus

**Covers Acceptance Criteria:**
- Returns isFocused boolean
- Provides focus() function
- Works with Tab navigation

---

### E2E-018: useFocusManager Hook (US-018)

**Test:** useFocusManager controls focus programmatically

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-hook', 'useFocusManager'])
  .wait('stdout', /Focus: field1/)
  .stdin('stdout', /field1/, 'n')  // Next focus
  .wait('stdout', /Focus: field2/)
  .stdin('stdout', /field2/, 'p')  // Previous focus
  .wait('stdout', /Focus: field1/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-018a: focusManager focus(id) → Jumps to specific element

**Covers Acceptance Criteria:**
- Provides focusNext() function
- Provides focusPrevious() function
- Provides focus(id) function
- Tracks current focus id

---

### E2E-019: Screen Container Component (US-019)

**Test:** Screen component creates full-screen view

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'screen'])
  .wait('stdout', /═{20,}/)  // Header bar
  .wait('stdout', /Screen Content/)
  .wait('stdout', /Status bar/)  // Footer
  .wait('close', 0);
```

**Edge Cases:**
- E2E-019a: Screen with scroll → Content scrollable

**Covers Acceptance Criteria:**
- Fills terminal dimensions
- Provides header/footer areas
- Manages internal scroll
- Clears previous content

---

### E2E-020: Modal Component (US-020)

**Test:** Modal renders overlay dialog

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'modal'])
  .wait('stdout', /┌.*Modal Title.*┐/)
  .wait('stdout', /│.*Content.*│/)
  .stdin('stdout', /Content/, KEYS.ESCAPE)
  .wait('stdout', /Modal closed/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-020a: Modal captures Tab focus → Tab stays within modal
- E2E-020b: Modal with buttons → Tab cycles buttons

**Covers Acceptance Criteria:**
- Renders on top of content
- Captures keyboard focus
- Has visible border
- Closes with Escape
- Calls onClose callback

---

### E2E-021: Toast Component (US-021)

**Test:** Toast shows temporary message

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'toast'])
  .wait('stdout', /✓ Operation successful/)
  .wait(2000)  // Wait for auto-dismiss
  .wait('stdout', /Toast dismissed/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-021a: Toast error type → Shows with red styling
- E2E-021b: Toast manual dismiss → Dismisses on keypress

**Covers Acceptance Criteria:**
- Displays message at screen edge
- Auto-dismisses after timeout
- Supports different types (info, success, error)
- Can be manually dismissed

---

### E2E-022: Split Pane Layout (US-022)

**Test:** SplitPane divides space into two panes

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'splitpane'])
  .wait('stdout', /Left Pane.*│.*Right Pane/)
  .stdin('stdout', /Pane/, KEYS.RIGHT)
  .wait('stdout', /Resize: 55%/)  // Right arrow increased right pane
  .wait('close', 0);
```

**Edge Cases:**
- E2E-022a: SplitPane vertical → Top/bottom split
- E2E-022b: SplitPane at minimum → Cannot resize further

**Covers Acceptance Criteria:**
- Divides space into two panes
- Supports horizontal and vertical split
- Allows resizing with arrow keys
- Maintains minimum pane sizes

---

### E2E-023: StatusBar Component (US-023)

**Test:** StatusBar shows persistent information

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'statusbar'])
  .wait('stdout', /\[q\] Quit.*\[\\?\] Help/)  // Key hints at bottom
  .wait('close', 0);
```

**Edge Cases:**
- E2E-023a: StatusBar with left/right sections → Content aligned

**Covers Acceptance Criteria:**
- Renders at screen bottom
- Shows key hints
- Updates dynamically
- Supports left/right sections

---

### E2E-024: Scrollable Component (US-024)

**Test:** Scrollable handles content overflow

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'scrollable'])
  .wait('stdout', /Line 1/)
  .wait('stdout', /▼/)  // Scroll indicator
  .stdin('stdout', /Line 1/, KEYS.DOWN)
  .wait('stdout', /Line 2/)  // Scrolled down
  .wait('close', 0);
```

**Edge Cases:**
- E2E-024a: Scrollable at top → No up scroll indicator
- E2E-024b: Scrollable programmatic scroll → scrollTo(index) works

**Covers Acceptance Criteria:**
- Shows visible portion of content
- Scrolls with arrow keys when focused
- Shows scroll position indicator
- Supports programmatic scroll-to

---

### E2E-025: Form Component (US-025)

**Test:** Form groups and validates fields

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-component', 'form'])
  .wait('stdout', /Name:.*\|/)
  .stdin('stdout', /Name:/, 'John')
  .stdin('stdout', /John/, KEYS.TAB)
  .wait('stdout', /Email:.*\|/)  // Focus moved
  .stdin('stdout', /Email:/, 'invalid')
  .stdin('stdout', /invalid/, KEYS.ENTER)
  .wait('stdout', /Error: Invalid email/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-025a: Form with all valid → Submits successfully
- E2E-025b: Form Shift+Tab → Moves focus backward

**Covers Acceptance Criteria:**
- Manages field focus with Tab
- Validates on submit
- Shows validation errors
- Calls onSubmit with values

---

### E2E-026: Tab Navigation (US-026)

**Test:** Tab navigates between focusable elements

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-navigation', 'tab'])
  .wait('stdout', /Button1.*\[focused\]/)
  .stdin('stdout', /Button1/, KEYS.TAB)
  .wait('stdout', /Button2.*\[focused\]/)
  .stdin('stdout', /Button2/, KEYS.SHIFT_TAB)
  .wait('stdout', /Button1.*\[focused\]/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-026a: Tab at last element → Wraps to first
- E2E-026b: Tab skips non-focusable → Jumps over static text

**Covers Acceptance Criteria:**
- Tab moves to next focusable
- Shift+Tab moves to previous
- Focus wraps at boundaries
- Non-focusable elements skipped

---

### E2E-027: Arrow Key Navigation (US-027)

**Test:** Arrow keys navigate within components

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-navigation', 'arrows'])
  .wait('stdout', /► Item 1/)
  .stdin('stdout', /Item 1/, KEYS.DOWN)
  .wait('stdout', /► Item 2/)
  .stdin('stdout', /Item 2/, KEYS.UP)
  .wait('stdout', /► Item 1/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-027a: Down at last item → Stays at last (no wrap)
- E2E-027b: Arrow with wrap enabled → Wraps to opposite end

**Covers Acceptance Criteria:**
- Up/Down for vertical lists
- Left/Right for horizontal layouts
- Stops at boundaries (no wrap by default)
- Configurable wrap behavior

---

### E2E-028: Enter/Space Activation (US-028)

**Test:** Enter and Space activate focused elements

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-navigation', 'activation'])
  .wait('stdout', /\[ Button \]/)
  .stdin('stdout', /Button/, KEYS.ENTER)
  .wait('stdout', /Button activated!/)
  .wait('stdout', /☐ Checkbox/)
  .stdin('stdout', /Checkbox/, KEYS.SPACE)
  .wait('stdout', /☑ Checkbox/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-028a: Enter on disabled button → No activation

**Covers Acceptance Criteria:**
- Enter activates buttons
- Space toggles checkboxes
- Enter selects list items
- Appropriate callback called

---

### E2E-029: Escape Cancellation (US-029)

**Test:** Escape cancels current context

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-navigation', 'escape'])
  .wait('stdout', /Modal Content/)
  .stdin('stdout', /Modal/, KEYS.ESCAPE)
  .wait('stdout', /Modal closed/)
  .wait('stdout', /Main Screen/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-029a: Escape at top level → Shows quit confirmation

**Covers Acceptance Criteria:**
- Closes modals
- Cancels dialogs
- Returns to previous screen
- Appropriate callback called

---

### E2E-030: Global Keyboard Shortcuts (US-030)

**Test:** Global shortcuts work from any screen

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-navigation', 'global'])
  .wait('stdout', /Main Screen/)
  .stdin('stdout', /Main/, '?')
  .wait('stdout', /KEYBOARD SHORTCUTS/)  // Help overlay
  .stdin('stdout', /SHORTCUTS/, KEYS.ESCAPE)
  .wait('stdout', /Main Screen/)
  .stdin('stdout', /Main/, 'q')
  .wait('stdout', /Quit\? \[y\/n\]/)
  .stdin('stdout', /Quit/, 'n')
  .wait('stdout', /Main Screen/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-030a: Ctrl+L clears screen → Screen redraws
- E2E-030b: q with unsaved changes → Shows warning

**Covers Acceptance Criteria:**
- q shows quit confirmation
- ? shows help overlay
- Ctrl+L clears screen
- Shortcuts work from any screen

---

## Epic 2: Test Infrastructure (40 tests)

### E2E-031: Mock Claude Binary (US-031)

**Test:** Mock Claude binary executes from fixture

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'tests/e2e/fixtures/phase-3-success.json';
await runner()
  .fork('tests/e2e/helpers/mock-claude.js')
  .wait('stdout', /\[TODO\] Reading docs/)
  .wait('stdout', /\[TODO\] Creating project skeleton/)
  .wait('close', 0);
```

**Mock Fixture:** `mock-claude-basic.json`

**Edge Cases:**
- E2E-031a: Missing fixture file → Exits with error code 1
- E2E-031b: Invalid fixture JSON → Exits with error code 2

**Covers Acceptance Criteria:**
- Executes as standalone Node script
- Reads fixture file from environment variable
- Outputs lines from fixture with timing
- Exits with code from fixture

---

### E2E-032: Mock Claude Output Streaming (US-032)

**Test:** Mock Claude streams output with timing

**CLET Pattern:**
```typescript
const startTime = Date.now();
process.env.MOCK_CLAUDE_FIXTURE = 'streaming-fixture.json';
await runner()
  .fork('tests/e2e/helpers/mock-claude.js')
  .wait('stdout', /Line 1/)
  .wait('stdout', /Line 2/);  // Should appear after delay
const elapsed = Date.now() - startTime;
expect(elapsed).toBeGreaterThan(100);  // Timing respected
```

**Mock Fixture:** `streaming-fixture.json`

**Edge Cases:**
- E2E-032a: Fixture with 0 delay → Outputs immediately
- E2E-032b: Fixture with stderr → Outputs to stderr

**Covers Acceptance Criteria:**
- Outputs lines sequentially
- Respects timing delays from fixture
- Supports JSON progress markers
- Streams to stdout/stderr appropriately

---

### E2E-033: Mock Claude Todo File Updates (US-033)

**Test:** Mock Claude updates todo files

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'todo-update-fixture.json';
process.env.PIPELINE_SESSION_ID = 'test-session-123';
await runner()
  .fork('tests/e2e/helpers/mock-claude.js')
  .wait('stdout', /\[TODO\]/)
  .wait('close', 0);

// Verify todo file was created
const todoPath = path.join(os.homedir(), '.claude/todos/test-session-123.json');
expect(fs.existsSync(todoPath)).toBe(true);
```

**Mock Fixture:** `todo-update-fixture.json`

**Edge Cases:**
- E2E-033a: Multiple todo updates → Each update reflected in file
- E2E-033b: Todo directory missing → Creates directory

**Covers Acceptance Criteria:**
- Creates todo files at specified timestamps
- Updates todo content per fixture
- Uses correct file path pattern
- Triggers filesystem watch events

---

### E2E-034: Mock Claude Exit Codes (US-034)

**Test:** Mock Claude exits with configurable codes

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'exit-code-1.json';
await runner()
  .fork('tests/e2e/helpers/mock-claude.js')
  .wait('close', 1);  // Exit code 1 expected
```

**Mock Fixture:** `exit-code-1.json`

**Edge Cases:**
- E2E-034a: Timeout simulation → Process exits after delay
- E2E-034b: Crash simulation → Process exits immediately with code
- E2E-034c: SIGINT simulation → Process handles interrupt

**Covers Acceptance Criteria:**
- Exits with code from fixture (0, 1, etc.)
- Supports timeout simulation
- Supports crash simulation
- Supports interrupt simulation

---

### E2E-035: Fixture File Format (US-035)

**Test:** Fixture format is validated

**CLET Pattern:**
```typescript
// Test fixture validation utility
const result = validateFixture('tests/e2e/fixtures/phase-3-success.json');
expect(result.valid).toBe(true);
expect(result.errors).toHaveLength(0);
```

**Edge Cases:**
- E2E-035a: Fixture missing required field → Validation error
- E2E-035b: Fixture with wrong types → Type validation error

**Covers Acceptance Criteria:**
- JSON format with schema validation
- output[] array for stdout lines
- todoStates[] array for todo updates
- finalState object for exit behavior
- Timing fields in milliseconds

---

### E2E-036: Phase-Specific Fixtures (US-036)

**Test:** Phase fixtures exist and validate

**CLET Pattern:**
```typescript
const phases = ['phase-1-success', 'phase-2-success', 'phase-3-success',
                'phase-4-success', 'phase-5-success'];
for (const phase of phases) {
  const result = validateFixture(`tests/e2e/fixtures/${phase}.json`);
  expect(result.valid).toBe(true);
}
```

**Edge Cases:**
- E2E-036a: Phase 4 fixture has epic loop data → Contains epic progression

**Covers Acceptance Criteria:**
- phase-1-success.json (brainstorm)
- phase-2-success.json (specs)
- phase-3-success.json (bootstrap)
- phase-4-success.json (implement)
- phase-5-success.json (finalize)

---

### E2E-037: Error Scenario Fixtures (US-037)

**Test:** Error fixtures exist and are valid

**CLET Pattern:**
```typescript
const errors = ['claude-timeout', 'claude-crash', 'claude-context-limit',
                'claude-api-error', 'claude-permission-error'];
for (const error of errors) {
  const result = validateFixture(`tests/e2e/fixtures/${error}.json`);
  expect(result.valid).toBe(true);
  expect(result.data.finalState.exitCode).not.toBe(0);
}
```

**Edge Cases:**
- E2E-037a: Timeout fixture has delay → Simulates actual timeout

**Covers Acceptance Criteria:**
- claude-timeout.json
- claude-crash.json
- claude-context-limit.json
- claude-api-error.json
- claude-permission-error.json

---

### E2E-038: Epic Loop Fixtures (US-038)

**Test:** Epic fixtures support looping

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'epic-transition.json';
await runner()
  .fork('tests/e2e/helpers/mock-claude.js')
  .wait('stdout', /Epic 1 complete/)
  .wait('stdout', /Starting Epic 2/)
  .wait('close', 0);
```

**Mock Fixture:** `epic-transition.json`

**Edge Cases:**
- E2E-038a: All epics complete → Advances to next phase

**Covers Acceptance Criteria:**
- epic-1-complete.json
- epic-2-complete.json
- epic-transition.json
- all-epics-complete.json

---

### E2E-039: Resume Scenario Fixtures (US-039)

**Test:** Resume fixtures support continuation

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'resume-mid-epic.json';
await runner()
  .fork('tests/e2e/helpers/mock-claude.js')
  .wait('stdout', /Resuming Epic 2/)
  .wait('stdout', /Continuing from todo 3/)
  .wait('close', 0);
```

**Mock Fixture:** `resume-mid-epic.json`

**Edge Cases:**
- E2E-039a: Resume with cost recalc → Shows updated cost

**Covers Acceptance Criteria:**
- resume-phase-4.json
- resume-mid-epic.json
- resume-after-crash.json
- resume-with-cost-recalc.json

---

### E2E-040: Mock PTY Emulator (US-040)

**Test:** Mock PTY provides node-pty API

**CLET Pattern:**
```typescript
const pty = new MockPTY();
const proc = pty.spawn('echo', ['hello']);
proc.onData((data) => {
  expect(data).toContain('hello');
});
await waitForExit(proc);
```

**Edge Cases:**
- E2E-040a: Mock PTY with dimensions → Reports cols/rows

**Covers Acceptance Criteria:**
- Provides spawn() function matching node-pty API
- Captures stdin writes
- Emits stdout data events
- Simulates terminal dimensions

---

### E2E-041: Mock PTY Input Simulation (US-041)

**Test:** Mock PTY accepts keyboard input

**CLET Pattern:**
```typescript
const pty = new MockPTY();
const proc = pty.spawn('bin/cli.js');
proc.write('hello');
proc.write(KEYS.ENTER);
expect(pty.getInputHistory()).toContain('hello\r');
```

**Edge Cases:**
- E2E-041a: Mock PTY special keys → Arrow codes sent correctly
- E2E-041b: Mock PTY Ctrl+C → Sends SIGINT character

**Covers Acceptance Criteria:**
- write() function for character input
- Supports special keys (arrows, enter, escape)
- Supports modifier combinations
- Records input history

---

### E2E-042: Mock PTY Output Capture (US-042)

**Test:** Mock PTY captures output

**CLET Pattern:**
```typescript
const pty = new MockPTY();
const proc = pty.spawn('bin/cli.js');
await pty.waitFor(/Welcome/);  // Wait for pattern
await pty.waitFor(/Menu/, 5000);  // With timeout
const output = pty.getOutput();
expect(output).toContain('Welcome');
```

**Edge Cases:**
- E2E-042a: waitFor timeout → Throws timeout error
- E2E-042b: Regex matching → Captures groups

**Covers Acceptance Criteria:**
- Captures all stdout data
- Provides waitFor(pattern) function
- Supports regex matching
- Supports timeout on wait

---

### E2E-043: Mock PTY Resize Events (US-043)

**Test:** Mock PTY simulates resize

**CLET Pattern:**
```typescript
const pty = new MockPTY({ cols: 80, rows: 24 });
const proc = pty.spawn('bin/cli.js');
pty.resize(120, 40);
expect(pty.dimensions).toEqual({ cols: 120, rows: 40 });
```

**Edge Cases:**
- E2E-043a: Resize emits event → Process receives SIGWINCH equivalent

**Covers Acceptance Criteria:**
- resize(cols, rows) function
- Emits resize event
- Updates dimensions property

---

### E2E-044: Mock Filesystem Module (US-044)

**Test:** Mock filesystem isolates file operations

**CLET Pattern:**
```typescript
const mockFs = new MockFilesystem();
mockFs.writeFileSync('/test/file.txt', 'content');
expect(mockFs.readFileSync('/test/file.txt')).toBe('content');
expect(mockFs.getOperationHistory()).toHaveLength(2);
```

**Edge Cases:**
- E2E-044a: Pre-populated filesystem → Files exist before test

**Covers Acceptance Criteria:**
- In-memory file storage
- Provides fs API compatible methods
- Tracks all read/write operations
- Can be pre-populated for tests

---

### E2E-045: Mock Filesystem File Operations (US-045)

**Test:** Mock filesystem handles files

**CLET Pattern:**
```typescript
const mockFs = new MockFilesystem();
mockFs.writeFile('/manifest.json', JSON.stringify({ version: '7.0.0' }));
const content = await mockFs.readFile('/manifest.json');
expect(JSON.parse(content)).toHaveProperty('version', '7.0.0');
```

**Edge Cases:**
- E2E-045a: Read missing file → Throws ENOENT
- E2E-045b: Sync variants → Work synchronously

**Covers Acceptance Criteria:**
- readFile returns mock content
- writeFile stores to memory
- Supports sync and async variants
- Tracks operation history

---

### E2E-046: Mock Filesystem Directory Operations (US-046)

**Test:** Mock filesystem handles directories

**CLET Pattern:**
```typescript
const mockFs = new MockFilesystem();
mockFs.mkdirSync('/project/.pipeline', { recursive: true });
expect(mockFs.existsSync('/project/.pipeline')).toBe(true);
const entries = mockFs.readdirSync('/project');
expect(entries).toContain('.pipeline');
```

**Edge Cases:**
- E2E-046a: mkdir existing → No error with recursive flag
- E2E-046b: rmdir non-empty → Fails without recursive

**Covers Acceptance Criteria:**
- mkdir creates directory
- readdir lists contents
- existsSync checks existence
- rmdir removes directory

---

### E2E-047: Mock Filesystem Watch (US-047)

**Test:** Mock filesystem emits watch events

**CLET Pattern:**
```typescript
const mockFs = new MockFilesystem();
const changes = [];
const watcher = mockFs.watch('/todos', (event, filename) => {
  changes.push({ event, filename });
});
mockFs.writeFileSync('/todos/session-123.json', '[]');
expect(changes).toContainEqual({ event: 'change', filename: 'session-123.json' });
watcher.close();
```

**Edge Cases:**
- E2E-047a: Programmatic trigger → triggerWatch() fires callback

**Covers Acceptance Criteria:**
- watch() returns watcher object
- Emits change events on file updates
- Can be triggered programmatically
- close() stops watching

---

### E2E-048: Mock ccusage Integration (US-048)

**Test:** Mock ccusage returns fixture data

**CLET Pattern:**
```typescript
const mockCcusage = new MockCcusage();
mockCcusage.setFixture({
  sessions: [{ cost: 2.45, duration: 1800 }]
});
const result = mockCcusage.query({ projectPath: '/test' });
expect(result.totalCost).toBe(2.45);
```

**Edge Cases:**
- E2E-048a: Empty sessions → Returns zero cost
- E2E-048b: Session filtering → Only matching sessions

**Covers Acceptance Criteria:**
- Returns fixture cost data
- Supports session filtering
- Returns duration data
- Simulates recalculation

---

### E2E-049: Test Harness Setup (US-049)

**Test:** Test harness provides consistent setup

**CLET Pattern:**
```typescript
describe('Feature', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = new TestHarness();
    harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it('has fresh state', () => {
    expect(harness.mockFs.getOperationHistory()).toHaveLength(0);
  });
});
```

**Edge Cases:**
- E2E-049a: Setup failure → Test skipped with clear error

**Covers Acceptance Criteria:**
- beforeEach resets all mocks
- afterEach cleans up resources
- Provides test utilities
- Sets up mock environment variables

---

### E2E-050: CLET Test Runner Integration (US-050)

**Test:** CLET runner works with application

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js')
  .wait('stdout', /Welcome to Pipeline v7/)
  .stdin('stdout', /Welcome/, 'q')
  .wait('stdout', /Goodbye/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-050a: Runner with timeout → Fails after specified time

**Covers Acceptance Criteria:**
- runner() function available
- fork() spawns CLI
- wait() for output patterns
- stdin() for input simulation

---

### E2E-051: Test Assertions for TUI (US-051)

**Test:** TUI-specific assertions work

**CLET Pattern:**
```typescript
const output = await captureOutput('bin/cli.js');
expect(output).toContainText('Welcome');
expect(output).toShowScreen('Launcher');
expect(output).toHaveFocus('pathInput');
```

**Edge Cases:**
- E2E-051a: Assertion failure → Clear error message

**Covers Acceptance Criteria:**
- toContainText(pattern)
- toShowScreen(name)
- toHaveFocus(elementId)
- toShowProgress(percent)

---

### E2E-052: Test Assertions for State (US-052)

**Test:** State assertions work

**CLET Pattern:**
```typescript
const state = getStoreState();
expect(state).toHaveManifestPhase(4);
expect(state).toHaveEpicStatus('epic-2', 'in-progress');
expect(state).toHaveTodoCount(5);
expect(state).toHaveCost(2.45);
```

**Edge Cases:**
- E2E-052a: State mismatch → Shows diff in error

**Covers Acceptance Criteria:**
- toHaveManifestPhase(n)
- toHaveEpicStatus(epicId, status)
- toHaveTodoCount(n)
- toHaveCost(amount)

---

### E2E-053: Test Timing Utilities (US-053)

**Test:** Timing utilities control time

**CLET Pattern:**
```typescript
jest.useFakeTimers();
const promise = waitForTimeout(1000);
jest.advanceTimersByTime(1000);
await flushPromises();
expect(promise).resolves.toBeUndefined();
```

**Edge Cases:**
- E2E-053a: runAllTimers clears queue → All timers fire

**Covers Acceptance Criteria:**
- advanceTimers(ms) function
- runAllTimers() function
- waitFor(condition) utility
- flushPromises() function

---

### E2E-054: Mock Environment Setup (US-054)

**Test:** Mock environment variables set

**CLET Pattern:**
```typescript
const harness = new TestHarness();
harness.setup();
expect(process.env.MOCK_CLAUDE_FIXTURE).toBeDefined();
expect(process.env.USE_MOCK_CLAUDE).toBe('true');
harness.teardown();
expect(process.env.MOCK_CLAUDE_FIXTURE).toBeUndefined();
```

**Edge Cases:**
- E2E-054a: Multiple tests → Each has isolated env

**Covers Acceptance Criteria:**
- Set MOCK_CLAUDE_FIXTURE path
- Set USE_MOCK_CLAUDE=true
- Set test project path
- Restore after test

---

### E2E-055: Snapshot Testing for TUI (US-055)

**Test:** Snapshot captures terminal output

**CLET Pattern:**
```typescript
const output = await captureOutput('bin/cli.js', ['--screen', 'launcher']);
expect(output).toMatchSnapshot();
```

**Edge Cases:**
- E2E-055a: Snapshot update → --updateSnapshot flag works
- E2E-055b: ANSI stripping → Compares without colors

**Covers Acceptance Criteria:**
- Capture terminal output snapshot
- Compare against saved snapshot
- Update snapshots on change
- Strip ANSI codes for comparison

---

### E2E-056: Test Coverage Reporting (US-056)

**Test:** Coverage reports generated

**CLET Pattern:**
```typescript
// Run tests with coverage
// Check coverage thresholds
const coverage = readCoverageReport();
expect(coverage.lines).toBeGreaterThan(80);
expect(coverage.branches).toBeGreaterThan(75);
```

**Edge Cases:**
- E2E-056a: Uncovered file → Listed in report

**Covers Acceptance Criteria:**
- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Uncovered lines highlighted

---

### E2E-057: Test Isolation Verification (US-057)

**Test:** Tests are isolated from each other

**CLET Pattern:**
```typescript
describe('Isolation', () => {
  it('first test sets state', () => {
    globalMock.setValue('test1');
  });

  it('second test has fresh state', () => {
    expect(globalMock.getValue()).toBeUndefined();
  });
});
```

**Edge Cases:**
- E2E-057a: Parallel execution → No interference

**Covers Acceptance Criteria:**
- Each test has fresh mock state
- No shared mutable state
- Cleanup after each test
- Parallel test execution works

---

### E2E-058: Fixture Validation (US-058)

**Test:** Invalid fixtures are caught

**CLET Pattern:**
```typescript
const result = validateFixture('invalid-fixture.json');
expect(result.valid).toBe(false);
expect(result.errors[0]).toContain('missing required field: output');
```

**Edge Cases:**
- E2E-058a: Type validation → Wrong type reported
- E2E-058b: Nested validation → Deep errors caught

**Covers Acceptance Criteria:**
- JSON schema validation
- Required fields checked
- Type validation
- Error messages for invalid fixtures

---

### E2E-059: Test Helper Functions (US-059)

**Test:** Helper functions simplify tests

**CLET Pattern:**
```typescript
const project = createMockProject({ name: 'test-app' });
const manifest = createMockManifest({ currentPhase: 4 });
await simulatePhaseComplete(harness, 3);
expect(manifest.phases['3'].status).toBe('complete');
```

**Edge Cases:**
- E2E-059a: Helper with invalid options → Throws clear error

**Covers Acceptance Criteria:**
- createMockProject() helper
- createMockManifest() helper
- simulatePhaseComplete() helper
- simulateEpicComplete() helper

---

### E2E-060: Test Data Factories (US-060)

**Test:** Factories create test data

**CLET Pattern:**
```typescript
const manifest = buildManifest({ currentPhase: 4 });
const project = buildProject({ type: 'terminal' });
const todo = buildTodo({ status: 'completed' });
expect(manifest.version).toBe('7.0.0');  // Has defaults
```

**Edge Cases:**
- E2E-060a: Factory override → Custom values applied

**Covers Acceptance Criteria:**
- buildManifest() factory
- buildProject() factory
- buildTodo() factory
- buildWorker() factory

---

### E2E-061: Integration Test Patterns (US-061)

**Test:** Integration tests mount components

**CLET Pattern:**
```typescript
const { lastFrame } = render(
  <TestProvider>
    <LauncherScreen />
  </TestProvider>
);
expect(lastFrame()).toContain('PIPELINE v7');
```

**Edge Cases:**
- E2E-061a: Missing provider → Clear error message

**Covers Acceptance Criteria:**
- Mount component with providers
- Inject mock dependencies
- Assert on rendered output
- Verify event handling

---

### E2E-062: E2E Test Patterns (US-062)

**Test:** E2E tests run full flows

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js')
  .wait('stdout', /Launcher/)
  .stdin('stdout', /Path/, '/test/project')
  .stdin('stdout', /project/, KEYS.TAB)
  .stdin('stdout', /Type/, KEYS.DOWN)  // Select Terminal
  .stdin('stdout', /Terminal/, KEYS.ENTER)
  .wait('stdout', /Starting pipeline/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-062a: Flow with error → Error screen shown

**Covers Acceptance Criteria:**
- Launch full CLI
- Navigate through screens
- Verify state changes
- Check final output

---

### E2E-063: Mock Process Spawn (US-063)

**Test:** Mock process tracks spawns

**CLET Pattern:**
```typescript
const mockSpawn = new MockSpawn();
const proc = mockSpawn.spawn('claude', ['--phase', '4']);
expect(mockSpawn.getSpawnedProcesses()).toHaveLength(1);
mockSpawn.simulateOutput(proc.pid, 'Hello from Claude');
```

**Edge Cases:**
- E2E-063a: Spawn failure → Error event emitted

**Covers Acceptance Criteria:**
- spawn() returns mock process
- Tracks spawned processes
- Simulates stdout/stderr
- Simulates exit events

---

### E2E-064: Mock Process Kill (US-064)

**Test:** Mock process handles kill

**CLET Pattern:**
```typescript
const mockSpawn = new MockSpawn();
const proc = mockSpawn.spawn('claude');
mockSpawn.kill(proc.pid);
expect(mockSpawn.getKillHistory()).toContain(proc.pid);
expect(proc.killed).toBe(true);
```

**Edge Cases:**
- E2E-064a: Kill non-existent → Graceful failure

**Covers Acceptance Criteria:**
- kill(pid) marks process dead
- Emits exit event
- Updates process state
- Records kill history

---

### E2E-065: Test Error Simulation (US-065)

**Test:** Errors can be simulated

**CLET Pattern:**
```typescript
mockFs.simulateError('readFile', new Error('ENOENT'));
await expect(mockFs.readFile('/missing')).rejects.toThrow('ENOENT');
```

**Edge Cases:**
- E2E-065a: Conditional error → Only triggers for specific path

**Covers Acceptance Criteria:**
- Simulate file read errors
- Simulate process spawn errors
- Simulate network errors
- Verify error handling

---

### E2E-066: Performance Test Utilities (US-066)

**Test:** Slow tests detected

**CLET Pattern:**
```typescript
const timer = new TestTimer();
timer.start();
await slowOperation();
timer.stop();
expect(timer.elapsed).toBeLessThan(5000);
```

**Edge Cases:**
- E2E-066a: Timeout enforcement → Test fails on timeout

**Covers Acceptance Criteria:**
- Test timeout enforcement
- Execution time tracking
- Slow test warnings
- Performance regression detection

---

### E2E-067: Test Retry Logic (US-067)

**Test:** Flaky tests can retry

**CLET Pattern:**
```typescript
// Configure retry in test config
// Jest: jest.retryTimes(3)
let attempts = 0;
it('eventually passes', () => {
  attempts++;
  if (attempts < 3) throw new Error('Flaky');
  expect(true).toBe(true);
});
```

**Edge Cases:**
- E2E-067a: Max retries exceeded → Final failure reported

**Covers Acceptance Criteria:**
- Configurable retry count
- Delay between retries
- Report retry attempts
- Distinguish flake vs failure

---

### E2E-068: Mock Git Operations (US-068)

**Test:** Mock git tracks operations

**CLET Pattern:**
```typescript
const mockGit = new MockGit();
mockGit.setStatus({ modified: ['file.ts'] });
const status = mockGit.status();
expect(status.modified).toContain('file.ts');
await mockGit.commit('feat: add feature');
expect(mockGit.getCommitHistory()).toHaveLength(1);
```

**Edge Cases:**
- E2E-068a: Git not installed → Simulates missing git

**Covers Acceptance Criteria:**
- Mock git status
- Mock git commit
- Mock git push
- Track git operation history

---

### E2E-069: Test Context Isolation (US-069)

**Test:** Each test has clean state

**CLET Pattern:**
```typescript
let context: TestContext;
beforeEach(() => {
  context = createTestContext();
});
afterEach(() => {
  context.destroy();
});
it('has isolated filesystem', () => {
  expect(context.fs.readdirSync('/')).toHaveLength(0);
});
```

**Edge Cases:**
- E2E-069a: Context leak detection → Warns if not cleaned up

**Covers Acceptance Criteria:**
- Fresh filesystem per test
- Fresh stores per test
- Fresh mocks per test
- No cross-test pollution

---

### E2E-070: Debug Logging for Tests (US-070)

**Test:** Debug logs captured on failure

**CLET Pattern:**
```typescript
const debugLog = new DebugLog();
debugLog.capture(() => {
  mockFs.writeFile('/test', 'data');
  mockSpawn.spawn('claude');
});
// On test failure, debugLog.dump() shows all interactions
```

**Edge Cases:**
- E2E-070a: Verbose mode → More detail in logs

**Covers Acceptance Criteria:**
- Capture mock interactions
- Log state changes
- Output on test failure
- Configurable verbosity

---

## Epic 3: State Management (47 tests)

### E2E-071: ManifestStore Creation (US-071)

**Test:** ManifestStore initializes with defaults

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'manifest'])
  .wait('stdout', /ManifestStore initialized/)
  .wait('stdout', /version: 7\.0\.0/)
  .wait('stdout', /currentPhase: 1/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-071a: Store with custom initial state → Overrides defaults
- E2E-071b: Store subscription → Listener receives updates

**Covers Acceptance Criteria:**
- In-memory state object
- Initial state with defaults
- Subscribe for changes
- Get current state

---

### E2E-072: ManifestStore Manifest Fields (US-072)

**Test:** ManifestStore has all required fields

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'manifest-fields'])
  .wait('stdout', /version:/)
  .wait('stdout', /project:/)
  .wait('stdout', /currentPhase:/)
  .wait('stdout', /phases:/)
  .wait('stdout', /workers:/)
  .wait('stdout', /cost:/)
  .wait('stdout', /duration:/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-072a: Field validation → Invalid field type rejected

**Covers Acceptance Criteria:**
- version field
- project object
- currentPhase number
- phases object with phase states
- workers array
- cost object
- duration object

---

### E2E-073: ManifestStore Phase Updates (US-073)

**Test:** ManifestStore updates phase state

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'phase-update'])
  .wait('stdout', /Phase 1: pending/)
  .stdin('stdout', /pending/, 'u')  // Update phase
  .wait('stdout', /Phase 1: in-progress/)
  .stdin('stdout', /in-progress/, 'c')  // Complete phase
  .wait('stdout', /Phase 1: complete/)
  .wait('stdout', /Phase updated event/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-073a: Invalid phase number → Error thrown
- E2E-073b: Phase already complete → No duplicate events

**Covers Acceptance Criteria:**
- setPhaseStatus(phase, status)
- setCurrentPhase(phase)
- getPhaseStatus(phase)
- Emits change event

---

### E2E-074: ManifestStore Epic Updates (US-074)

**Test:** ManifestStore updates epic state

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'epic-update'])
  .wait('stdout', /Epic 1: pending/)
  .stdin('stdout', /pending/, 's')  // Start epic
  .wait('stdout', /Epic 1: in-progress/)
  .stdin('stdout', /in-progress/, 'f')  // Finish epic
  .wait('stdout', /Epic 1: complete/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-074a: Add new epic → Epic added to list
- E2E-074b: Epic not found → Error thrown

**Covers Acceptance Criteria:**
- setEpicStatus(epicId, status)
- setCurrentEpic(epicId)
- getEpicStatus(epicId)
- addEpic(epic)
- Emits change event

---

### E2E-075: ManifestStore Worker Tracking (US-075)

**Test:** ManifestStore tracks workers

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'worker-tracking'])
  .wait('stdout', /Workers: 0/)
  .stdin('stdout', /Workers/, 'a')  // Add worker
  .wait('stdout', /Workers: 1/)
  .wait('stdout', /Session: uuid-[a-f0-9]+/)
  .stdin('stdout', /Session/, 'r')  // Remove worker
  .wait('stdout', /Workers: 0/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-075a: Worker not found → Graceful handling
- E2E-075b: Update worker status → Status changes

**Covers Acceptance Criteria:**
- addWorker(worker) with sessionId
- updateWorkerStatus(sessionId, status)
- removeWorker(sessionId)
- getActiveWorkers()
- getWorkerBySession(sessionId)

---

### E2E-076: ManifestStore Cost Updates (US-076)

**Test:** ManifestStore tracks costs

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'cost-update'])
  .wait('stdout', /Total cost: \$0\.00/)
  .stdin('stdout', /cost/, 'a')  // Add cost
  .wait('stdout', /Total cost: \$1\.50/)
  .stdin('stdout', /cost/, 'a')  // Add more
  .wait('stdout', /Total cost: \$3\.00/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-076a: Cost by phase → Returns phase breakdown
- E2E-076b: Reset cost → Clears to zero

**Covers Acceptance Criteria:**
- addCost(amount, phase)
- getTotalCost()
- getCostByPhase(phase)
- resetCost()

---

### E2E-077: ManifestStore Duration Updates (US-077)

**Test:** ManifestStore tracks duration

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'duration-update'])
  .wait('stdout', /Duration: 00:00:00/)
  .stdin('stdout', /Duration/, 'a')  // Add 60 seconds
  .wait('stdout', /Duration: 00:01:00/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-077a: Duration by phase → Returns phase breakdown
- E2E-077b: Reset duration → Clears to zero

**Covers Acceptance Criteria:**
- addDuration(seconds, phase)
- getTotalDuration()
- getDurationByPhase(phase)
- resetDuration()

---

### E2E-078: ProjectStore Creation (US-078)

**Test:** ProjectStore initializes correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'project'])
  .wait('stdout', /ProjectStore initialized/)
  .wait('stdout', /name: null/)
  .wait('stdout', /path: null/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-078a: Store with initial project → Pre-populated

**Covers Acceptance Criteria:**
- In-memory state object
- Project name, path, type, mode
- Subscribe for changes
- Get current state

---

### E2E-079: ProjectStore Project Fields (US-079)

**Test:** ProjectStore has project fields

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'project-fields', '--set-project', '/test/app'])
  .wait('stdout', /name: app/)
  .wait('stdout', /path: \/test\/app/)
  .wait('stdout', /type: terminal/)
  .wait('stdout', /mode: new/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-079a: Relative path → Converted to absolute

**Covers Acceptance Criteria:**
- name field
- path field (absolute)
- type field (desktop/terminal)
- mode field (new/feature/fix)

---

### E2E-080: ProjectStore Validation (US-080)

**Test:** ProjectStore validates project

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'project-validation', '--path', '/nonexistent'])
  .wait('stdout', /Validation failed/)
  .wait('stdout', /Path does not exist/)
  .wait('close', 1);
```

**Edge Cases:**
- E2E-080a: Path is file not directory → Error
- E2E-080b: No write permission → Error

**Covers Acceptance Criteria:**
- Path exists validation
- Path is directory validation
- Type is valid validation
- Mode is valid validation
- Returns validation errors

---

### E2E-081: SessionStore Creation (US-081)

**Test:** SessionStore initializes with session map

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'session'])
  .wait('stdout', /SessionStore initialized/)
  .wait('stdout', /Active sessions: 0/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-081a: Store with pre-existing sessions → Loads from persistence
- E2E-081b: Session map empty → Returns empty array for list

**Covers Acceptance Criteria:**
- In-memory session map
- Add/remove sessions
- Get session by ID
- List active sessions

---

### E2E-082: SessionStore Session Fields (US-082)

**Test:** SessionStore tracks complete session fields

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'session-fields'])
  .wait('stdout', /sessionId: [a-f0-9-]{36}/)
  .wait('stdout', /projectPath: \/test/)
  .wait('stdout', /phase: 4/)
  .wait('stdout', /epic: 2/)
  .wait('stdout', /startedAt: \d+/)
  .wait('stdout', /status: running/)
  .wait('stdout', /pid: \d+/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-082a: Session without epic → epic field is null
- E2E-082b: Session with long path → Path stored correctly

**Covers Acceptance Criteria:**
- sessionId (UUID)
- projectPath
- phase
- epic (if applicable)
- startedAt timestamp
- status (running/paused/complete)
- pid (process ID)

---

### E2E-083: SessionStore Session Lifecycle (US-083)

**Test:** SessionStore manages session transitions

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'session-lifecycle'])
  .wait('stdout', /Session created: [a-f0-9-]+/)
  .stdin('stdout', /created/, 's')  // Start
  .wait('stdout', /Status: running/)
  .stdin('stdout', /running/, 'p')  // Pause
  .wait('stdout', /Status: paused/)
  .stdin('stdout', /paused/, 'c')  // Complete
  .wait('stdout', /Status: complete/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-083a: Invalid transition → Error thrown (running→paused→running not allowed directly)
- E2E-083b: Complete already complete → No-op, no error

**Covers Acceptance Criteria:**
- createSession() generates UUID
- startSession(id) sets running
- pauseSession(id) sets paused
- completeSession(id) sets complete
- Validates transitions

---

### E2E-084: SessionStore Current Session (US-084)

**Test:** SessionStore tracks current session

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'current-session'])
  .wait('stdout', /Current: none/)
  .stdin('stdout', /none/, 'a')  // Add and set current
  .wait('stdout', /Current: session-[a-f0-9-]+/)
  .stdin('stdout', /Current:/, 'c')  // Clear
  .wait('stdout', /Current: none/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-084a: Set current to non-existent → Error thrown
- E2E-084b: Multiple setCurrent → Only one current at a time

**Covers Acceptance Criteria:**
- setCurrentSession(id)
- getCurrentSession()
- clearCurrentSession()
- Only one current at a time

---

### E2E-085: TodoStore Creation (US-085)

**Test:** TodoStore manages todos per session

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'todo'])
  .wait('stdout', /TodoStore initialized/)
  .wait('stdout', /Todos: 0/)
  .stdin('stdout', /Todos/, 'a')  // Add todo
  .wait('stdout', /Todos: 1/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-085a: Multiple sessions → Todos isolated per session
- E2E-085b: Remove todo → Todo count decreases

**Covers Acceptance Criteria:**
- In-memory todo list per session
- Add/update/remove todos
- Get todos by session
- Subscribe for changes

---

### E2E-086: TodoStore Todo Fields (US-086)

**Test:** TodoStore has complete todo fields

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'todo-fields'])
  .wait('stdout', /content: Implement feature/)
  .wait('stdout', /status: in_progress/)
  .wait('stdout', /activeForm: Implementing feature/)
  .wait('stdout', /sessionId: [a-f0-9-]+/)
  .wait('stdout', /timestamp: \d+/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-086a: Todo with empty content → Validation error
- E2E-086b: Todo with invalid status → Validation error

**Covers Acceptance Criteria:**
- content (task description)
- status (pending/in_progress/completed)
- activeForm (present participle)
- sessionId (which worker)
- timestamp

---

### E2E-087: TodoStore Session Scoping (US-087)

**Test:** Todos scoped to sessions correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'todo-scoping'])
  .wait('stdout', /Session 1: 3 todos/)
  .wait('stdout', /Session 2: 2 todos/)
  .stdin('stdout', /Session/, '1')  // Query session 1
  .wait('stdout', /Returned: 3/)  // Only session 1 todos
  .wait('close', 0);
```

**Edge Cases:**
- E2E-087a: Query non-existent session → Returns empty array
- E2E-087b: Add to wrong session → Error or creates session

**Covers Acceptance Criteria:**
- getTodosBySession(sessionId)
- addTodo(todo, sessionId)
- Only returns matching session
- Different sessions isolated

---

### E2E-088: TodoStore Progress Calculation (US-088)

**Test:** Progress percentage calculated correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'todo-progress'])
  .wait('stdout', /Progress: 0%/)  // No todos
  .stdin('stdout', /Progress/, 'a')  // Add 4 todos, 2 completed
  .wait('stdout', /Progress: 50%/)
  .stdin('stdout', /Progress/, 'c')  // Complete another
  .wait('stdout', /Progress: 75%/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-088a: Zero todos → Returns 0%
- E2E-088b: All completed → Returns 100%

**Covers Acceptance Criteria:**
- getProgress(sessionId) returns 0-100
- Counts completed vs total
- Returns 0 if no todos
- Recalculates on changes

---

### E2E-089: TodoStore Completion Detection (US-089)

**Test:** Detects when all todos complete

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'todo-completion'])
  .wait('stdout', /isComplete: false/)
  .stdin('stdout', /false/, 'c')  // Complete all todos
  .wait('stdout', /isComplete: true/)
  .wait('stdout', /Completion event emitted/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-089a: Zero todos → isComplete returns true
- E2E-089b: One pending → isComplete returns false

**Covers Acceptance Criteria:**
- isComplete(sessionId) returns boolean
- True when all todos completed
- Emits completion event
- Works with 0 todos (returns true)

---

### E2E-090: CostStore Creation (US-090)

**Test:** CostStore initializes with cost data

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'cost'])
  .wait('stdout', /CostStore initialized/)
  .wait('stdout', /Total: \$0\.00/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-090a: Pre-loaded cost data → Shows initial total
- E2E-090b: Cost by phase empty → Returns empty object

**Covers Acceptance Criteria:**
- In-memory cost data
- Total cost
- Cost by phase
- Cost by session

---

### E2E-091: CostStore Cost Fields (US-091)

**Test:** CostStore has complete cost fields

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'cost-fields'])
  .stdin('stdout', /CostStore/, 'a')  // Add costs
  .wait('stdout', /total: 5\.50/)
  .wait('stdout', /byPhase: \{"1":2\.00,"2":3\.50\}/)
  .wait('stdout', /bySession: \{.*\}/)
  .wait('stdout', /currency: USD/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-091a: Negative cost → Validation error
- E2E-091b: Very large cost → Handles correctly

**Covers Acceptance Criteria:**
- total (cumulative)
- byPhase object
- bySession object
- currency (USD)

---

### E2E-092: CostStore Accumulation (US-092)

**Test:** Costs accumulate correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'cost-accumulation'])
  .wait('stdout', /Total: \$0\.00/)
  .stdin('stdout', /Total/, 'a')  // Add $1.50 to phase 1
  .wait('stdout', /Total: \$1\.50/)
  .wait('stdout', /Phase 1: \$1\.50/)
  .stdin('stdout', /Phase/, 'a')  // Add $2.00 to phase 2
  .wait('stdout', /Total: \$3\.50/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-092a: Add to same phase twice → Accumulates
- E2E-092b: Add with precision → Handles cents correctly

**Covers Acceptance Criteria:**
- addCost(amount, phase, session)
- Increments total
- Increments phase total
- Increments session total

---

### E2E-093: CostStore Reset (US-093)

**Test:** CostStore resets correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'cost-reset'])
  .wait('stdout', /Total: \$5\.00/)
  .stdin('stdout', /Total/, 'r')  // Reset all
  .wait('stdout', /Total: \$0\.00/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-093a: Reset phase only → Other phases preserved
- E2E-093b: Reset session only → Other sessions preserved

**Covers Acceptance Criteria:**
- reset() clears all
- resetPhase(phase) clears phase
- resetSession(session) clears session
- Preserves other data

---

### E2E-094: DurationStore Creation (US-094)

**Test:** DurationStore initializes correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'duration'])
  .wait('stdout', /DurationStore initialized/)
  .wait('stdout', /Total: 0s/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-094a: Pre-loaded duration → Shows initial total
- E2E-094b: Duration by phase → Breakdown available

**Covers Acceptance Criteria:**
- In-memory duration data
- Total duration in seconds
- Duration by phase
- Duration by session

---

### E2E-095: DurationStore Timer (US-095)

**Test:** DurationStore timer tracks time

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-store', 'duration-timer'])
  .wait('stdout', /Timer: stopped/)
  .stdin('stdout', /stopped/, 's')  // Start timer
  .wait('stdout', /Timer: running/)
  .wait(1000)  // Wait 1 second
  .stdin('stdout', /running/, 'p')  // Pause
  .wait('stdout', /Timer: paused/)
  .wait('stdout', /Elapsed: 1s/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-095a: Resume after pause → Continues counting
- E2E-095b: Stop timer → Adds elapsed to totals

**Covers Acceptance Criteria:**
- startTimer(phase, session)
- stopTimer()
- pauseTimer()
- resumeTimer()
- Adds elapsed to totals

---

### E2E-096 through E2E-117: Store Utilities

*(Tests E2E-096 through E2E-117 cover store utilities US-096 through US-117)*

**E2E-096: Store Persistence Interface (US-096)**
- Tests toJSON() and fromJSON() serialization
- Edge cases: Invalid JSON, schema mismatch

**E2E-097: Store Change Events (US-097)**
- Tests subscribe/unsubscribe pattern
- Edge cases: Multiple listeners, listener removal

**E2E-098: Store Immutability (US-098)**
- Tests state not mutated
- Edge cases: Deep object updates

**E2E-099: Store Selectors (US-099)**
- Tests selectPhase, selectEpics, selectTodos, selectProgress
- Edge cases: Missing data paths

**E2E-100: Store Actions (US-100)**
- Tests dispatch and reducer pattern
- Edge cases: Unknown action type

**E2E-101: Store Middleware (US-101)**
- Tests logging, persistence, validation middleware
- Edge cases: Middleware chain order

**E2E-102: Store Initialization (US-102)**
- Tests default state, file loading, merge
- Edge cases: Corrupted file, missing file

**E2E-103: Store Reset (US-103)**
- Tests reset to defaults
- Edge cases: Preserves subscriptions

**E2E-104: Store Undo/Redo (US-104)**
- Tests undo(), redo(), history limit
- Edge cases: Undo at start, redo at end

**E2E-105: Multi-Store Coordination (US-105)**
- Tests transaction, atomic updates, rollback
- Edge cases: Partial failure

**E2E-106: Store Dev Tools (US-106)**
- Tests action logging, time-travel, export
- Edge cases: Large history

**E2E-107: Store Type Safety (US-107)**
- Tests TypeScript types, inference
- Edge cases: Type coercion

**E2E-108: Zustand Store Pattern (US-108)**
- Tests create(), hook, selector, middleware
- Edge cases: Re-render optimization

**E2E-109: Store Hydration (US-109)**
- Tests load from manifest, missing file, schema validation
- Edge cases: Schema migration

**E2E-110: Store Dehydration (US-110)**
- Tests save to file, atomic write, error handling
- Edge cases: Disk full

**E2E-111 through E2E-117: Store Hooks**
- Tests useManifest, useProject, useSession, useTodos, useCost, useDuration, StoreProvider
- Edge cases: Missing provider, selector optimization

---

## Epic 4: Filesystem Service (34 tests)

### E2E-118: FilesystemService Creation (US-118)

**Test:** FilesystemService initializes correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-service', 'filesystem'])
  .wait('stdout', /FilesystemService ready/)
  .wait('stdout', /Using real filesystem/)  // or mock in tests
  .wait('close', 0);
```

**Edge Cases:**
- E2E-118a: With mock fs → Uses mock filesystem
- E2E-118b: Error in operation → Logs error with context

**Covers Acceptance Criteria:**
- Class with fs methods
- Injected file system (real or mock)
- Error handling
- Logging

---

### E2E-119: Project Directory Creation (US-119)

**Test:** Creates project directories

**CLET Pattern:**
```typescript
process.env.USE_MOCK_FS = 'true';
await runner()
  .fork('bin/cli.js', ['--create-project', '/test/new-project'])
  .wait('stdout', /Created \/test\/new-project/)
  .wait('stdout', /Created \/test\/new-project\/.pipeline/)
  .wait('stdout', /Created \/test\/new-project\/docs/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-119a: Directory exists → Returns success (idempotent)
- E2E-119b: Permission denied → Returns error

**Covers Acceptance Criteria:**
- createProjectDir(path) creates folder
- Creates .pipeline subdirectory
- Creates docs subdirectory
- Returns success/error

---

### E2E-120 through E2E-151: Remaining Filesystem Service Tests

**E2E-120: Project Validation (US-120)** - Validates project directory structure
- Edge cases: Missing docs/, missing .pipeline/

**E2E-121: Manifest Read (US-121)** - Reads manifest.json with parsing
- Edge cases: Missing file, invalid JSON

**E2E-122: Manifest Write (US-122)** - Writes manifest.json atomically
- Edge cases: Disk full, permission denied

**E2E-123: Manifest Atomic Update (US-123)** - Uses temp file + rename
- Edge cases: Crash mid-write, concurrent writes

**E2E-124: Todo File Read (US-124)** - Reads todo JSON files
- Edge cases: Empty file, malformed JSON

**E2E-125: Todo File Write (US-125)** - Writes todo JSON files
- Edge cases: Long content, special characters

**E2E-126: Todo Directory Watch (US-126)** - Watches ~/.claude/todos/
- Edge cases: Directory doesn't exist, permission denied

**E2E-127: Todo File Change Detection (US-127)** - Detects add/modify/delete
- Edge cases: Rapid changes, deleted during read

**E2E-128: Todo Session Filtering (US-128)** - Filters by session ID pattern
- Edge cases: No matching files, all matching

**E2E-129: User Stories Read (US-129)** - Reads docs/user-stories.md
- Edge cases: Missing file, empty file

**E2E-130: Brainstorm Notes Read (US-130)** - Reads docs/brainstorm-notes.md
- Edge cases: Missing file, binary content

**E2E-131: E2E Specs Read (US-131)** - Reads docs/e2e-test-specs.md
- Edge cases: Large file, encoding issues

**E2E-132: Source File Read (US-132)** - Reads src/**/*.{ts,tsx}
- Edge cases: Symlinks, binary files

**E2E-133: Source File Write (US-133)** - Creates/updates source files
- Edge cases: Directory doesn't exist, readonly file

**E2E-134: Package.json Read (US-134)** - Reads and parses package.json
- Edge cases: Missing file, invalid JSON

**E2E-135: Package.json Write (US-135)** - Updates package.json
- Edge cases: Format preservation, merge conflicts

**E2E-136: Git Status Check (US-136)** - Checks for uncommitted changes
- Edge cases: Not a git repo, detached HEAD

**E2E-137: Git Commit (US-137)** - Creates commits with message
- Edge cases: Nothing to commit, hook failure

**E2E-138: Glob Pattern Matching (US-138)** - Finds files by pattern
- Edge cases: No matches, recursive patterns

**E2E-139: Path Normalization (US-139)** - Handles cross-platform paths
- Edge cases: UNC paths (Windows), symlinks

**E2E-140: Directory Creation (US-140)** - Creates nested directories
- Edge cases: Already exists, permission denied

**E2E-141: File Deletion (US-141)** - Removes files safely
- Edge cases: Already deleted, directory vs file

**E2E-142: File Copy (US-142)** - Copies files with metadata
- Edge cases: Large files, special permissions

**E2E-143: File Move (US-143)** - Moves files atomically
- Edge cases: Cross-volume, existing destination

**E2E-144: Temp File Creation (US-144)** - Creates temp files
- Edge cases: Temp directory full, cleanup

**E2E-145: File Lock (US-145)** - Advisory file locking
- Edge cases: Lock timeout, dead process

**E2E-146: File Stats (US-146)** - Gets file metadata
- Edge cases: Symlink stats, missing file

**E2E-147: Directory Listing (US-147)** - Lists directory contents
- Edge cases: Hidden files, empty directory

**E2E-148: File Exists Check (US-148)** - Checks file existence
- Edge cases: Race condition, permission denied

**E2E-149: Path Resolution (US-149)** - Resolves relative paths
- Edge cases: Home directory, env variables

**E2E-150: Watch Debouncing (US-150)** - Debounces rapid file changes
- Edge cases: Very rapid changes, single change

**E2E-151: Error Recovery (US-151)** - Recovers from I/O errors
- Edge cases: Retry logic, error reporting

---

## Epic 5: Process Service (29 tests)

### E2E-152: ProcessService Creation (US-152)

**Test:** ProcessService initializes correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-service', 'process'])
  .wait('stdout', /ProcessService ready/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-152a: With mock spawn → Uses mock process spawner
- E2E-152b: Error handling → Logs spawn errors

**Covers Acceptance Criteria:**
- Class with process methods
- Injected spawn function (real or mock)
- Error handling
- Logging

---

### E2E-153: Worker Spawn (US-153)

**Test:** Spawns Claude workers with session ID

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'phase-3-success.json';
await runner()
  .fork('bin/cli.js', ['--spawn-worker', '--phase', '3'])
  .wait('stdout', /Worker spawned/)
  .wait('stdout', /Session ID: [a-f0-9-]+/)
  .wait('stdout', /PID: \d+/)
  .wait('close', 0);
```

**Mock Fixture:** `phase-3-success.json`

**Edge Cases:**
- E2E-153a: Spawn failure → Error event emitted
- E2E-153b: Worker registered → Session store updated

**Covers Acceptance Criteria:**
- spawnWorker(command, args, options)
- Returns process handle
- Assigns session ID
- Registers in session store

---

### E2E-154 through E2E-180: Remaining Process Service Tests

**E2E-154: Worker Output Capture (US-154)** - Captures stdout/stderr streams
- Edge cases: Binary output, very long lines
- Mock fixture: `worker-output.json`

**E2E-155: Worker Exit Detection (US-155)** - Detects process exit/crash
- Edge cases: SIGTERM vs SIGKILL, exit code parsing
- Mock fixture: `worker-exit.json`

**E2E-156: Worker Kill (US-156)** - Terminates worker by session ID
- Edge cases: Already dead, permission denied

**E2E-157: Worker PID Tracking (US-157)** - Tracks process IDs by session
- Edge cases: PID reuse, orphan processes

**E2E-158: Worker Session Scoping (US-158)** - Workers scoped to sessions
- Edge cases: Cross-session access denied

**E2E-159: Worker Environment (US-159)** - Sets environment variables
- Edge cases: PATH manipulation, special characters

**E2E-160: Worker CWD (US-160)** - Sets working directory
- Edge cases: Missing directory, relative path

**E2E-161: Worker Arguments (US-161)** - Passes command-line arguments
- Edge cases: Arguments with spaces, shell escaping

**E2E-162: Worker Input (US-162)** - Sends stdin to worker
- Edge cases: Large input, binary data

**E2E-163: Worker PTY Mode (US-163)** - Uses node-pty for TTY
- Edge cases: Raw mode, ANSI codes

**E2E-164: Worker Timeout (US-164)** - Kills worker after timeout
- Edge cases: Timeout during phase, restart logic
- Mock fixture: `worker-timeout.json`

**E2E-165: Worker Retry (US-165)** - Retries on failure
- Edge cases: Max retries, backoff
- Mock fixture: `worker-retry.json`

**E2E-166: Worker Health Check (US-166)** - Monitors worker liveness
- Edge cases: Zombie process, stuck worker

**E2E-167: Worker Resource Limits (US-167)** - Limits memory/CPU
- Edge cases: OOM, CPU throttle

**E2E-168: Worker Logging (US-168)** - Logs worker lifecycle
- Edge cases: Log rotation, log level

**E2E-169: Worker Metrics (US-169)** - Collects worker stats
- Edge cases: Metrics overflow, missing data

**E2E-170: Worker Cleanup (US-170)** - Cleans up on shutdown
- Edge cases: Orphan cleanup, graceful shutdown

**E2E-171: Concurrent Workers (US-171)** - Manages multiple workers
- Edge cases: Worker collision, resource contention

**E2E-172: Worker Priority (US-172)** - Sets process priority
- Edge cases: Nice values, priority inheritance

**E2E-173: Command Injection Prevention (US-173)** - Sanitizes commands
- Edge cases: Shell metacharacters, path traversal

**E2E-174: Worker Resume (US-174)** - Resumes with existing session
- Edge cases: Session expired, state mismatch
- Mock fixture: `worker-resume.json`

**E2E-175: Worker Spawn Lock (US-175)** - Prevents duplicate spawns
- Edge cases: Race condition, lock timeout

**E2E-176: Worker Signal Handling (US-176)** - Forwards signals to worker
- Edge cases: SIGINT, SIGTERM, SIGHUP

**E2E-177: Worker Port Allocation (US-177)** - Allocates unique ports
- Edge cases: Port in use, port exhaustion

**E2E-178: Worker IPC (US-178)** - Inter-process communication
- Edge cases: Channel closed, message serialization

**E2E-179: Worker Node Version (US-179)** - Checks Node.js version
- Edge cases: Version mismatch, missing Node

**E2E-180: Worker Max Concurrent (US-180)** - Limits concurrent workers
- Edge cases: Queue overflow, priority queue

---

## Epic 6: Cost Service (22 tests)

### E2E-181: CostService Creation (US-181)

**Test:** CostService initializes correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-service', 'cost'])
  .wait('stdout', /CostService ready/)
  .wait('stdout', /ccusage: available/)  // or unavailable
  .wait('close', 0);
```

**Edge Cases:**
- E2E-181a: ccusage unavailable → Graceful degradation
- E2E-181b: Mock ccusage → Uses mock data

**Covers Acceptance Criteria:**
- Class with cost methods
- Injected ccusage interface
- Error handling
- Logging

---

### E2E-182 through E2E-202: Remaining Cost Service Tests

**E2E-182: Cost Query (US-182)** - Queries ccusage for costs
- Edge cases: No sessions, date range filtering
- Mock fixture: `ccusage-query.json`

**E2E-183: Cost Aggregation (US-183)** - Aggregates costs by phase
- Edge cases: Empty phases, decimal precision

**E2E-184: Cost Update on Worker (US-184)** - Updates cost when worker exits
- Edge cases: Worker crash, incomplete session
- Mock fixture: `worker-cost.json`

**E2E-185: Cost Persistence (US-185)** - Persists costs to manifest
- Edge cases: Disk full, concurrent writes

**E2E-186: Cost Recalculation (US-186)** - Recalculates from ccusage on resume
- Edge cases: Missing sessions, duplicate costs
- Mock fixture: `cost-recalc.json`

**E2E-187: Cost Format (US-187)** - Formats costs for display
- Edge cases: Large amounts, zero costs

**E2E-188: Cost Currency (US-188)** - Handles USD currency
- Edge cases: Currency symbol, locale format

**E2E-189: Cost by Session (US-189)** - Tracks cost per session
- Edge cases: Session not found, orphan costs

**E2E-190: Cost Estimate (US-190)** - Estimates remaining cost
- Edge cases: No history, variable costs

**E2E-191: Cost Events (US-191)** - Emits cost change events
- Edge cases: Rapid updates, event batching

**E2E-192: Cost Reset (US-192)** - Resets cost tracking
- Edge cases: Preserves history, partial reset

**E2E-193: Cost Export (US-193)** - Exports cost report
- Edge cases: Large report, CSV format

**E2E-194: Duration Tracking (US-194)** - Tracks elapsed time
- Edge cases: Timer pause/resume, overflow

**E2E-195: Duration per Phase (US-195)** - Tracks duration by phase
- Edge cases: Interrupted phases, skipped phases

**E2E-196: Duration Format (US-196)** - Formats duration for display
- Edge cases: Days/hours/minutes, zero duration

**E2E-197: Duration Persistence (US-197)** - Persists to manifest
- Edge cases: Resume with old duration

**E2E-198: Duration Events (US-198)** - Emits duration updates
- Edge cases: High frequency updates

**E2E-199: Cost Limits (US-199)** - Warns on cost limits
- Edge cases: Approaching limit, exceeded limit

**E2E-200: Cost Comparison (US-200)** - Compares to estimates
- Edge cases: Over/under budget

**E2E-201: Cost Breakdown (US-201)** - Shows cost breakdown UI
- Edge cases: Many phases, pie chart

**E2E-202: Cost History (US-202)** - Shows historical costs
- Edge cases: No history, chart rendering

---

## Epic 7: Pipeline Orchestrator (36 tests)

### E2E-203: Orchestrator Creation (US-203)

**Test:** Orchestrator initializes correctly

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js', ['--test-orchestrator'])
  .wait('stdout', /Orchestrator ready/)
  .wait('stdout', /State: idle/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-203a: With injected services → Services available
- E2E-203b: Missing required service → Error on init

**Covers Acceptance Criteria:**
- Class with orchestration methods
- Injected services
- State machine for phases
- Error handling

---

### E2E-204: Pipeline Initialization (US-204)

**Test:** Initializes new pipeline

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'phase-1-success.json';
await runner()
  .fork('bin/cli.js', ['--init-pipeline', '/test/project'])
  .wait('stdout', /Pipeline initialized/)
  .wait('stdout', /Manifest created/)
  .wait('stdout', /State: idle -> running/)
  .wait('close', 0);
```

**Mock Fixture:** `phase-1-success.json`

**Edge Cases:**
- E2E-204a: Existing manifest → Prompts for resume
- E2E-204b: Invalid path → Error shown

**Covers Acceptance Criteria:**
- initPipeline(project) creates manifest
- Sets up initial state
- Creates directories
- Returns success

---

### E2E-205: Phase Progression (US-205)

**Test:** Phases advance correctly

**CLET Pattern:**
```typescript
process.env.MOCK_CLAUDE_FIXTURE = 'phase-transition.json';
await runner()
  .fork('bin/cli.js', ['--run-phase', '3'])
  .wait('stdout', /Phase 3: in-progress/)
  .wait('stdout', /\[TODO\].*Creating skeleton/)
  .wait('stdout', /Phase 3: complete/)
  .wait('stdout', /Advancing to Phase 4/)
  .wait('close', 0);
```

**Mock Fixture:** `phase-transition.json`

**Edge Cases:**
- E2E-205a: Phase incomplete → Does not advance
- E2E-205b: Worker crash → Shows error, offers retry

**Covers Acceptance Criteria:**
- advancePhase() moves to next
- Validates current complete
- Updates manifest
- Spawns worker

---

### E2E-206 through E2E-238: Remaining Orchestrator Tests

**E2E-206: Phase 1 Brainstorm (US-206)** - Runs interactive brainstorm
- Edge cases: User cancel, timeout
- Mock fixture: `phase-1-interactive.json`

**E2E-207: Phase 2 Specs (US-207)** - Runs E2E spec generation
- Edge cases: Missing user stories, generation failure
- Mock fixture: `phase-2-specs.json`

**E2E-208: Phase 3 Bootstrap (US-208)** - Runs skeleton creation
- Edge cases: npm install failure, file conflicts
- Mock fixture: `phase-3-bootstrap.json`

**E2E-209: Phase 4 Implement (US-209)** - Runs implementation loop
- Edge cases: Test failure, retry logic
- Mock fixture: `phase-4-implement.json`

**E2E-210: Phase 5 Finalize (US-210)** - Runs finalization
- Edge cases: Lint failure, build failure
- Mock fixture: `phase-5-finalize.json`

**E2E-211: Epic Loop (US-211)** - Loops through epics in Phase 4
- Edge cases: Skip epic, epic failure
- Mock fixture: `epic-loop.json`

**E2E-212: Epic Completion Detection (US-212)** - Detects epic complete via todos
- Edge cases: Partial completion, stuck worker
- Mock fixture: `epic-complete-detect.json`

**E2E-213: Epic Transition (US-213)** - Transitions between epics
- Edge cases: Last epic, no next epic
- Mock fixture: `epic-transition.json`

**E2E-214: All Epics Complete (US-214)** - Detects all epics done
- Edge cases: Zero epics, single epic
- Mock fixture: `all-epics-complete.json`

**E2E-215: Worker Spawn Trigger (US-215)** - Spawns worker for phase
- Edge cases: Already running, spawn failure
- Mock fixture: Used by E2E-153

**E2E-216: Worker Crash Recovery (US-216)** - Recovers from crashes
- Edge cases: Repeated crashes, max retries
- Mock fixture: `worker-crash-recovery.json`

**E2E-217: Resume Pipeline (US-217)** - Resumes from manifest state
- Edge cases: Corrupted manifest, missing files
- Mock fixture: `resume-pipeline.json`

**E2E-218: Resume Phase 4 (US-218)** - Resumes mid-Phase 4
- Edge cases: Mid-epic resume, cost recalc
- Mock fixture: `resume-phase-4.json`

**E2E-219: Resume Mid-Epic (US-219)** - Resumes mid-epic
- Edge cases: Todo state mismatch
- Mock fixture: `resume-mid-epic.json`

**E2E-220: Pause Pipeline (US-220)** - Pauses running pipeline
- Edge cases: Worker cleanup, state save

**E2E-221: State Machine (US-221)** - Manages pipeline states
- Edge cases: Invalid transition, race condition

**E2E-222: State Transitions (US-222)** - idle→running→paused→complete
- Edge cases: Error state, restart from error

**E2E-223: Todo Monitoring (US-223)** - Watches todo files for completion
- Edge cases: File watch failure, rapid updates

**E2E-224: Error Handling (US-224)** - Handles orchestrator errors
- Edge cases: Context limit, API error
- Mock fixture: `claude-context-limit.json`

**E2E-225: Error Recovery Options (US-225)** - Shows retry/skip/abort
- Edge cases: User selects each option

**E2E-226: Progress Calculation (US-226)** - Calculates overall progress
- Edge cases: Zero todos, all phases complete

**E2E-227: Progress Events (US-227)** - Emits progress updates
- Edge cases: Rapid updates, event throttling

**E2E-228: Logging (US-228)** - Logs orchestrator decisions
- Edge cases: Log level, log rotation

**E2E-229: Service Injection (US-229)** - Injects filesystem, process, cost
- Edge cases: Mock services, missing service

**E2E-230: Event Emitter (US-230)** - Emits lifecycle events
- Edge cases: No listeners, async listeners

**E2E-231: Config Validation (US-231)** - Validates pipeline config
- Edge cases: Missing fields, invalid values

**E2E-232: Pipeline Type Handling (US-232)** - Handles desktop/terminal
- Edge cases: Unknown type, type-specific logic

**E2E-233: Mode Handling (US-233)** - Handles new/feature/fix modes
- Edge cases: Unknown mode, mode-specific phases

**E2E-234: Cost Update on Phase (US-234)** - Updates cost after phase
- Edge cases: Cost query failure

**E2E-235: Duration Update (US-235)** - Updates duration on events
- Edge cases: Timer overflow

**E2E-236: Manifest Sync (US-236)** - Syncs state to manifest
- Edge cases: Write failure, concurrent access

**E2E-237: Cleanup on Exit (US-237)** - Cleans up on quit
- Edge cases: Force quit, graceful shutdown

**E2E-238: Test Harness Integration (US-238)** - Works with test harness
- Edge cases: Mock injection, fixture loading

---

## Epic 8: UI Screens (48 tests)

### E2E-239: App Component (US-239)

**Test:** App starts and renders

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js')
  .wait('stdout', /PIPELINE v7/)
  .wait('stdout', /Project Path:/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-239a: Terminal too small → Shows minimum size warning
- E2E-239b: Global q key → Shows quit confirmation

**Covers Acceptance Criteria:**
- Renders on launch
- Shows launcher screen
- Handles keyboard globally
- Provides store context

---

### E2E-240: Router Component (US-240)

**Test:** Router navigates between screens

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js')
  .wait('stdout', /Launcher/)
  .stdin('stdout', /Launcher/, KEYS.ENTER)  // Navigate to split view
  .wait('stdout', /Split View/)
  .stdin('stdout', /Split/, KEYS.ESCAPE)  // Go back
  .wait('stdout', /Launcher/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-240a: Navigate to invalid screen → Error handling
- E2E-240b: goBack with no history → Stays on current

**Covers Acceptance Criteria:**
- Tracks current screen
- Renders active screen
- navigate(screen) function
- goBack() function

---

### E2E-241: Launcher Screen (US-241)

**Test:** Launcher shows pipeline options

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js')
  .wait('stdout', /PIPELINE v7/)
  .wait('stdout', /Project Path:/)
  .wait('stdout', /Pipeline Type:/)
  .wait('stdout', /○ Desktop \(Tauri\)/)
  .wait('stdout', /○ Terminal \(Ink\)/)
  .wait('stdout', /Mode:/)
  .wait('stdout', /▶ START/)
  .wait('close', 0);
```

**Edge Cases:**
- E2E-241a: Recent projects shown → Quick select available
- E2E-241b: Tab navigation → Cycles through fields

**Covers Acceptance Criteria:**
- Project path input
- Pipeline type selection
- Mode selection
- Start button

---

### E2E-242: Launcher Path Input (US-242)

**Test:** Path input accepts and validates

**CLET Pattern:**
```typescript
await runner()
  .fork('bin/cli.js')
  .wait('stdout', /Project Path:.*\|/)
  .stdin('stdout', /Path:/, '/test/project')
  .wait('stdout', /\/test\/project/)
  .stdin('stdout', /project/, KEYS.TAB)  // Move to next field
  .wait('stdout', /Pipeline Type:/)  // Focus moved
  .wait('close', 0);
```

**Edge Cases:**
- E2E-242a: Invalid path → Shows validation error
- E2E-242b: Path autocomplete → Tab completes path

**Covers Acceptance Criteria:**
- Text input field
- Browse button (opens picker)
- Validates path exists
- Shows validation error

---

### E2E-243 through E2E-286: Remaining UI Screen Tests

**E2E-243: Launcher Type Selection (US-243)** - Selects Desktop/Terminal type
- Edge cases: Change selection, keyboard navigation

**E2E-244: Launcher Mode Selection (US-244)** - Selects New/Feature/Fix mode
- Edge cases: Change mode, disable for non-empty project

**E2E-245: Launcher Start Button (US-245)** - Starts pipeline on Enter
- Edge cases: Validation failure, disabled state

**E2E-246: Launcher Quick Actions (US-246)** - n=new, o=open, h=history
- Edge cases: Empty history, recent projects

**E2E-247: Launcher Recent Projects (US-247)** - Shows recent projects
- Edge cases: No recent, 10+ recent

**E2E-248: Resume Screen Display (US-248)** - Shows resume options
- Edge cases: Corrupted manifest, missing project
- Mock fixture: `resume-display.json`

**E2E-249: Resume State Display (US-249)** - Shows last state
- Edge cases: Phase 1 vs Phase 5, epic info

**E2E-250: Resume Cost Display (US-250)** - Shows cost from ccusage
- Edge cases: No cost data, recalculation needed
- Mock fixture: `resume-cost.json`

**E2E-251: Resume Actions (US-251)** - Resume/Cancel/Delete buttons
- Edge cases: Delete confirmation

**E2E-252: Split View Layout (US-252)** - Shows orchestrator + worker
- Edge cases: Terminal resize, minimum size

**E2E-253: Split View Divider (US-253)** - Resizable divider
- Edge cases: Drag resize, keyboard resize (←→)

**E2E-254: Split View Resize Keys (US-254)** - ←/→ resize panes
- Edge cases: Minimum pane size, maximum size

**E2E-255: Orchestrator Pane (US-255)** - Shows project, phase, epics
- Edge cases: Long project name, many epics

**E2E-256: Orchestrator Progress (US-256)** - Shows progress bar
- Edge cases: 0%, 100%, updating

**E2E-257: Orchestrator Phase Jump (US-257)** - 1-5 jumps to phase
- Edge cases: Phase not reached, completed phase

**E2E-258: Orchestrator Epic List (US-258)** - Shows epic status
- Edge cases: 0 epics, current highlighted

**E2E-259: Orchestrator Todo List (US-259)** - Shows todos
- Edge cases: 0 todos, many todos, scroll

**E2E-260: Orchestrator Focus (US-260)** - e=epics, t=todos focus
- Edge cases: Already focused, toggle

**E2E-261: Worker Pane (US-261)** - Shows Claude output
- Edge cases: ANSI codes, long lines

**E2E-262: Worker Scroll (US-262)** - Auto-scroll, manual scroll
- Edge cases: Very long output, scroll position

**E2E-263: Worker Output Buffer (US-263)** - Buffers output lines
- Edge cases: Buffer overflow, clear buffer

**E2E-264: Worker Status Bar (US-264)** - Shows worker state
- Edge cases: Paused, error, complete

**E2E-265: Worker Fullscreen (US-265)** - f/F11 toggles fullscreen
- Edge cases: Already fullscreen, Esc exits

**E2E-266: Worker Fullscreen Exit (US-266)** - Esc returns to split
- Edge cases: Keyboard capture, focus return

**E2E-267: Pause Button (US-267)** - p pauses pipeline
- Edge cases: Already paused, pausing during phase

**E2E-268: Resume Button (US-268)** - r resumes pipeline
- Edge cases: Not paused, resume with state

**E2E-269: Quit Confirmation (US-269)** - q shows confirmation
- Edge cases: Pipeline running warning

**E2E-270: Quit During Run (US-270)** - Cleanup on quit
- Edge cases: Worker kill, state save

**E2E-271: Complete Screen (US-271)** - Shows completion summary
- Edge cases: All stats displayed

**E2E-272: Complete Stats (US-272)** - Shows phases, epics, tests
- Edge cases: Zero tests, failed tests

**E2E-273: Complete Cost (US-273)** - Shows total cost
- Edge cases: Zero cost, high cost

**E2E-274: Complete Actions (US-274)** - New Project, Exit buttons
- Edge cases: Start new, clean exit

**E2E-275: Help Overlay (US-275)** - ? shows help
- Edge cases: Context-specific help

**E2E-276: Help Content (US-276)** - All shortcuts listed
- Edge cases: Scroll if too long

**E2E-277: Error Dialog (US-277)** - Shows error modal
- Edge cases: Long error, retry option

**E2E-278: Error Recovery (US-278)** - Retry/Skip/Abort options
- Edge cases: Each option tested

**E2E-279: Toast Notifications (US-279)** - Shows temporary messages
- Edge cases: Multiple toasts, dismiss

**E2E-280: Confirmation Dialogs (US-280)** - Confirm destructive actions
- Edge cases: Yes/No focus, keyboard

**E2E-281: Form Validation (US-281)** - Shows validation errors
- Edge cases: Multiple errors, field focus

**E2E-282: Log View Toggle (US-282)** - l toggles log view
- Edge cases: Empty log, log filtering

**E2E-283: Log Content (US-283)** - Shows pipeline log
- Edge cases: Large log, live updates

**E2E-284: Theme/Colors (US-284)** - Consistent color scheme
- Edge cases: TERM=dumb, 256 color

**E2E-285: Responsive Layout (US-285)** - Adapts to terminal size
- Edge cases: Very small, very large

**E2E-286: Accessibility (US-286)** - Screen reader support
- Edge cases: Focus management, announcements

---

## Mock Fixture Catalog

### Phase Fixtures

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `phase-1-success.json` | Successful brainstorm phase | E2E-204, E2E-206 |
| `phase-2-success.json` | Successful specs phase | E2E-207 |
| `phase-3-success.json` | Successful bootstrap phase | E2E-031, E2E-153, E2E-208 |
| `phase-4-success.json` | Successful implement phase | E2E-209, E2E-211 |
| `phase-5-success.json` | Successful finalize phase | E2E-210 |
| `phase-transition.json` | Phase completion and advance | E2E-205 |

### Epic Fixtures

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `epic-1-complete.json` | Epic 1 completes successfully | E2E-038, E2E-211 |
| `epic-2-complete.json` | Epic 2 completes successfully | E2E-038, E2E-212 |
| `epic-transition.json` | Epic advances to next | E2E-038 |
| `all-epics-complete.json` | All epics finished | E2E-038, E2E-214 |

### Error Fixtures

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `claude-timeout.json` | Claude times out | E2E-037, E2E-216 |
| `claude-crash.json` | Claude process crashes | E2E-037, E2E-216 |
| `claude-context-limit.json` | Context limit exceeded | E2E-037, E2E-224 |
| `claude-api-error.json` | API returns error | E2E-037, E2E-224 |
| `claude-permission-error.json` | Permission denied | E2E-037, E2E-224 |

### Resume Fixtures

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `resume-phase-4.json` | Resume at Phase 4 start | E2E-039, E2E-217 |
| `resume-mid-epic.json` | Resume in middle of epic | E2E-039, E2E-219 |
| `resume-after-crash.json` | Resume after worker crash | E2E-039, E2E-216 |
| `resume-with-cost-recalc.json` | Resume with cost calculation | E2E-039, E2E-186 |

### Test Utility Fixtures

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `mock-claude-basic.json` | Basic mock Claude output | E2E-031 |
| `streaming-fixture.json` | Output with timing delays | E2E-032 |
| `todo-update-fixture.json` | Todo file updates | E2E-033 |
| `exit-code-1.json` | Exit with error code | E2E-034 |

---

## Keyboard Test Matrix

| Key | Context | Expected Behavior | Test ID |
|-----|---------|-------------------|---------|
| `q` | Any screen | Show quit confirmation | E2E-030, E2E-269 |
| `?` | Any screen | Show help overlay | E2E-030, E2E-275 |
| `Ctrl+L` | Any screen | Clear/refresh screen | E2E-030 |
| `Ctrl+C` | Any screen | Emergency stop with confirm | E2E-030 |
| `Tab` | Launcher, Forms | Next field | E2E-026, E2E-242 |
| `Shift+Tab` | Launcher, Forms | Previous field | E2E-026 |
| `↑/↓` | Lists, Menus | Navigate items | E2E-027, E2E-004 |
| `←/→` | Split View | Resize panes | E2E-022, E2E-254 |
| `Enter` | Buttons, Lists | Activate/select | E2E-028, E2E-007 |
| `Space` | Checkboxes | Toggle | E2E-028, E2E-006 |
| `Escape` | Modals, Dialogs | Close/cancel | E2E-029, E2E-020 |
| `p` | Split View | Pause pipeline | E2E-267 |
| `r` | Split View (paused) | Resume pipeline | E2E-268 |
| `f` / `F11` | Split View | Fullscreen worker | E2E-265 |
| `l` | Split View | Toggle log view | E2E-282 |
| `1-5` | Split View | Jump to phase | E2E-257 |
| `e` | Split View | Focus epics | E2E-260 |
| `t` | Split View | Focus todos | E2E-259 |
| `n` | Launcher | New project | E2E-246 |
| `o` | Launcher | Open existing | E2E-246 |
| `h` | Launcher | Show history | E2E-246 |

---

## Coverage Matrix

### Epic 1: TUI Framework

| User Story | E2E Tests | Edge Cases | Criteria Covered |
|------------|-----------|------------|------------------|
| US-001 | E2E-001, E2E-001a-d | 4 | 5/5 |
| US-002 | E2E-002, E2E-002a-c | 3 | 5/5 |
| US-003 | E2E-003, E2E-003a-c | 3 | 6/6 |
| US-004 | E2E-004, E2E-004a-c | 3 | 6/6 |
| US-005 | E2E-005, E2E-005a-b | 2 | 5/5 |
| US-006 | E2E-006, E2E-006a-b | 2 | 4/4 |
| US-007 | E2E-007, E2E-007a-b | 2 | 5/5 |
| US-008 | E2E-008, E2E-008a-c | 3 | 5/5 |
| US-009 | E2E-009, E2E-009a-b | 2 | 4/4 |
| US-010 | E2E-010, E2E-010a-b | 2 | 4/4 |
| US-011 | E2E-011, E2E-011a | 1 | 2/2 |
| US-012 | E2E-012, E2E-012a-c | 3 | 3/3 |
| US-013 | E2E-013, E2E-013a-b | 2 | 4/4 |
| US-014 | E2E-014, E2E-014a-b | 2 | 4/4 |
| US-015 | E2E-015, E2E-015a-b | 2 | 4/4 |
| US-016 | E2E-016, E2E-016a | 1 | 3/3 |
| US-017 | E2E-017, E2E-017a | 1 | 3/3 |
| US-018 | E2E-018, E2E-018a | 1 | 4/4 |
| US-019 | E2E-019, E2E-019a | 1 | 4/4 |
| US-020 | E2E-020, E2E-020a-b | 2 | 5/5 |
| US-021 | E2E-021, E2E-021a-b | 2 | 4/4 |
| US-022 | E2E-022, E2E-022a-b | 2 | 4/4 |
| US-023 | E2E-023, E2E-023a | 1 | 4/4 |
| US-024 | E2E-024, E2E-024a-b | 2 | 4/4 |
| US-025 | E2E-025, E2E-025a-b | 2 | 4/4 |
| US-026 | E2E-026, E2E-026a-b | 2 | 4/4 |
| US-027 | E2E-027, E2E-027a-b | 2 | 4/4 |
| US-028 | E2E-028, E2E-028a | 1 | 4/4 |
| US-029 | E2E-029, E2E-029a | 1 | 4/4 |
| US-030 | E2E-030, E2E-030a-b | 2 | 4/4 |

**Epic 1 Total:** 30 main tests + 60 edge cases

### Epic 2: Test Infrastructure

| User Story | E2E Tests | Edge Cases | Criteria Covered |
|------------|-----------|------------|------------------|
| US-031 | E2E-031, E2E-031a-b | 2 | 4/4 |
| US-032 | E2E-032, E2E-032a-b | 2 | 4/4 |
| US-033 | E2E-033, E2E-033a-b | 2 | 4/4 |
| US-034 | E2E-034, E2E-034a-c | 3 | 4/4 |
| US-035 | E2E-035, E2E-035a-b | 2 | 5/5 |
| US-036 | E2E-036, E2E-036a | 1 | 5/5 |
| US-037 | E2E-037, E2E-037a | 1 | 5/5 |
| US-038 | E2E-038, E2E-038a | 1 | 4/4 |
| US-039 | E2E-039, E2E-039a | 1 | 4/4 |
| US-040 | E2E-040, E2E-040a | 1 | 4/4 |
| US-041 | E2E-041, E2E-041a-b | 2 | 4/4 |
| US-042 | E2E-042, E2E-042a-b | 2 | 4/4 |
| US-043 | E2E-043, E2E-043a | 1 | 3/3 |
| US-044 | E2E-044, E2E-044a | 1 | 4/4 |
| US-045 | E2E-045, E2E-045a-b | 2 | 4/4 |
| US-046 | E2E-046, E2E-046a-b | 2 | 4/4 |
| US-047 | E2E-047, E2E-047a | 1 | 4/4 |
| US-048 | E2E-048, E2E-048a-b | 2 | 4/4 |
| US-049 | E2E-049, E2E-049a | 1 | 4/4 |
| US-050 | E2E-050, E2E-050a | 1 | 4/4 |
| US-051 | E2E-051, E2E-051a | 1 | 4/4 |
| US-052 | E2E-052, E2E-052a | 1 | 4/4 |
| US-053 | E2E-053, E2E-053a | 1 | 4/4 |
| US-054 | E2E-054, E2E-054a | 1 | 4/4 |
| US-055 | E2E-055, E2E-055a-b | 2 | 4/4 |
| US-056 | E2E-056, E2E-056a | 1 | 4/4 |
| US-057 | E2E-057, E2E-057a | 1 | 4/4 |
| US-058 | E2E-058, E2E-058a-b | 2 | 4/4 |
| US-059 | E2E-059, E2E-059a | 1 | 4/4 |
| US-060 | E2E-060, E2E-060a | 1 | 4/4 |
| US-061 | E2E-061, E2E-061a | 1 | 4/4 |
| US-062 | E2E-062, E2E-062a | 1 | 4/4 |
| US-063 | E2E-063, E2E-063a | 1 | 4/4 |
| US-064 | E2E-064, E2E-064a | 1 | 4/4 |
| US-065 | E2E-065, E2E-065a | 1 | 4/4 |
| US-066 | E2E-066, E2E-066a | 1 | 4/4 |
| US-067 | E2E-067, E2E-067a | 1 | 4/4 |
| US-068 | E2E-068, E2E-068a | 1 | 4/4 |
| US-069 | E2E-069, E2E-069a | 1 | 4/4 |
| US-070 | E2E-070, E2E-070a | 1 | 4/4 |

**Epic 2 Total:** 40 main tests + 54 edge cases

### Epic 3-8 Coverage Summary

| Epic | Stories | Main Tests | Edge Cases | All Criteria |
|------|---------|------------|------------|--------------|
| 3 | 47 | 47 | 94 | 100% |
| 4 | 34 | 34 | 68 | 100% |
| 5 | 29 | 29 | 58 | 100% |
| 6 | 22 | 22 | 44 | 100% |
| 7 | 36 | 36 | 72 | 100% |
| 8 | 48 | 48 | 96 | 100% |

**Grand Total:** 286 main tests + 572 edge case variants = 858 test scenarios

---

## Test Independence Matrix

### Epic 1: TUI Framework
- **Test file:** `tests/e2e/specs/epic1-tui-framework.test.ts`
- **Prerequisites:** None
- **Mock fixtures needed:** None (component tests only)
- **Can run alone:** Yes

### Epic 2: Test Infrastructure
- **Test file:** `tests/e2e/specs/epic2-test-infrastructure.test.ts`
- **Prerequisites:** None (tests the mocks themselves)
- **Mock fixtures needed:** Various test fixtures
- **Can run alone:** Yes

### Epic 3: State Management
- **Test file:** `tests/e2e/specs/epic3-state-management.test.ts`
- **Prerequisites:** TUI Framework (Epic 1) for rendering
- **Mock fixtures needed:** None (state tests)
- **Can run alone:** Yes (uses test harness with mock providers)

### Epic 4: Filesystem Service
- **Test file:** `tests/e2e/specs/epic4-filesystem-service.test.ts`
- **Prerequisites:** State Management (Epic 3) for stores
- **Mock fixtures needed:** Mock filesystem
- **Can run alone:** Yes (with mock filesystem injected)

### Epic 5: Process Service
- **Test file:** `tests/e2e/specs/epic5-process-service.test.ts`
- **Prerequisites:** State Management (Epic 3) for stores
- **Mock fixtures needed:** Mock Claude fixtures, Mock PTY
- **Can run alone:** Yes (with mock process spawner)

### Epic 6: Cost Service
- **Test file:** `tests/e2e/specs/epic6-cost-service.test.ts`
- **Prerequisites:** State Management (Epic 3) for stores
- **Mock fixtures needed:** Mock ccusage
- **Can run alone:** Yes (with mock ccusage)

### Epic 7: Pipeline Orchestrator
- **Test file:** `tests/e2e/specs/epic7-pipeline-orchestrator.test.ts`
- **Prerequisites:** All services (Epic 4, 5, 6)
- **Mock fixtures needed:** All phase/epic fixtures
- **Can run alone:** Yes (with all mock services injected)

### Epic 8: UI Screens
- **Test file:** `tests/e2e/specs/epic8-ui-screens.test.ts`
- **Prerequisites:** Orchestrator (Epic 7)
- **Mock fixtures needed:** All fixtures for full flow
- **Can run alone:** Yes (with full test harness)

### Independence Verification

All epics can run in isolation because:
1. **Dependency injection** - All services accept mock implementations
2. **Test harness** - Provides mock versions of all dependencies
3. **Fixture-based** - Mock Claude and other external deps use fixtures
4. **No shared state** - Each test gets fresh store instances

```bash
# Run any epic in isolation
npm run test:e2e -- --testPathPattern=epic1
npm run test:e2e -- --testPathPattern=epic5
npm run test:e2e -- --testPathPattern=epic8

# Run all epics
npm run test:e2e
```

---

## Test Setup Requirements

### Per-Epic Setup

```typescript
// tests/e2e/specs/epic[N]-*.test.ts

import { TestHarness } from '../helpers/test-harness';

describe('Epic N: Name', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.globalSetup();
  });

  afterAll(async () => {
    await harness.globalTeardown();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterEach(async () => {
    await harness.cleanup();
  });
});
```

### Fixture Loading

```typescript
// Load fixture before test
process.env.MOCK_CLAUDE_FIXTURE = path.join(
  __dirname,
  '../fixtures/phase-3-success.json'
);
```

### Mock Service Injection

```typescript
// Inject mock services
harness.injectServices({
  filesystem: new MockFilesystem(),
  process: new MockProcessService(),
  cost: new MockCostService()
});
```

---

## Running Tests

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run specific epic
npm run test:e2e -- --testPathPattern=epic1

# Run with coverage
npm run test:e2e -- --coverage

# Run in watch mode
npm run test:e2e -- --watch

# Update snapshots
npm run test:e2e -- --updateSnapshot

# Verbose output
npm run test:e2e -- --verbose
```

---

## Summary

- **Total User Stories:** 286
- **Total Main Tests:** 286
- **Total Edge Cases:** 572
- **Total Test Scenarios:** 858
- **Coverage:** 100% of acceptance criteria
- **Mock Fixtures:** 18 fixtures defined
- **Keyboard Shortcuts:** 25 shortcuts tested
- **All Epics Independent:** Yes
